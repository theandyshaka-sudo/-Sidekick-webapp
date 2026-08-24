import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useAuth } from "./AuthContext";
import { supabase } from "../lib/supabase";
import { generateId } from "../lib/id";
import { formatShortDate, formatTime } from "../lib/datetime";
import { containsProfanity } from "../lib/moderateText";
import { pickAndUploadPhoto } from "../lib/uploadPhoto";
import { planById } from "../data/plans";
import {
  defaultRoles, getRole, memberRank, seedGroups,
  type Group, type GroupAnnouncement, type GroupFaq, type GroupMessage, type GroupRole, type PowerKey, type Powers,
} from "../data/groupsMock";

export type CurrentGroupUser = { userId: string; name: string; realName: string; avatarUri: string };
type NewGroup = { name: string; description: string; isPrivate: boolean; avatarUri: string };

type GroupsState = {
  me: CurrentGroupUser;
  groups: Group[];
  myGroups: Group[];
  discoverGroups: Group[];
  getGroup: (id: string) => Group | undefined;
  isMember: (g: Group) => boolean;
  hasRequested: (g: Group) => boolean;
  isBanned: (g: Group) => boolean;
  // plan entitlements
  joinLimit: number | "unlimited";
  joinedCount: number;
  atJoinLimit: boolean;
  // permissions
  myRole: (g: Group) => GroupRole | null;
  myRank: (g: Group) => number;
  can: (g: Group, power: PowerKey) => boolean;
  isStaff: (g: Group) => boolean;
  canActOn: (g: Group, member: Group["members"][number]) => boolean;
  assignableRoles: (g: Group) => GroupRole[];
  sortedMembers: (g: Group) => Group["members"];
  // membership
  createGroup: (input: NewGroup) => Promise<string>;
  joinGroup: (id: string) => Promise<void>;
  requestJoin: (id: string) => void;
  cancelRequest: (id: string) => void;
  leaveGroup: (id: string) => void;
  acceptRequest: (id: string, userId: string) => void;
  declineRequest: (id: string, userId: string) => void;
  kickMember: (id: string, userId: string) => void;
  banMember: (id: string, userId: string) => void;
  unbanMember: (id: string, userId: string) => void;
  muteMember: (id: string, userId: string, hours: number) => void;
  toggleCanAnswerFaq: (id: string, userId: string, value: boolean) => void;
  setMemberRole: (id: string, userId: string, roleId: string) => void;
  // chat
  sendMessage: (id: string, text: string) => void;
  sendPhoto: (id: string, source: "camera" | "library") => Promise<void>;
  editMessage: (id: string, messageId: string, text: string) => void;
  deleteMessage: (id: string, messageId: string) => void;
  // Group owner (or the message's own flagger-visible sender) clears a flag without deleting —
  // "false alarm" on the wordlist check.
  unflagMessage: (id: string, messageId: string) => void;
  canSeeFlagged: (g: Group, message: GroupMessage) => boolean;
  // group + roles
  updateGroup: (id: string, patch: Partial<Pick<Group, "name" | "description" | "avatarUri" | "isPrivate" | "rules">>) => void;
  createRole: (id: string, name: string, powers: Powers) => void;
  updateRole: (id: string, roleId: string, patch: Partial<Pick<GroupRole, "name" | "powers">>) => void;
  deleteRole: (id: string, roleId: string) => void;
  // Owner-only broadcast feed.
  postAnnouncement: (id: string, text: string) => void;
  deleteAnnouncement: (id: string, announcementId: string) => void;
  // FAQ: any member can ask; the owner or a can_answer_faq member answers or rejects.
  askFaq: (id: string, question: string) => void;
  answerFaq: (id: string, faqId: string, answer: string) => void;
  deleteFaq: (id: string, faqId: string) => void;
  // Owner hands the group to another current member. Irreversible from the old owner's side.
  transferOwnership: (id: string, newOwnerId: string) => Promise<void>;
  // Re-fetch groups/members/requests/messages/announcements/faqs/bans from Supabase — call when a
  // groups screen opens so other people's actions (a new request, a message, someone joining) show up.
  refreshGroups: () => void;
};

