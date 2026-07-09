import { useEffect, useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Avatar } from "../components/Avatar";
import { ActionSheet, type ActionSheetOption } from "../components/ActionSheet";
import { OfferForm } from "../components/OfferForm";
import { OfferCard } from "../components/OfferCard";
import { useMessages } from "../context/MessagesContext";
import { useJobs } from "../context/JobsContext";
import { useAppState } from "../context/AppStateContext";
import { useWorkerData } from "../context/WorkerDataContext";
import { useClientData } from "../context/ClientDataContext";
import { useRolePalette } from "../theme/useRolePalette";
import type { ChatMessage, ReportReason } from "../data/messagesMock";

const REPORT_REASONS: Array<{ reason: ReportReason; label: string }> = [
  { reason: "harassment", label: "Harassment or bullying" },
  { reason: "spam", label: "Spam or scam" },
  { reason: "inappropriate", label: "Inappropriate content" },
  { reason: "safety", label: "Safety concern" },
  { reason: "other", label: "Something else" },
];

export function ChatThread() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const palette = useRolePalette();
  const {
    getConversation,
    sendMessage,
    editMessage,
    deleteMessage,
    sendOffer,
    setOfferStatus,
    reportConversation,
    setBlocked,
    banStatus,
    markConversationRead,
  } = useMessages();
  const { scheduleFromOffer } = useJobs();
  const { role } = useAppState();
  const { verification } = useWorkerData();
  const { verification: clientVerification } = useClientData();
  // A worker must be age-verified before sending or accepting job offers (scheduling).
  const canSchedule = role !== "worker" || verification.status === "verified";
  // A client must verify their identity before messaging at all (HANDOFF §5).
  const clientUnverified = role === "client" && clientVerification.status !== "verified";

  // Opening a chat clears its unread badge.
  useEffect(() => {
    if (id) markConversationRead(id);
  }, [id]);

  const [draft, setDraft] = useState("");
  const [redactedNotice, setRedactedNotice] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [menuFor, setMenuFor] = useState<ChatMessage | null>(null);
  const [headerMenu, setHeaderMenu] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [offerOpen, setOfferOpen] = useState(false);
  const [inputHeight, setInputHeight] = useState(40);

  const conversation = getConversation(id);
  const messages = conversation?.messages ?? [];
  const reported = conversation?.reported ?? false;
  const blocked = conversation?.blocked ?? false;

  const send = () => {
    if (!draft.trim() || !conversation) return;
    if (editingId) {
      const { redacted } = editMessage(conversation.id, editingId, draft.trim());
      setRedactedNotice(redacted);
      setEditingId(null);
    } else {
      const { redacted } = sendMessage(conversation.id, draft.trim());
      setRedactedNotice(redacted);
    }
    setDraft("");
    setInputHeight(40);
  };

  const messageMenuOptions = useMemo((): ActionSheetOption[] => {
    if (!menuFor || !conversation) return [];
    return [
      {
        label: "Edit message",
        icon: "create-outline",
        onPress: () => {
          setEditingId(menuFor.id);
          setDraft(menuFor.text ?? "");
        },
      },
      {
        label: "Delete message",
        icon: "trash-outline",
        destructive: true,
        onPress: () => deleteMessage(conversation.id, menuFor.id),
      },
    ];
  }, [menuFor, conversation]);

  const headerMenuOptions: ActionSheetOption[] = conversation
    ? [
        { label: "Report conversation", icon: "flag-outline", onPress: () => setReportOpen(true) },
        {
          label: blocked ? `Unblock ${conversation.counterpartName}` : `Block ${conversation.counterpartName}`,
          icon: blocked ? "person-add-outline" : "ban-outline",
          destructive: !blocked,
          onPress: () => setBlocked(conversation.id, !blocked),
        },
      ]
    : [];

  const reportOptions: ActionSheetOption[] = conversation
    ? REPORT_REASONS.map((r) => ({
        label: r.label,
        onPress: () => reportConversation(conversation.id, r.reason),
      }))
    : [];

  if (!conversation) {
    return (
      <View className="flex-1 items-center justify-center bg-bg">
        <Text className="text-sm text-muted">Conversation not found.</Text>
      </View>
    );
  }

  const ban = banStatus(conversation.counterpartName);
  const composerDisabled = blocked || ban.banned;

  return (
    <KeyboardAvoidingView className="flex-1 bg-bg" behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View className="flex-row items-center gap-3 border-b border-border bg-bg px-4 pb-3" style={{ paddingTop: insets.top + 12 }}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          className="h-9 w-9 items-center justify-center rounded-full border border-border bg-surface active:opacity-70"
        >
          <Ionicons name="chevron-back" size={18} color={palette.text} />
        </Pressable>
        <Avatar uri={conversation.counterpartAvatar} name={conversation.counterpartName} size={38} />
        <View className="flex-1">
          <Text className="text-base font-bold text-text" numberOfLines={1}>{conversation.counterpartName}</Text>
          <View className="flex-row items-center gap-1">
            <Ionicons name="star" size={11} color={palette.primary} />
            <Text className="text-xs text-muted">{conversation.counterpartRating.toFixed(1)}</Text>
          </View>
        </View>
        <Pressable
          onPress={() => setHeaderMenu(true)}
          hitSlop={8}
          className="h-9 w-9 items-center justify-center rounded-full border border-border bg-surface active:opacity-70"
        >
          <Ionicons name={reported || blocked ? "flag" : "ellipsis-horizontal"} size={16} color={reported || blocked ? palette.danger : palette.text} />
        </Pressable>
      </View>

      {reported ? (
        <View className="flex-row items-center gap-2 bg-danger/10 px-4 py-2">
          <Ionicons name="flag" size={14} color={palette.danger} />
          <Text className="text-xs" style={{ color: palette.danger }}>You reported this conversation. Our team is reviewing it.</Text>
        </View>
      ) : null}

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, gap: 8 }} showsVerticalScrollIndicator={false}>
        <View className="mb-2 items-center">
          <Text className="rounded-full bg-surface px-3 py-1 text-xs text-muted">{conversation.jobContext}</Text>
        </View>

        {messages.map((message) => {
          if (message.deleted) {
            return (
              <View key={message.id} className={message.fromMe ? "self-end" : "self-start"}>
                <Text className="px-2 py-1 text-xs italic text-muted">
                  {message.fromMe ? "You" : conversation.counterpartName} deleted a message
                </Text>
              </View>
            );
          }

          if (message.kind === "offer" && message.offer) {
            return (
              <OfferCard
                key={message.id}
                offer={message.offer}
                fromMe={message.fromMe}
                onAccept={() => {
                  if (!canSchedule) {
                    router.push("/settings/worker-verify");
                    return;
                  }
                  setOfferStatus(conversation.id, message.id, "accepted");
                  scheduleFromOffer({
                    service: message.offer!.service,
                    counterpartName: conversation.counterpartName,
                    counterpartAvatar: conversation.counterpartAvatar,
                    price: message.offer!.price,
                    priceType: message.offer!.priceType,
                    scheduledAt: message.offer!.scheduledAt,
                  });
                }}
                onDecline={() => setOfferStatus(conversation.id, message.id, "declined")}
              />
            );
          }

          return (
            <Pressable
              key={message.id}
              disabled={!message.fromMe}
              onLongPress={() => message.fromMe && setMenuFor(message)}
              onPress={() => message.fromMe && setMenuFor(message)}
              className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                message.fromMe ? "self-end bg-primary" : "self-start border border-border bg-surface"
              }`}
            >
              <Text className={message.fromMe ? "text-primary-fg" : "text-text"}>{message.text}</Text>
              <View className="mt-1 flex-row items-center gap-1">
                <Text className={`text-[10px] ${message.fromMe ? "text-primary-fg/70" : "text-muted"}`}>{message.time}</Text>
                {message.edited ? (
                  <Text className={`text-[10px] ${message.fromMe ? "text-primary-fg/70" : "text-muted"}`}>· edited</Text>
                ) : null}
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      {redactedNotice ? (
        <View className="flex-row items-center gap-2 px-4 pb-1">
          <Ionicons name="lock-closed" size={12} color={palette.muted} />
          <Text className="text-xs text-muted">Contact info was hidden. Keep chats and payments on SideKick.</Text>
        </View>
      ) : null}

      {editingId ? (
        <View className="flex-row items-center justify-between px-4 pb-1">
          <View className="flex-row items-center gap-1.5">
            <Ionicons name="create-outline" size={12} color={palette.primary} />
            <Text className="text-xs" style={{ color: palette.primary }}>Editing message</Text>
          </View>
          <Pressable onPress={() => { setEditingId(null); setDraft(""); }} hitSlop={6}>
            <Text className="text-xs text-muted">Cancel</Text>
          </Pressable>
        </View>
      ) : null}

      {clientUnverified ? (
        <Pressable
          onPress={() => router.push("/onboarding/verify")}
          className="flex-row items-center gap-2 border-t border-border bg-surface px-4 active:opacity-80"
          style={{ paddingBottom: insets.bottom + 14, paddingTop: 14 }}
        >
          <Ionicons name="lock-closed" size={15} color={palette.primary} />
          <Text className="flex-1 text-sm text-text">Verify your identity to message</Text>
          <Ionicons name="chevron-forward" size={16} color={palette.muted} />
        </Pressable>
      ) : composerDisabled ? (
        <View className="flex-row items-center justify-center gap-2 border-t border-border bg-surface px-4" style={{ paddingBottom: insets.bottom + 14, paddingTop: 14 }}>
          <Ionicons name="ban" size={14} color={palette.danger} />
          <Text className="text-sm text-muted">
            {blocked
              ? `You blocked ${conversation.counterpartName} — unblock to message.`
              : ban.label === "Permanent"
                ? `${conversation.counterpartName} is permanently banned from messaging.`
                : `${conversation.counterpartName} is banned from messaging (${ban.label}).`}
          </Text>
        </View>
      ) : (
        <View className="flex-row items-end gap-2 border-t border-border bg-bg px-4 pt-3" style={{ paddingBottom: insets.bottom + 12 }}>
          <Pressable
            onPress={() => (canSchedule ? setOfferOpen(true) : router.push("/settings/worker-verify"))}
            className="h-11 w-11 items-center justify-center rounded-full border border-border active:opacity-70"
          >
            <Ionicons name={canSchedule ? "add" : "lock-closed"} size={canSchedule ? 22 : 18} color={palette.primary} />
          </Pressable>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Message"
            placeholderTextColor={palette.muted}
            multiline
            onContentSizeChange={(e) =>
              setInputHeight(Math.min(120, Math.max(40, e.nativeEvent.contentSize.height)))
            }
            style={{ height: inputHeight, color: palette.text }}
            className="flex-1 rounded-2xl border border-border bg-surface px-4 py-2 text-base"
          />
          <Pressable
            onPress={send}
            disabled={!draft.trim()}
            className="h-11 w-11 items-center justify-center rounded-full bg-primary active:opacity-80"
            style={{ opacity: draft.trim() ? 1 : 0.5 }}
          >
            <Ionicons name={editingId ? "checkmark" : "arrow-up"} size={20} color={palette.primaryFg} />
          </Pressable>
        </View>
      )}

      <ActionSheet visible={menuFor != null} options={messageMenuOptions} onClose={() => setMenuFor(null)} />
      <ActionSheet visible={headerMenu} options={headerMenuOptions} onClose={() => setHeaderMenu(false)} />
      <ActionSheet
        visible={reportOpen}
        title="Why are you reporting this chat?"
        options={reportOptions}
        onClose={() => setReportOpen(false)}
      />
      <OfferForm
        visible={offerOpen}
        title="Send a job offer"
        initialService={conversation.jobContext}
        onClose={() => setOfferOpen(false)}
        onSubmit={(draftOffer) => {
          sendOffer(conversation.id, draftOffer);
          setOfferOpen(false);
        }}
      />
    </KeyboardAvoidingView>
  );
}
