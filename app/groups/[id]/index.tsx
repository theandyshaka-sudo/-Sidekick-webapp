import { useEffect, useMemo, useState } from "react";
import { Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Avatar } from "../../../src/components/Avatar";
import { ActionSheet, type ActionSheetOption } from "../../../src/components/ActionSheet";
import { PrimaryButton } from "../../../src/components/PrimaryButton";
import { useGroups } from "../../../src/context/GroupsContext";
import { useMessages } from "../../../src/context/MessagesContext";
import { useRolePalette } from "../../../src/theme/useRolePalette";
import { useThemeVars } from "../../../src/theme/useThemeVars";
import { formatShortDate, formatTime } from "../../../src/lib/datetime";
import { displayName, parseRules, roleName, serializeRules, type GroupAnnouncement, type GroupFaq, type GroupMember, type GroupMessage } from "../../../src/data/groupsMock";
import type { ReportReason } from "../../../src/data/messagesMock";

const REPORT_REASONS: Array<{ reason: ReportReason; label: string }> = [
  { reason: "harassment", label: "Harassment or bullying" },
  { reason: "spam", label: "Spam or scam" },
  { reason: "inappropriate", label: "Inappropriate content" },
  { reason: "safety", label: "Safety concern" },
  { reason: "other", label: "Something else" },
];

const MUTE_DURATIONS: Array<{ label: string; hours: number }> = [
  { label: "3 hours", hours: 3 },
  { label: "1 day", hours: 24 },
  { label: "1 week", hours: 168 },
  { label: "1 month", hours: 720 },
];

// 1 line to 5 lines, then the box stops growing and scrolls internally.
const COMPOSER_MIN_HEIGHT = 40;
const COMPOSER_MAX_HEIGHT = 120;

type Tab = "chat" | "announcements" | "faq" | "rules" | "members";

// Small themed bottom-sheet form, used for posting an announcement, asking/answering a FAQ.
function ComposeModal({ visible, title, children, onSubmit, onClose, submitLabel = "Post", disabled }: {
  visible: boolean;
  title: string;
  children: React.ReactNode;
  onSubmit: () => void;
  onClose: () => void;
  submitLabel?: string;
  disabled?: boolean;
}) {
  const palette = useRolePalette();
  const themeVars = useThemeVars();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 justify-center bg-black/50 px-6" style={themeVars}>
        <View className="rounded-3xl p-6" style={{ backgroundColor: palette.surface }}>
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="text-lg font-bold text-text">{title}</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={22} color={palette.muted} />
            </Pressable>
          </View>
          {children}
          <View className="mt-4">
            <PrimaryButton label={submitLabel} onPress={onSubmit} disabled={disabled} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

function ComposeInput({ value, onChangeText, placeholder, lines = 3 }: { value: string; onChangeText: (t: string) => void; placeholder: string; lines?: number }) {
  const palette = useRolePalette();
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={palette.muted}
      multiline
      numberOfLines={lines}
      style={{ color: palette.text, minHeight: lines * 22, textAlignVertical: "top" }}
      className="mb-3 rounded-2xl border border-border bg-bg px-4 py-3 text-base"
    />
  );
}

function formatMutedUntil(iso: string): string {
  return `${formatShortDate(iso)} at ${formatTime(new Date(iso))}`;
}

// A mute/kick/ban target — either picked from the Members list (viaMessageId undefined, general
// power required) or opened from a flagged message (viaMessageId set, lets a can_view_flagged-only
// role holder act on just that message's sender).
type ModerationTarget = { userId: string; name: string; realName?: string; viaMessageId?: string };