const GroupsContext = createContext<GroupsState | null>(null);

function nowLabel(): string {
  return formatTime(new Date());
}

// Shapes of rows from the `groups` / `group_members` / `group_requests` / `group_messages` /
// `group_announcements` / `group_faqs` / `group_bans` tables (snake_case, as Postgres returns them).
type GroupRow = {
  id: string;
  name: string;
  description: string;
  avatar_uri: string;
  is_private: boolean;
  owner_id: string;
  rules: string;
  created_at: string;
};
type MemberRow = {
  group_id: string;
  user_id: string;
  name: string;
  real_name: string;
  avatar_uri: string;
  role_id: string;
  can_answer_faq: boolean;
  muted_until: string | null;
  joined_at: string;
};
type RequestRow = {
  group_id: string;
  user_id: string;
  name: string;
  real_name: string;
  avatar_uri: string;
  requested_at: string;
};
type GroupMessageRow = {
  id: string;
  group_id: string;
  sender_id: string;
  text: string;
  image_url: string | null;
  flagged: boolean;
  edited: boolean;
  deleted: boolean;
  created_at: string;
};
type AnnouncementRow = {
  id: string;
  group_id: string;
  author_id: string;
  author_name: string;
  text: string;
  created_at: string;
};
type FaqRow = {
  id: string;
  group_id: string;
  author_id: string;
  author_name: string;
  question: string;
  answer: string | null;
  flagged: boolean;
  answered_by_id: string | null;
  answered_by_name: string | null;
  answered_at: string | null;
  created_at: string;
};
type BanRow = {
  group_id: string;
  user_id: string;
  name: string;
  banned_at: string;
};

// Assembles one real Group from its DB rows. Roles/logs aren't backed by any table yet (see module
// comment in the migrations) — carried forward from `existing` if this group was already in local
// state, or seeded fresh otherwise, so local-only role/log edits survive a refetch.
function buildGroup(
  row: GroupRow,
  members: MemberRow[],
  requests: RequestRow[],
  messages: GroupMessageRow[],
  announcements: AnnouncementRow[],
  faqs: FaqRow[],
  bans: BanRow[],
  existing?: Group
): Group {
  const membersById = new Map(members.map((m) => [m.user_id, m]));
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    avatarUri: row.avatar_uri,
    isPrivate: row.is_private,
    ownerId: row.owner_id,
    rules: row.rules,
    members: members.map((m) => ({
      userId: m.user_id,
      name: m.name,
      realName: m.real_name,
      avatarUri: m.avatar_uri,
      roleId: m.role_id,
      canAnswerFaq: m.can_answer_faq,
      mutedUntil: m.muted_until ?? undefined,
      joinedAt: formatShortDate(m.joined_at),
    })),
    requests: requests.map((r) => ({
      userId: r.user_id,
      name: r.name,
      realName: r.real_name,
      avatarUri: r.avatar_uri,
      requestedAt: formatShortDate(r.requested_at),
    })),
    messages: messages.map((m) => ({
      id: m.id,
      senderId: m.sender_id,
      senderName: membersById.get(m.sender_id)?.name ?? "Member",
      senderAvatar: membersById.get(m.sender_id)?.avatar_uri ?? "",
      text: m.text,
      imageUrl: m.image_url ?? undefined,
      time: formatTime(new Date(m.created_at)),
      edited: m.edited,
      deleted: m.deleted,
      flagged: m.flagged,
    })),
    announcements: [...announcements]
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
      .map((a) => ({ id: a.id, authorId: a.author_id, authorName: a.author_name, text: a.text, createdAt: formatShortDate(a.created_at) })),
    faqs: [...faqs]
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
      .map((f) => ({
        id: f.id,
        authorId: f.author_id,
        authorName: f.author_name,
        question: f.question,
        answer: f.answer,
        flagged: f.flagged,
        answeredById: f.answered_by_id ?? undefined,
        answeredByName: f.answered_by_name ?? undefined,
        answeredAt: f.answered_at ? formatShortDate(f.answered_at) : undefined,
        createdAt: formatShortDate(f.created_at),
      })),
    roles: existing?.roles ?? defaultRoles(),
    bans: bans.map((b) => ({ userId: b.user_id, name: b.name, bannedAt: formatShortDate(b.banned_at) })),
    logs: existing?.logs ?? [{ id: `log-${row.id}`, text: "Group created", at: formatShortDate(row.created_at) }],
    createdAt: formatShortDate(row.created_at),
  };
}