export default function GroupDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const palette = useRolePalette();
  const g = useGroups();
  const { ensureConversation, fileReport } = useMessages();

  const group = g.getGroup(id);

  useEffect(() => {
    g.refreshGroups();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const [tab, setTab] = useState<Tab>("chat");
  const [draft, setDraft] = useState("");
  const [composerHeight, setComposerHeight] = useState(COMPOSER_MIN_HEIGHT);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [sendingPhoto, setSendingPhoto] = useState(false);
  const [photoMenuOpen, setPhotoMenuOpen] = useState(false);
  const [msgMenu, setMsgMenu] = useState<GroupMessage | null>(null);
  const [memberMenu, setMemberMenu] = useState<GroupMember | null>(null);
  const [roleMenu, setRoleMenu] = useState<GroupMember | null>(null);
  const [muteTarget, setMuteTarget] = useState<ModerationTarget | null>(null);
  const [kickTarget, setKickTarget] = useState<ModerationTarget | null>(null);
  const [kickReason, setKickReason] = useState("");
  const [reportFor, setReportFor] = useState<{ name: string; kind: "member" | "message" } | null>(null);

  const [announceOpen, setAnnounceOpen] = useState(false);
  const [announceText, setAnnounceText] = useState("");
  const [announceMenu, setAnnounceMenu] = useState<GroupAnnouncement | null>(null);

  const [faqOpen, setFaqOpen] = useState(false);
  const [faqQuestion, setFaqQuestion] = useState("");
  const [faqMenu, setFaqMenu] = useState<GroupFaq | null>(null);
  const [answerFor, setAnswerFor] = useState<GroupFaq | null>(null);
  const [answerText, setAnswerText] = useState("");

  const [ruleModalOpen, setRuleModalOpen] = useState(false);
  const [ruleDraft, setRuleDraft] = useState("");
  const [editingRuleIndex, setEditingRuleIndex] = useState<number | null>(null);

  const msgMenuOptions = useMemo((): ActionSheetOption[] => {
    if (!msgMenu || !group) return [];
    const mine = msgMenu.senderId === g.me.userId;
    const isOwner = group.ownerId === g.me.userId;
    const canModerateFlagged = g.canModerateMessage(group, msgMenu);
    const canModerateGeneral = isOwner || g.hasRealPower(group, "canKick");
    const opts: ActionSheetOption[] = [];
    if (mine && !msgMenu.imageUrl && !msgMenu.flagged) opts.push({ label: "Edit message", icon: "create-outline", onPress: () => { setEditingId(msgMenu.id); setDraft(msgMenu.text); } });
    if (msgMenu.flagged && canModerateFlagged) opts.push({ label: "Dismiss flag", icon: "flag-outline", onPress: () => g.unflagMessage(group.id, msgMenu.id) });
    if (!mine) opts.push({ label: "Report message", icon: "flag-outline", destructive: true, onPress: () => setReportFor({ name: msgMenu.senderName, kind: "message" }) });
    if (!msgMenu.flagged) opts.push({ label: mine ? "Delete message" : "Delete (moderator)", icon: "trash-outline", destructive: true, onPress: () => g.deleteMessage(group.id, msgMenu.id) });
    if (msgMenu.flagged && canModerateFlagged) opts.push({ label: "Delete flagged message", icon: "trash-outline", destructive: true, onPress: () => g.deleteMessage(group.id, msgMenu.id) });
    if (msgMenu.flagged && (canModerateFlagged || canModerateGeneral) && !mine) {
      opts.push({ label: "Mute sender", icon: "volume-mute-outline", onPress: () => setMuteTarget({ userId: msgMenu.senderId, name: msgMenu.senderName, viaMessageId: msgMenu.id }) });
      opts.push({ label: "Kick sender", icon: "exit-outline", destructive: true, onPress: () => setKickTarget({ userId: msgMenu.senderId, name: msgMenu.senderName, viaMessageId: msgMenu.id }) });
      opts.push({ label: "Ban sender", icon: "ban-outline", destructive: true, onPress: () => g.banMember(group.id, msgMenu.senderId, undefined, msgMenu.id) });
    }
    return opts;
  }, [msgMenu, group]);

  const memberMenuOptions = useMemo((): ActionSheetOption[] => {
    if (!memberMenu || !group) return [];
    const opts: ActionSheetOption[] = [];
    const actionable = g.canActOn(group, memberMenu);
    const isOwner = group.ownerId === g.me.userId;
    const canModerateGeneral = isOwner || g.hasRealPower(group, "canKick");
    if (actionable && g.can(group, "assignRoles") && g.assignableRoles(group).length > 0)
      opts.push({ label: "Set role", icon: "shield-checkmark-outline", onPress: () => setRoleMenu(memberMenu) });
    if (actionable && canModerateGeneral)
      opts.push({ label: "Mute member", icon: "volume-mute-outline", onPress: () => setMuteTarget({ userId: memberMenu.userId, name: memberMenu.name, realName: memberMenu.realName }) });
    if (actionable && canModerateGeneral)
      opts.push({ label: "Kick from group", icon: "exit-outline", destructive: true, onPress: () => setKickTarget({ userId: memberMenu.userId, name: memberMenu.name, realName: memberMenu.realName }) });
    if (actionable && canModerateGeneral)
      opts.push({ label: "Ban from group", icon: "ban-outline", destructive: true, onPress: () => g.banMember(group.id, memberMenu.userId) });
    opts.push({ label: "Message", icon: "chatbubble-outline", onPress: async () => {
      const cid = await ensureConversation(memberMenu.name, memberMenu.avatarUri, `Group: ${group.name}`);
      router.push(`/chat/${cid}`);
    } });
    opts.push({ label: "Report to SideKick", icon: "flag-outline", destructive: true, onPress: () => setReportFor({ name: memberMenu.name, kind: "member" }) });
    return opts;
  }, [memberMenu, group]);

  const roleMenuOptions = useMemo((): ActionSheetOption[] => {
    if (!roleMenu || !group) return [];
    return g.assignableRoles(group).map((r) => ({
      label: r.name + (roleMenu.roleId === r.id ? " ✓" : ""),
      onPress: () => g.setMemberRoleUnified(group.id, roleMenu.userId, r.id),
    }));
  }, [roleMenu, group]);

  const muteMenuOptions = useMemo((): ActionSheetOption[] => {
    if (!muteTarget || !group) return [];
    return MUTE_DURATIONS.map((d) => ({ label: d.label, onPress: () => { g.muteMember(group.id, muteTarget.userId, d.hours, undefined, muteTarget.viaMessageId); setMuteTarget(null); } }));
  }, [muteTarget, group]);

  const confirmKick = () => {
    if (!kickTarget || !group) return;
    g.kickMember(group.id, kickTarget.userId, kickReason.trim() || undefined, kickTarget.viaMessageId);
    setKickTarget(null);
    setKickReason("");
  };

  const reportOptions: ActionSheetOption[] = reportFor && group
    ? REPORT_REASONS.map((r) => ({ label: r.label, onPress: () => fileReport({ reportedName: reportFor.name, reason: r.reason, context: `Group: ${group.name}` }) }))
    : [];

  const announceMenuOptions: ActionSheetOption[] = announceMenu && group
    ? [{ label: "Delete announcement", icon: "trash-outline", destructive: true, onPress: () => g.deleteAnnouncement(group.id, announceMenu.id) }]
    : [];

  const faqMenuOptions: ActionSheetOption[] = faqMenu && group
    ? [{ label: faqMenu.answer == null ? "Retract question" : "Delete entry", icon: "trash-outline", destructive: true, onPress: () => g.deleteFaq(group.id, faqMenu.id) }]
    : [];

  if (!group) {
    return (
      <View className="flex-1 items-center justify-center bg-bg">
        <Text className="text-sm text-muted">Group not found.</Text>
      </View>
    );
  }

  const member = g.isMember(group);
  const requested = g.hasRequested(group);
  const banned = g.isBanned(group);
  const staff = g.isStaff(group);
  const isOwner = group.ownerId === g.me.userId;
  const myMember = group.members.find((m) => m.userId === g.me.userId);
  const canAnswerFaqs = g.hasRealPower(group, "canAnswerFaq");
  const mutedUntil = myMember?.mutedUntil;
  const isMuted = !!mutedUntil && new Date(mutedUntil).getTime() > Date.now();
  const faqPendingCount = group.faqs.filter((f) => f.answer == null).length;
  const pendingDot = staff && g.can(group, "acceptRequests") && group.requests.length > 0;

  const send = () => {
    if (!draft.trim()) return;
    if (editingId) { g.editMessage(group.id, editingId, draft.trim()); setEditingId(null); }
    else g.sendMessage(group.id, draft.trim());
    setDraft("");
    setComposerHeight(COMPOSER_MIN_HEIGHT);
  };

  const sendPhoto = async (source: "camera" | "library") => {
    setSendingPhoto(true);
    await g.sendPhoto(group.id, source);
    setSendingPhoto(false);
  };

  const postAnnouncement = () => {
    if (!announceText.trim()) return;
    g.postAnnouncement(group.id, announceText.trim());
    setAnnounceText("");
    setAnnounceOpen(false);
  };

  const askFaq = () => {
    if (!faqQuestion.trim()) return;
    g.askFaq(group.id, faqQuestion.trim());
    setFaqQuestion("");
    setFaqOpen(false);
  };

  const submitAnswer = () => {
    if (!answerFor || !answerText.trim()) return;
    g.answerFaq(group.id, answerFor.id, answerText.trim());
    setAnswerFor(null);
    setAnswerText("");
  };

  const ruleItems = parseRules(group.rules);
  const saveRules = (items: string[]) => g.updateGroup(group.id, { rules: serializeRules(items) });
  const addRule = () => {
    if (!ruleDraft.trim()) return;
    saveRules([...ruleItems, ruleDraft.trim()]);
    setRuleDraft("");
    setRuleModalOpen(false);
  };
  const saveEditedRule = () => {
    if (editingRuleIndex == null || !ruleDraft.trim()) return;
    saveRules(ruleItems.map((r, i) => (i === editingRuleIndex ? ruleDraft.trim() : r)));
    setEditingRuleIndex(null);
    setRuleDraft("");
  };
  const deleteRule = (index: number) => saveRules(ruleItems.filter((_, i) => i !== index));

  const TABS: Array<{ key: Tab; label: string }> = [
    { key: "chat", label: "Chat" },
    { key: "announcements", label: "Announcements" },
    { key: "rules", label: "Rules" },
    { key: "faq", label: "FAQ" },
    { key: "members", label: "Members" },
  ];

  return (
    <KeyboardAvoidingView className="flex-1 bg-bg" behavior={Platform.OS === "ios" ? "padding" : undefined}>
      {/* Header */}
      <View className="flex-row items-center gap-3 border-b border-border bg-bg px-4 pb-3" style={{ paddingTop: insets.top + 12 }}>
        <Pressable onPress={() => router.back()} hitSlop={8} className="h-9 w-9 items-center justify-center rounded-full border border-border bg-surface active:opacity-70">
          <Ionicons name="chevron-back" size={18} color={palette.text} />
        </Pressable>
        <Avatar uri={group.avatarUri} name={group.name} size={38} />
        <View className="flex-1">
          <View className="flex-row items-center gap-1.5">
            <Text className="text-base font-bold text-text" numberOfLines={1}>{group.name}</Text>
            {group.isPrivate ? <Ionicons name="lock-closed" size={12} color={palette.muted} /> : null}
          </View>
          <Text className="text-xs text-muted">{group.members.length} member{group.members.length === 1 ? "" : "s"}</Text>
        </View>
        {member ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Group settings" onPress={() => router.push(`/groups/${group.id}/settings`)} hitSlop={8} className="h-9 w-9 items-center justify-center rounded-full border border-border bg-surface active:opacity-70">
            <Ionicons name="settings-outline" size={16} color={palette.text} />
            {pendingDot ? <View className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full" style={{ backgroundColor: palette.danger }} /> : null}
          </Pressable>
        ) : null}
      </View>

      {/* Tabs — a compact row of boxes spanning the full width, sized to actually be readable. */}
      <View className="flex-row gap-1.5 border-b border-border bg-bg px-2.5 py-2">
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <Pressable
              key={t.key}
              onPress={() => setTab(t.key)}
              className="flex-1 items-center justify-center rounded-xl px-1 py-3"
              style={{ backgroundColor: active ? palette.primary : palette.surface, borderWidth: active ? 0 : 1.5, borderColor: palette.border }}
            >
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.8}
                className="text-xs font-bold"
                style={{ color: active ? palette.primaryFg : palette.text }}
              >
                {t.label}
              </Text>
              {t.key === "faq" && faqPendingCount > 0 ? (
                <View className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2" style={{ backgroundColor: palette.danger, borderColor: palette.bg }} />
              ) : null}
            </Pressable>
          );
        })}
      </View>

      {tab === "chat" ? (
        member ? (
          <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, gap: 8 }} showsVerticalScrollIndicator={false}>
            <View className="mb-2 items-center">
              <Text className="rounded-full bg-surface px-3 py-1 text-xs text-muted">{group.description || "Welcome to the group"}</Text>
            </View>
            {group.messages.map((m) => {
              if (m.deleted) {
                return (
                  <View key={m.id} className={m.senderId === g.me.userId ? "self-end" : "self-start"}>
                    <Text className="px-2 py-1 text-xs italic text-muted">{m.senderId === g.me.userId ? "You" : m.senderName} deleted a message</Text>
                  </View>
                );
              }
              const mine = m.senderId === g.me.userId;
              const hidden = !!m.flagged && !g.canSeeFlagged(group, m);
              if (hidden) {
                return (
                  <View key={m.id} className={mine ? "self-end" : "self-start"}>
                    <Text className="px-2 py-1 text-xs italic text-muted">Message hidden — under review</Text>
                  </View>
                );
              }
              const canOpen = mine || g.can(group, "deleteMessages") || g.canModerateMessage(group, m);
              return (
                <Pressable
                  key={m.id}
                  disabled={!canOpen}
                  onLongPress={() => canOpen && setMsgMenu(m)}
                  onPress={() => canOpen && setMsgMenu(m)}
                  className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 ${mine ? "self-end bg-primary" : "self-start border border-border bg-surface"}`}
                >
                  {!mine ? <Text className="mb-0.5 text-[11px] font-semibold" style={{ color: palette.primary }}>{m.senderName}</Text> : null}
                  {m.flagged ? (
                    <View className="mb-1 flex-row items-center gap-1">
                      <Ionicons name="flag" size={10} color={mine ? palette.primaryFg : palette.danger} />
                      <Text className={`text-[10px] font-semibold ${mine ? "text-primary-fg/80" : ""}`} style={mine ? undefined : { color: palette.danger }}>
                        Flagged — only you and staff can see this
                      </Text>
                    </View>
                  ) : null}
                  {m.imageUrl ? (
                    <Image source={{ uri: m.imageUrl }} style={{ width: 200, height: 200, borderRadius: 12 }} resizeMode="cover" />
                  ) : null}
                  {m.text ? <Text className={`text-base ${mine ? "text-primary-fg" : "text-text"}`}>{m.text}</Text> : null}
                  <View className="mt-1 flex-row items-center gap-1">
                    <Text className={`text-[10px] ${mine ? "text-primary-fg/70" : "text-muted"}`}>{m.time}</Text>
                    {m.edited ? <Text className={`text-[10px] ${mine ? "text-primary-fg/70" : "text-muted"}`}>· edited</Text> : null}
                  </View>
                </Pressable>
              );
            })}
            {group.messages.length === 0 ? <Text className="mt-6 text-center text-sm text-muted">No messages yet — say hi!</Text> : null}
          </ScrollView>
        ) : (
          <View className="flex-1 items-center justify-center px-10">
            <Ionicons name={group.isPrivate ? "lock-closed-outline" : "chatbubbles-outline"} size={34} color={palette.muted} />
            <Text className="mt-3 text-center text-sm text-muted">
              {banned ? "You've been banned from this group." : group.isPrivate ? "This is a private group. Request to join to see the conversation." : "Join this group to see the conversation and chat."}
            </Text>
          </View>
        )
      ) : null}

      {tab === "announcements" ? (
        member ? (
          <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, gap: 10 }} showsVerticalScrollIndicator={false}>
            {isOwner ? (
              <Pressable onPress={() => setAnnounceOpen(true)} className="flex-row items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-primary py-3 active:opacity-70">
                <Ionicons name="megaphone-outline" size={16} color={palette.primary} />
                <Text className="text-sm font-semibold" style={{ color: palette.primary }}>Post an announcement</Text>
              </Pressable>
            ) : null}
            {group.announcements.map((a) => (
              <Pressable
                key={a.id}
                disabled={!isOwner}
                onLongPress={() => isOwner && setAnnounceMenu(a)}
                className="rounded-2xl border border-border bg-surface p-4"
              >
                <View className="mb-1 flex-row items-center gap-1.5">
                  <Ionicons name="megaphone" size={13} color={palette.primary} />
                  <Text className="text-xs font-semibold" style={{ color: palette.primary }}>{a.authorName}</Text>
                  <Text className="text-xs text-muted">· {a.createdAt}</Text>
                </View>
                <Text className="text-sm leading-6 text-text">{a.text}</Text>
              </Pressable>
            ))}
            {group.announcements.length === 0 ? <Text className="mt-6 text-center text-sm text-muted">No announcements yet.</Text> : null}
          </ScrollView>
        ) : (
          <View className="flex-1 items-center justify-center px-10">
            <Ionicons name="megaphone-outline" size={34} color={palette.muted} />
            <Text className="mt-3 text-center text-sm text-muted">Join this group to see announcements.</Text>
          </View>
        )
      ) : null}

      {tab === "faq" ? (
        member ? (
          <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, gap: 10 }} showsVerticalScrollIndicator={false}>
            <Pressable onPress={() => setFaqOpen(true)} className="flex-row items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-primary py-3 active:opacity-70">
              <Ionicons name="help-circle-outline" size={16} color={palette.primary} />
              <Text className="text-sm font-semibold" style={{ color: palette.primary }}>Ask a question</Text>
            </Pressable>
            {group.faqs.map((f) => {
              const pending = f.answer == null;
              const canDelete = isOwner || f.authorId === g.me.userId || canAnswerFaqs;
              if (pending) {
                return (
                  <View key={f.id} className="rounded-2xl border border-dashed border-border bg-surface p-4" style={{ opacity: 0.65 }}>
                    <View className="mb-1 flex-row items-center justify-between">
                      <View className="flex-1 flex-row items-center gap-1.5">
                        {f.flagged ? <Ionicons name="flag" size={11} color={palette.danger} /> : null}
                        <Text className="text-[10px] font-bold uppercase tracking-wider" style={{ color: palette.muted }}>Awaiting response</Text>
                      </View>
                      {canDelete ? (
                        <Pressable onPress={() => setFaqMenu(f)} hitSlop={8}>
                          <Ionicons name="trash-outline" size={16} color={palette.danger} />
                        </Pressable>
                      ) : null}
                    </View>
                    <Text className="text-sm font-bold text-text">{f.question}</Text>
                    <Text className="mt-2 text-[11px] text-muted">{f.authorName} · {f.createdAt}</Text>
                    {canAnswerFaqs ? (
                      <Pressable
                        onPress={() => { setAnswerFor(f); setAnswerText(""); }}
                        className="mt-3 flex-row items-center justify-center gap-1.5 rounded-xl border border-primary py-2 active:opacity-70"
                      >
                        <Ionicons name="chatbox-ellipses-outline" size={13} color={palette.primary} />
                        <Text className="text-xs font-semibold" style={{ color: palette.primary }}>Answer</Text>
                      </Pressable>
                    ) : null}
                  </View>
                );
              }
              return (
                <View key={f.id} className="rounded-2xl border border-border bg-surface p-4">
                  <View className="mb-1 flex-row items-start justify-between gap-2">
                    <Text className="flex-1 text-sm font-bold text-text">{f.question}</Text>
                    {canDelete ? (
                      <Pressable onPress={() => setFaqMenu(f)} hitSlop={8}>
                        <Ionicons name="trash-outline" size={16} color={palette.danger} />
                      </Pressable>
                    ) : null}
                  </View>
                  <Text className="text-sm leading-6 text-muted">{f.answer}</Text>
                  <Text className="mt-2 text-[11px] text-muted">Answered by {f.answeredByName ?? "a member"} · {f.answeredAt}</Text>
                </View>
              );
            })}
            {group.faqs.length === 0 ? <Text className="mt-6 text-center text-sm text-muted">No common questions yet — ask the first one.</Text> : null}
          </ScrollView>
        ) : (
          <View className="flex-1 items-center justify-center px-10">
            <Ionicons name="help-circle-outline" size={34} color={palette.muted} />
            <Text className="mt-3 text-center text-sm text-muted">Join this group to see common questions.</Text>
          </View>
        )
      ) : null}

      {tab === "rules" ? (
        <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, gap: 8 }} showsVerticalScrollIndicator={false}>
          {isOwner ? (
            <Pressable onPress={() => { setEditingRuleIndex(null); setRuleDraft(""); setRuleModalOpen(true); }} className="mb-1 flex-row items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-primary py-3 active:opacity-70">
              <Ionicons name="add-circle-outline" size={16} color={palette.primary} />
              <Text className="text-sm font-semibold" style={{ color: palette.primary }}>Add a rule</Text>
            </Pressable>
          ) : null}
          <View className="rounded-2xl border border-border bg-surface p-2">
            {ruleItems.length === 0 ? (
              <Text className="p-3 text-sm text-muted">{isOwner ? "No rules set yet — tap Add a rule to add some." : "This group hasn't posted any rules yet."}</Text>
            ) : (
              ruleItems.map((item, i) => (
                <View key={i} className="flex-row items-start gap-2.5 border-b border-border px-2 py-3 last:border-b-0">
                  <Text className="mt-0.5 text-sm font-bold" style={{ color: palette.primary }}>{i + 1}.</Text>
                  <Text className="flex-1 text-sm leading-6 text-text">{item}</Text>
                  {isOwner ? (
                    <View className="flex-row items-center gap-3">
                      <Pressable onPress={() => { setEditingRuleIndex(i); setRuleDraft(item); }} hitSlop={8}>
                        <Ionicons name="create-outline" size={16} color={palette.muted} />
                      </Pressable>
                      <Pressable onPress={() => deleteRule(i)} hitSlop={8}>
                        <Ionicons name="trash-outline" size={16} color={palette.danger} />
                      </Pressable>
                    </View>
                  ) : null}
                </View>
              ))
            )}
          </View>
        </ScrollView>
      ) : null}

      {tab === "members" ? (
        <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, gap: 8 }} showsVerticalScrollIndicator={false}>
          {g.sortedMembers(group).map((mem) => {
            const isMe = mem.userId === g.me.userId;
            const tappable = !isMe;
            return (
              <Pressable
                key={mem.userId}
                disabled={!tappable}
                onPress={() => setMemberMenu(mem)}
                className="flex-row items-center gap-3 rounded-2xl border border-border bg-surface p-3 active:opacity-80"
              >
                <Avatar uri={mem.avatarUri} name={mem.name} size={40} />
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-text">{mem.name}{isMe ? " (you)" : ""}</Text>
                  <Text className="text-xs text-muted">Joined {mem.joinedAt}</Text>
                </View>
                <View className="rounded-full px-2.5 py-1" style={{ backgroundColor: mem.roleId === "president" ? palette.primary : palette.primarySoft }}>
                  <Text className="text-[10px] font-bold" style={{ color: mem.roleId === "president" ? palette.primaryFg : palette.primary }}>{roleName(group, mem.roleId)}</Text>
                </View>
                {tappable ? <Ionicons name="ellipsis-vertical" size={14} color={palette.muted} /> : null}
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}

      {/* Bottom bar */}
      {member ? (
        tab === "chat" ? (
          isMuted && mutedUntil ? (
            <View className="flex-row items-center justify-center gap-2 border-t border-border bg-surface px-4" style={{ paddingBottom: insets.bottom + 14, paddingTop: 14 }}>
              <Ionicons name="mic-off" size={14} color={palette.danger} />
              <Text className="text-sm text-muted">You're muted until {formatMutedUntil(mutedUntil)}</Text>
            </View>
          ) : (
            <View className="border-t border-border bg-bg px-4 pt-3" style={{ paddingBottom: insets.bottom + 12 }}>
              {editingId ? (
                <View className="mb-1 flex-row items-center justify-between">
                  <View className="flex-row items-center gap-1.5"><Ionicons name="create-outline" size={12} color={palette.primary} /><Text className="text-xs" style={{ color: palette.primary }}>Editing message</Text></View>
                  <Pressable onPress={() => { setEditingId(null); setDraft(""); setComposerHeight(COMPOSER_MIN_HEIGHT); }} hitSlop={6}><Text className="text-xs text-muted">Cancel</Text></Pressable>
                </View>
              ) : null}
              <View className="flex-row items-end gap-2">
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Send a photo"
                  onPress={() => setPhotoMenuOpen(true)}
                  disabled={sendingPhoto || !!editingId}
                  className="h-11 w-11 items-center justify-center rounded-full border border-border bg-surface active:opacity-70"
                  style={{ opacity: sendingPhoto || editingId ? 0.5 : 1 }}
                >
                  <Ionicons name="camera-outline" size={19} color={palette.text} />
                </Pressable>
                <TextInput
                  value={draft}
                  onChangeText={setDraft}
                  placeholder={`Message ${group.name}`}
                  placeholderTextColor={palette.muted}
                  multiline
                  onContentSizeChange={(e) =>
                    setComposerHeight(Math.min(COMPOSER_MAX_HEIGHT, Math.max(COMPOSER_MIN_HEIGHT, e.nativeEvent.contentSize.height)))
                  }
                  style={{ height: composerHeight, color: palette.text, textAlignVertical: "top" }}
                  className="flex-1 rounded-2xl border border-border bg-surface px-4 py-2.5 text-base"
                />
                <Pressable accessibilityRole="button" accessibilityLabel="Send message" onPress={send} disabled={!draft.trim()} className="h-11 w-11 items-center justify-center rounded-full bg-primary active:opacity-80" style={{ opacity: draft.trim() ? 1 : 0.5 }}>
                  <Ionicons name={editingId ? "checkmark" : "arrow-up"} size={20} color={palette.primaryFg} />
                </Pressable>
              </View>
            </View>
          )
        ) : null
      ) : (
        <View className="border-t border-border bg-bg px-4 pt-3" style={{ paddingBottom: insets.bottom + 12 }}>
          {banned ? (
            <View className="items-center rounded-2xl border border-border py-3.5">
              <Text className="text-base font-semibold text-muted">You're banned from this group</Text>
            </View>
          ) : requested ? (
            <Pressable onPress={() => g.cancelRequest(group.id)} className="items-center rounded-2xl border-2 border-primary py-3.5 active:opacity-80">
              <Text className="text-base font-semibold text-primary">Request sent · tap to cancel</Text>
            </Pressable>
          ) : g.atJoinLimit ? (
            <Pressable onPress={() => router.push("/plans")} className="flex-row items-center justify-center gap-2 rounded-2xl border-2 border-primary py-3.5 active:opacity-80">
              <Ionicons name="ribbon-outline" size={16} color={palette.primary} />
              <Text className="text-base font-semibold text-primary">Upgrade your plan to join</Text>
            </Pressable>
          ) : (
            <Pressable onPress={() => (group.isPrivate ? g.requestJoin(group.id) : g.joinGroup(group.id))} className="items-center rounded-2xl bg-primary py-3.5 active:opacity-80">
              <Text className="text-base font-semibold" style={{ color: palette.primaryFg }}>{group.isPrivate ? "Request to join" : "Join group"}</Text>
            </Pressable>
          )}
        </View>
      )}

      <ActionSheet
        visible={photoMenuOpen}
        title="Send a photo"
        options={[
          { label: "Take photo", icon: "camera-outline", onPress: () => sendPhoto("camera") },
          { label: "Choose from library", icon: "image-outline", onPress: () => sendPhoto("library") },
        ]}
        onClose={() => setPhotoMenuOpen(false)}
      />
      <ActionSheet visible={msgMenu != null} options={msgMenuOptions} onClose={() => setMsgMenu(null)} />
      <ActionSheet visible={memberMenu != null} title={memberMenu?.name} options={memberMenuOptions} onClose={() => setMemberMenu(null)} />
      <ActionSheet visible={roleMenu != null} title={`Set ${roleMenu?.name}'s role`} options={roleMenuOptions} onClose={() => setRoleMenu(null)} />
      <ActionSheet visible={muteTarget != null} title={muteTarget ? `Mute ${muteTarget.name} for…` : ""} options={muteMenuOptions} onClose={() => setMuteTarget(null)} />
      <ActionSheet visible={reportFor != null} title={`Report ${reportFor?.name} for…`} options={reportOptions} onClose={() => setReportFor(null)} />
      <ActionSheet visible={announceMenu != null} options={announceMenuOptions} onClose={() => setAnnounceMenu(null)} />
      <ActionSheet visible={faqMenu != null} options={faqMenuOptions} onClose={() => setFaqMenu(null)} />

      <ComposeModal visible={announceOpen} title="Post an announcement" onSubmit={postAnnouncement} onClose={() => setAnnounceOpen(false)} disabled={!announceText.trim()}>
        <ComposeInput value={announceText} onChangeText={setAnnounceText} placeholder="What's the announcement?" lines={4} />
      </ComposeModal>

      <ComposeModal visible={faqOpen} title="Ask a question" onSubmit={askFaq} onClose={() => setFaqOpen(false)} disabled={!faqQuestion.trim()}>
        <ComposeInput value={faqQuestion} onChangeText={setFaqQuestion} placeholder="e.g. What's the best brand to use?" lines={3} />
      </ComposeModal>

      <ComposeModal visible={answerFor != null} title="Answer this question" submitLabel="Post answer" onSubmit={submitAnswer} onClose={() => setAnswerFor(null)} disabled={!answerText.trim()}>
        {answerFor ? <Text className="mb-2 text-sm font-semibold text-text">{answerFor.question}</Text> : null}
        <ComposeInput value={answerText} onChangeText={setAnswerText} placeholder="Your answer" lines={3} />
      </ComposeModal>

      <ComposeModal
        visible={ruleModalOpen || editingRuleIndex != null}
        title={editingRuleIndex != null ? "Edit rule" : "Add a rule"}
        submitLabel={editingRuleIndex != null ? "Save" : "Add"}
        onSubmit={editingRuleIndex != null ? saveEditedRule : addRule}
        onClose={() => { setRuleModalOpen(false); setEditingRuleIndex(null); setRuleDraft(""); }}
        disabled={!ruleDraft.trim()}
      >
        <ComposeInput value={ruleDraft} onChangeText={setRuleDraft} placeholder="e.g. Be kind to all" lines={2} />
      </ComposeModal>

      <ComposeModal
        visible={kickTarget != null}
        title={kickTarget ? `Kick ${kickTarget.name}?` : ""}
        submitLabel="Kick"
        onSubmit={confirmKick}
        onClose={() => { setKickTarget(null); setKickReason(""); }}
      >
        <Text className="mb-2 text-xs text-muted">Optional — they'll be able to see this reason.</Text>
        <ComposeInput value={kickReason} onChangeText={setKickReason} placeholder="Reason (optional)" lines={2} />
      </ComposeModal>
    </KeyboardAvoidingView>
  );
}