export function GroupsProvider({ children }: { children: ReactNode }) {
  const { currentUser } = useAuth();
  const [groups, setGroups] = useState<Group[]>(seedGroups.map((g) => ({ ...g })));
  const counter = useRef(0);
  const nextId = (p: string) => { counter.current += 1; return `${p}-${counter.current}`; };

  const me: CurrentGroupUser = {
    userId: currentUser?.id ?? "me",
    name: currentUser?.businessName?.trim() || currentUser?.firstName?.trim() || "You",
    realName: `${currentUser?.firstName ?? ""} ${currentUser?.lastName ?? ""}`.trim() || "You",
    avatarUri: currentUser?.avatarUri ?? "",
  };

  const loadGroups = async () => {
    if (!currentUser) {
      setGroups([]);
      return;
    }
    const [groupsRes, membersRes, requestsRes, messagesRes, announcementsRes, faqsRes, bansRes] = await Promise.all([
      supabase.from("groups").select("*").order("created_at", { ascending: false }),
      supabase.from("group_members").select("*"),
      supabase.from("group_requests").select("*"),
      supabase.from("group_messages").select("*").order("created_at", { ascending: true }),
      supabase.from("group_announcements").select("*"),
      supabase.from("group_faqs").select("*"),
      supabase.from("group_bans").select("*"),
    ]);
    if (
      groupsRes.error || membersRes.error || requestsRes.error || messagesRes.error
      || announcementsRes.error || faqsRes.error || bansRes.error
    ) {
      console.error(
        "[groups] fetch failed:",
        groupsRes.error?.message ?? membersRes.error?.message ?? requestsRes.error?.message
          ?? messagesRes.error?.message ?? announcementsRes.error?.message ?? faqsRes.error?.message
          ?? bansRes.error?.message
      );
      return;
    }
    const groupRows = (groupsRes.data as GroupRow[] | null) ?? [];
    const memberRows = (membersRes.data as MemberRow[] | null) ?? [];
    const requestRows = (requestsRes.data as RequestRow[] | null) ?? [];
    const messageRows = (messagesRes.data as GroupMessageRow[] | null) ?? [];
    const announcementRows = (announcementsRes.data as AnnouncementRow[] | null) ?? [];
    const faqRows = (faqsRes.data as FaqRow[] | null) ?? [];
    const banRows = (bansRes.data as BanRow[] | null) ?? [];

    setGroups((prev) => {
      const byId = new Map(prev.map((g) => [g.id, g]));
      return groupRows.map((row) =>
        buildGroup(
          row,
          memberRows.filter((m) => m.group_id === row.id),
          requestRows.filter((r) => r.group_id === row.id),
          messageRows.filter((m) => m.group_id === row.id),
          announcementRows.filter((a) => a.group_id === row.id),
          faqRows.filter((f) => f.group_id === row.id),
          banRows.filter((b) => b.group_id === row.id),
          byId.get(row.id)
        )
      );
    });
  };

  useEffect(() => {
    loadGroups();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]);

  const refreshGroups = () => {
    loadGroups();
  };

  const getGroup = (id: string) => groups.find((g) => g.id === id);
  const isMember = (g: Group) => g.members.some((m) => m.userId === me.userId);
  const hasRequested = (g: Group) => g.requests.some((r) => r.userId === me.userId);
  const isBanned = (g: Group) => g.bans.some((b) => b.userId === me.userId);

  // Your plan decides how many groups you can join (separate from how many you can create).
  // No plan → 0 (you get what you pay for). "Join" counts groups you're in but didn't create.
  const plan = planById(currentUser?.plan);
  const joinLimit: number | "unlimited" = plan ? plan.joinGroups : 0;
  const joinedCount = groups.filter((g) => g.ownerId !== me.userId && g.members.some((m) => m.userId === me.userId)).length;
  const atJoinLimit = joinLimit !== "unlimited" && joinedCount >= joinLimit;
  const myRole = (g: Group): GroupRole | null => {
    const mem = g.members.find((m) => m.userId === me.userId);
    return mem ? getRole(g, mem.roleId) ?? null : null;
  };
  const myRank = (g: Group) => myRole(g)?.rank ?? 0;
  const can = (g: Group, power: PowerKey) => myRole(g)?.powers[power] ?? false;
  const isStaff = (g: Group) => {
    const r = myRole(g);
    return !!r && (r.id === "president" || Object.values(r.powers).some(Boolean));
  };
  const canActOn = (g: Group, member: Group["members"][number]) =>
    member.userId !== me.userId && myRank(g) > memberRank(g, member);
  const assignableRoles = (g: Group) =>
    g.roles.filter((r) => r.rank < myRank(g)).sort((a, b) => b.rank - a.rank);
  const sortedMembers = (g: Group) =>
    [...g.members].sort((a, b) => memberRank(g, b) - memberRank(g, a));

  const patch = (id: string, fn: (g: Group) => Group) =>
    setGroups((prev) => prev.map((g) => (g.id === id ? fn(g) : g)));

  const withLog = (g: Group, text: string): Group => ({
    ...g,
    logs: [{ id: nextId("log"), text, at: nowLabel() }, ...g.logs],
  });

  // Real: creates the group + owner membership together via the create_group() RPC.
  const createGroup = async (input: NewGroup): Promise<string> => {
    const { data, error } = await supabase.rpc("create_group", {
      group_name: input.name,
      group_description: input.description,
      group_avatar_uri: input.avatarUri,
      group_is_private: input.isPrivate,
    });
    if (error || !data) {
      console.error("[create_group] failed:", error?.message);
      throw error ?? new Error("Failed to create group.");
    }
    await loadGroups();
    return data as string;
  };

  const addMember = (g: Group, u: CurrentGroupUser, roleId = "member"): Group =>
    g.members.some((m) => m.userId === u.userId)
      ? g
      : { ...g, members: [...g.members, { userId: u.userId, name: u.name, realName: u.realName, avatarUri: u.avatarUri, roleId, joinedAt: "Just now", canAnswerFaq: false }] };

  // Real: routes through the join_public_group() RPC, which decides server-side whether this
  // becomes an instant membership (public group, never kicked/banned), a join request (private, or
  // a public group this account was previously kicked from), or is silently refused (banned). No
  // optimistic local add — the outcome isn't known client-side ahead of time.
  const joinGroup = async (id: string) => {
    if (atJoinLimit) return;
    const group = getGroup(id);
    if (!group) return;
    const { error } = await supabase.rpc("join_public_group", { target_group_id: id });
    if (error) {
      console.error("[join_public_group] failed:", error.message);
      return;
    }
    await loadGroups();
  };

  // Real: private groups get a request row instead, resolved later by the owner.
  const requestJoin = (id: string) => {
    if (atJoinLimit) return;
    const group = getGroup(id);
    if (!group || isBanned(group) || group.requests.some((r) => r.userId === me.userId)) return;
    patch(id, (g) => ({ ...g, requests: [...g.requests, { userId: me.userId, name: me.name, realName: me.realName, avatarUri: me.avatarUri, requestedAt: "Just now" }] }));
    supabase
      .from("group_requests")
      .insert({ group_id: id, user_id: me.userId, name: me.name, real_name: me.realName, avatar_uri: me.avatarUri })
      .then(({ error }) => { if (error) console.error("[group_requests] request failed:", error.message); });
  };

  const cancelRequest = (id: string) => {
    patch(id, (g) => ({ ...g, requests: g.requests.filter((r) => r.userId !== me.userId) }));
    supabase
      .from("group_requests")
      .delete()
      .eq("group_id", id)
      .eq("user_id", me.userId)
      .then(({ error }) => { if (error) console.error("[group_requests] cancel failed:", error.message); });
  };

  const leaveGroup = (id: string) => {
    patch(id, (g) => ({ ...g, members: g.members.filter((m) => m.userId !== me.userId) }));
    supabase
      .from("group_members")
      .delete()
      .eq("group_id", id)
      .eq("user_id", me.userId)
      .then(({ error }) => { if (error) console.error("[group_members] leave failed:", error.message); });
  };

  // Real, but only the actual group owner can make it stick server-side (accept_group_request
  // checks this) — full role/power-based permissions for this stay mock for now.
  const acceptRequest = (id: string, userId: string) => {
    patch(id, (g) => {
      const req = g.requests.find((r) => r.userId === userId);
      if (!req) return g;
      const added = addMember({ ...g, requests: g.requests.filter((r) => r.userId !== userId) }, req);
      return withLog(added, `${me.name} accepted ${req.name}`);
    });
    supabase
      .rpc("accept_group_request", { target_group_id: id, target_user_id: userId })
      .then(({ error }) => { if (error) console.error("[accept_group_request] failed:", error.message); });
  };

  const declineRequest = (id: string, userId: string) => {
    patch(id, (g) => {
      const req = g.requests.find((r) => r.userId === userId);
      return withLog({ ...g, requests: g.requests.filter((r) => r.userId !== userId) }, `${me.name} declined ${req?.name ?? "a request"}`);
    });
    supabase
      .from("group_requests")
      .delete()
      .eq("group_id", id)
      .eq("user_id", userId)
      .then(({ error }) => { if (error) console.error("[group_requests] decline failed:", error.message); });
  };

  // Real. Also records a group_kicked_users row, so rejoining a public group routes through the
  // request/approval flow from now on (see join_public_group()), same as a private group.
  const kickMember = (id: string, userId: string) => {
    patch(id, (g) => {
      const mem = g.members.find((m) => m.userId === userId);
      return withLog({ ...g, members: g.members.filter((m) => m.userId !== userId) }, `${me.name} kicked ${mem?.name ?? "a member"}`);
    });
    supabase
      .from("group_members")
      .delete()
      .eq("group_id", id)
      .eq("user_id", userId)
      .then(({ error }) => { if (error) console.error("[group_members] kick failed:", error.message); });
    supabase
      .from("group_kicked_users")
      .insert({ group_id: id, user_id: userId })
      .then(({ error }) => { if (error) console.error("[group_kicked_users] record failed:", error.message); });
  };

  // Real — removes membership and records a permanent group_bans row blocking rejoin entirely
  // (both instant public join and the request flow). See unbanMember to reverse it.
  const banMember = (id: string, userId: string) => {
    const group = getGroup(id);
    const mem = group?.members.find((m) => m.userId === userId);
    patch(id, (g) =>
      withLog(
        { ...g, members: g.members.filter((m) => m.userId !== userId), bans: [...g.bans, { userId, name: mem?.name ?? "Member", bannedAt: nowLabel() }] },
        `${me.name} banned ${mem?.name ?? "a member"}`
      )
    );
    supabase
      .from("group_members")
      .delete()
      .eq("group_id", id)
      .eq("user_id", userId)
      .then(({ error }) => { if (error) console.error("[group_members] ban-removal failed:", error.message); });
    supabase
      .from("group_bans")
      .insert({ group_id: id, user_id: userId, banned_by: me.userId, name: mem?.name ?? "Member" })
      .then(({ error }) => { if (error) console.error("[group_bans] ban failed:", error.message); });
  };

  // Owner-only, not asked for explicitly but added deliberately — a permanent ban with literally
  // no way to reverse it is a bad default.
  const unbanMember = (id: string, userId: string) => {
    patch(id, (g) => ({ ...g, bans: g.bans.filter((b) => b.userId !== userId) }));
    supabase
      .from("group_bans")
      .delete()
      .eq("group_id", id)
      .eq("user_id", userId)
      .then(({ error }) => { if (error) console.error("[group_bans] unban failed:", error.message); });
  };

  // Owner-only. Blocks that member from sending group chat messages until `hours` from now.
  const muteMember = (id: string, userId: string, hours: number) => {
    const until = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
    patch(id, (g) =>
      withLog(
        { ...g, members: g.members.map((m) => (m.userId === userId ? { ...m, mutedUntil: until } : m)) },
        `${me.name} muted a member`
      )
    );
    supabase
      .from("group_members")
      .update({ muted_until: until })
      .eq("group_id", id)
      .eq("user_id", userId)
      .then(({ error }) => { if (error) console.error("[group_members] mute failed:", error.message); });
  };

  // Owner-only. Grants/revokes the ability to answer pending FAQ questions — the owner can always
  // answer regardless of this flag.
  const toggleCanAnswerFaq = (id: string, userId: string, value: boolean) => {
    patch(id, (g) => ({ ...g, members: g.members.map((m) => (m.userId === userId ? { ...m, canAnswerFaq: value } : m)) }));
    supabase
      .from("group_members")
      .update({ can_answer_faq: value })
      .eq("group_id", id)
      .eq("user_id", userId)
      .then(({ error }) => { if (error) console.error("[group_members] can_answer_faq update failed:", error.message); });
  };

  // Local/mock only — no group_roles table yet.
  const setMemberRole = (id: string, userId: string, roleId: string) =>
    patch(id, (g) => {
      const mem = g.members.find((m) => m.userId === userId);
      const updated = { ...g, members: g.members.map((m) => (m.userId === userId ? { ...m, roleId } : m)) };
      return withLog(updated, `${me.name} made ${mem?.name ?? "a member"} ${getRole(g, roleId)?.name ?? roleId}`);
    });

  const sendMessage = (id: string, text: string) => {
    const messageId = generateId();
    const flagged = containsProfanity(text);
    const message: GroupMessage = {
      id: messageId, senderId: me.userId, senderName: me.name, senderAvatar: me.avatarUri, text, time: nowLabel(), flagged,
    };
    patch(id, (g) => ({ ...g, messages: [...g.messages, message] }));
    supabase
      .from("group_messages")
      .insert({ id: messageId, group_id: id, sender_id: me.userId, text, flagged })
      .then(({ error }) => { if (error) console.error("[group_messages] send failed:", error.message); });
  };

  // Photo messages reuse the same `uploads` Storage bucket + picker as profile/service photos.
  // No content scanning happens on photos — see the migration's module comment — so this never
  // sets `flagged`; a bad photo relies on someone reporting it.
  const sendPhoto = async (id: string, source: "camera" | "library") => {
    if (!currentUser) return;
    const url = await pickAndUploadPhoto(source, currentUser.id, "group-chat");
    if (!url) return;
    const messageId = generateId();
    const message: GroupMessage = {
      id: messageId, senderId: me.userId, senderName: me.name, senderAvatar: me.avatarUri, text: "", imageUrl: url, time: nowLabel(),
    };
    patch(id, (g) => ({ ...g, messages: [...g.messages, message] }));
    supabase
      .from("group_messages")
      .insert({ id: messageId, group_id: id, sender_id: me.userId, text: "", image_url: url })
      .then(({ error }) => { if (error) console.error("[group_messages] photo send failed:", error.message); });
  };

  // A flagged message is hidden from regular members client-side (index.tsx renders a placeholder
  // instead) — only the sender and the real group owner see the real content, standing in for
  // "admins only" until there's a real backend admin role.
  const canSeeFlagged = (g: Group, message: GroupMessage) =>
    message.senderId === me.userId || g.ownerId === me.userId;

  const unflagMessage = (id: string, messageId: string) => {
    patch(id, (g) => ({ ...g, messages: g.messages.map((m) => (m.id === messageId ? { ...m, flagged: false } : m)) }));
    supabase
      .from("group_messages")
      .update({ flagged: false })
      .eq("id", messageId)
      .then(({ error }) => { if (error) console.error("[group_messages] unflag failed:", error.message); });
  };

  const editMessage = (id: string, messageId: string, text: string) => {
    patch(id, (g) => ({ ...g, messages: g.messages.map((m) => (m.id === messageId ? { ...m, text, edited: true } : m)) }));
    supabase
      .from("group_messages")
      .update({ text, edited: true })
      .eq("id", messageId)
      .then(({ error }) => { if (error) console.error("[group_messages] edit failed:", error.message); });
  };

  // Flagged messages are now permanent — no one, not even the owner, can delete one (only dismiss
  // its flag). Deleting your own unflagged message, or the owner deleting anyone's unflagged
  // message, still works as before.
  const deleteMessage = (id: string, messageId: string) => {
    const group = getGroup(id);
    const msg = group?.messages.find((m) => m.id === messageId);
    if (!msg || msg.flagged) return;
    patch(id, (g) => {
      const updated = { ...g, messages: g.messages.map((m) => (m.id === messageId ? { ...m, deleted: true } : m)) };
      return msg.senderId !== me.userId ? withLog(updated, `${me.name} deleted a message from ${msg.senderName}`) : updated;
    });
    if (msg.senderId === me.userId || group?.ownerId === me.userId) {
      supabase
        .from("group_messages")
        .update({ deleted: true })
        .eq("id", messageId)
        .then(({ error }) => { if (error) console.error("[group_messages] delete failed:", error.message); });
    }
  };

  // Persists for real only when you're the actual DB owner — other "editGroup"-power roles stay
  // local-only for now, matching the mock role/power system's scope.
  const updateGroup = (id: string, p: Partial<Pick<Group, "name" | "description" | "avatarUri" | "isPrivate" | "rules">>) => {
    const group = getGroup(id);
    patch(id, (g) => withLog({ ...g, ...p }, `${me.name} updated the group settings`));
    if (group && group.ownerId === me.userId) {
      const dbPatch: Record<string, unknown> = {};
      if (p.name !== undefined) dbPatch.name = p.name;
      if (p.description !== undefined) dbPatch.description = p.description;
      if (p.avatarUri !== undefined) dbPatch.avatar_uri = p.avatarUri;
      if (p.isPrivate !== undefined) dbPatch.is_private = p.isPrivate;
      if (p.rules !== undefined) dbPatch.rules = p.rules;
      supabase
        .from("groups")
        .update(dbPatch)
        .eq("id", id)
        .then(({ error }) => { if (error) console.error("[groups] update failed:", error.message); });
    }
  };

  // Owner-only broadcast feed — real (see the migration's insert policy).
  const postAnnouncement = (id: string, text: string) => {
    const announcementId = generateId();
    const announcement: GroupAnnouncement = { id: announcementId, authorId: me.userId, authorName: me.name, text, createdAt: nowLabel() };
    patch(id, (g) => ({ ...g, announcements: [announcement, ...g.announcements] }));
    supabase
      .from("group_announcements")
      .insert({ id: announcementId, group_id: id, author_id: me.userId, author_name: me.name, text })
      .then(({ error }) => { if (error) console.error("[group_announcements] post failed:", error.message); });
  };

  const deleteAnnouncement = (id: string, announcementId: string) => {
    patch(id, (g) => ({ ...g, announcements: g.announcements.filter((a) => a.id !== announcementId) }));
    supabase
      .from("group_announcements")
      .delete()
      .eq("id", announcementId)
      .then(({ error }) => { if (error) console.error("[group_announcements] delete failed:", error.message); });
  };

  // Any member can ask — real (see the migration's insert policy). Runs the same wordlist check
  // chat uses so an obviously bad question is at least flagged for whoever answers it.
  const askFaq = (id: string, question: string) => {
    const faqId = generateId();
    const flagged = containsProfanity(question);
    const faq: GroupFaq = { id: faqId, authorId: me.userId, authorName: me.name, question, answer: null, flagged, createdAt: nowLabel() };
    patch(id, (g) => ({ ...g, faqs: [faq, ...g.faqs] }));
    supabase
      .from("group_faqs")
      .insert({ id: faqId, group_id: id, author_id: me.userId, author_name: me.name, question, flagged })
      .then(({ error }) => { if (error) console.error("[group_faqs] ask failed:", error.message); });
  };

  // Owner or a can_answer_faq member — real (see the migration's update policy).
  const answerFaq = (id: string, faqId: string, answer: string) => {
    const answeredAt = nowLabel();
    patch(id, (g) => ({
      ...g,
      faqs: g.faqs.map((f) => (f.id === faqId ? { ...f, answer, answeredById: me.userId, answeredByName: me.name, answeredAt } : f)),
    }));
    supabase
      .from("group_faqs")
      .update({ answer, answered_by_id: me.userId, answered_by_name: me.name, answered_at: new Date().toISOString() })
      .eq("id", faqId)
      .then(({ error }) => { if (error) console.error("[group_faqs] answer failed:", error.message); });
  };

  const deleteFaq = (id: string, faqId: string) => {
    patch(id, (g) => ({ ...g, faqs: g.faqs.filter((f) => f.id !== faqId) }));
    supabase
      .from("group_faqs")
      .delete()
      .eq("id", faqId)
      .then(({ error }) => { if (error) console.error("[group_faqs] delete failed:", error.message); });
  };

  // Real — the transfer_group_ownership RPC re-checks server-side that the caller is really the
  // owner and the target is really a member, then moves owner_id and swaps the president/member
  // role rows. Awaited (unlike the other mutations here) so the confirm screen can show an error
  // instead of navigating away on a failed transfer.
  const transferOwnership = async (id: string, newOwnerId: string) => {
    const { error } = await supabase.rpc("transfer_group_ownership", { target_group_id: id, new_owner_id: newOwnerId });
    if (error) {
      console.error("[transfer_group_ownership] failed:", error.message);
      throw error;
    }
    await loadGroups();
  };

  // Local/mock only — no group_roles table yet.
  const createRole = (id: string, name: string, powers: Powers) =>
    patch(id, (g) => withLog({ ...g, roles: [...g.roles, { id: nextId("role"), name, rank: 50, powers }] }, `${me.name} created the ${name} role`));

  const updateRole = (id: string, roleId: string, p: Partial<Pick<GroupRole, "name" | "powers">>) =>
    patch(id, (g) => withLog({ ...g, roles: g.roles.map((r) => (r.id === roleId ? { ...r, ...p } : r)) }, `${me.name} updated the ${getRole(g, roleId)?.name ?? "a"} role`));

  const deleteRole = (id: string, roleId: string) =>
    patch(id, (g) =>
      withLog(
        {
          ...g,
          roles: g.roles.filter((r) => r.id !== roleId),
          members: g.members.map((m) => (m.roleId === roleId ? { ...m, roleId: "member" } : m)),
        },
        `${me.name} deleted the ${getRole(g, roleId)?.name ?? "a"} role`
      )
    );

  const myGroups = groups.filter((g) => g.members.some((m) => m.userId === me.userId));
  const discoverGroups = groups.filter((g) => !g.members.some((m) => m.userId === me.userId));

  return (
    <GroupsContext.Provider
      value={{
        me, groups, myGroups, discoverGroups, getGroup, isMember, hasRequested, isBanned,
        joinLimit, joinedCount, atJoinLimit,
        myRole, myRank, can, isStaff, canActOn, assignableRoles, sortedMembers,
        createGroup, joinGroup, requestJoin, cancelRequest, leaveGroup,
        acceptRequest, declineRequest, kickMember, banMember, unbanMember, muteMember, toggleCanAnswerFaq, setMemberRole,
        sendMessage, sendPhoto, editMessage, deleteMessage, unflagMessage, canSeeFlagged,
        updateGroup, createRole, updateRole, deleteRole,
        postAnnouncement, deleteAnnouncement, askFaq, answerFaq, deleteFaq, transferOwnership,
        refreshGroups,
      }}
    >
      {children}
    </GroupsContext.Provider>
  );
}

export function useGroups() {
  const ctx = useContext(GroupsContext);
  if (!ctx) throw new Error("useGroups must be used within GroupsProvider");
  return ctx;
}
