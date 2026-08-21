import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useAuth } from "./AuthContext";
import { supabase } from "../lib/supabase";
import { generateId } from "../lib/id";
import { formatShortDate, formatTime } from "../lib/datetime";
import { planById } from "../data/plans";
import {
  defaultRoles, getRole, memberRank, seedGroups,
  type Group, type GroupMessage, type GroupRole, type PowerKey, type Powers,
} from "../data/groupsMock";

export type CurrentGroupUser = { userId: string; name: string; avatarUri: string };
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
  joinGroup: (id: string) => void;
  requestJoin: (id: string) => void;
  cancelRequest: (id: string) => void;
  leaveGroup: (id: string) => void;
  acceptRequest: (id: string, userId: string) => void;
  declineRequest: (id: string, userId: string) => void;
  kickMember: (id: string, userId: string) => void;
  banMember: (id: string, userId: string) => void;
  setMemberRole: (id: string, userId: string, roleId: string) => void;
  // chat
  sendMessage: (id: string, text: string) => void;
  editMessage: (id: string, messageId: string, text: string) => void;
  deleteMessage: (id: string, messageId: string) => void;
  // group + roles
  updateGroup: (id: string, patch: Partial<Pick<Group, "name" | "description" | "avatarUri" | "isPrivate">>) => void;
  createRole: (id: string, name: string, powers: Powers) => void;
  updateRole: (id: string, roleId: string, patch: Partial<Pick<GroupRole, "name" | "powers">>) => void;
  deleteRole: (id: string, roleId: string) => void;
  // Re-fetch groups/members/requests/messages from Supabase — call when a groups screen opens so
  // other people's actions (a new request, a message, someone joining) show up.
  refreshGroups: () => void;
};

const GroupsContext = createContext<GroupsState | null>(null);

function nowLabel(): string {
  return formatTime(new Date());
}

// Shapes of rows from the `groups` / `group_members` / `group_requests` / `group_messages`
// tables (snake_case, as Postgres returns them).
type GroupRow = {
  id: string;
  name: string;
  description: string;
  avatar_uri: string;
  is_private: boolean;
  owner_id: string;
  created_at: string;
};
type MemberRow = {
  group_id: string;
  user_id: string;
  name: string;
  avatar_uri: string;
  role_id: string;
  joined_at: string;
};
type RequestRow = {
  group_id: string;
  user_id: string;
  name: string;
  avatar_uri: string;
  requested_at: string;
};
type GroupMessageRow = {
  id: string;
  group_id: string;
  sender_id: string;
  text: string;
  edited: boolean;
  deleted: boolean;
  created_at: string;
};

// Assembles one real Group from its DB rows. Roles/bans/logs aren't backed by any table yet (see
// module comment in the migration) — carried forward from `existing` if this group was already in
// local state, or seeded fresh otherwise, so local-only role/ban/log edits survive a refetch.
function buildGroup(row: GroupRow, members: MemberRow[], requests: RequestRow[], messages: GroupMessageRow[], existing?: Group): Group {
  const membersById = new Map(members.map((m) => [m.user_id, m]));
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    avatarUri: row.avatar_uri,
    isPrivate: row.is_private,
    ownerId: row.owner_id,
    members: members.map((m) => ({
      userId: m.user_id,
      name: m.name,
      avatarUri: m.avatar_uri,
      roleId: m.role_id,
      joinedAt: formatShortDate(m.joined_at),
    })),
    requests: requests.map((r) => ({
      userId: r.user_id,
      name: r.name,
      avatarUri: r.avatar_uri,
      requestedAt: formatShortDate(r.requested_at),
    })),
    messages: messages.map((m) => ({
      id: m.id,
      senderId: m.sender_id,
      senderName: membersById.get(m.sender_id)?.name ?? "Member",
      senderAvatar: membersById.get(m.sender_id)?.avatar_uri ?? "",
      text: m.text,
      time: formatTime(new Date(m.created_at)),
      edited: m.edited,
      deleted: m.deleted,
    })),
    roles: existing?.roles ?? defaultRoles(),
    bans: existing?.bans ?? [],
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
    avatarUri: currentUser?.avatarUri ?? "",
  };

  const loadGroups = async () => {
    if (!currentUser) {
      setGroups([]);
      return;
    }
    const [groupsRes, membersRes, requestsRes, messagesRes] = await Promise.all([
      supabase.from("groups").select("*").order("created_at", { ascending: false }),
      supabase.from("group_members").select("*"),
      supabase.from("group_requests").select("*"),
      supabase.from("group_messages").select("*").order("created_at", { ascending: true }),
    ]);
    if (groupsRes.error || membersRes.error || requestsRes.error || messagesRes.error) {
      console.error(
        "[groups] fetch failed:",
        groupsRes.error?.message ?? membersRes.error?.message ?? requestsRes.error?.message ?? messagesRes.error?.message
      );
      return;
    }
    const groupRows = (groupsRes.data as GroupRow[] | null) ?? [];
    const memberRows = (membersRes.data as MemberRow[] | null) ?? [];
    const requestRows = (requestsRes.data as RequestRow[] | null) ?? [];
    const messageRows = (messagesRes.data as GroupMessageRow[] | null) ?? [];

    setGroups((prev) => {
      const byId = new Map(prev.map((g) => [g.id, g]));
      return groupRows.map((row) =>
        buildGroup(
          row,
          memberRows.filter((m) => m.group_id === row.id),
          requestRows.filter((r) => r.group_id === row.id),
          messageRows.filter((m) => m.group_id === row.id),
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
  const isBanned = (g: Group) => g.bans.includes(me.userId);

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
      : { ...g, members: [...g.members, { userId: u.userId, name: u.name, avatarUri: u.avatarUri, roleId, joinedAt: "Just now" }] };

  // Real: public groups join instantly via a direct insert (RLS only allows this when the group
  // isn't private).
  const joinGroup = (id: string) => {
    if (atJoinLimit) return;
    const group = getGroup(id);
    if (!group || group.bans.includes(me.userId)) return;
    patch(id, (g) => addMember(g, me));
    supabase
      .from("group_members")
      .insert({ group_id: id, user_id: me.userId, name: me.name, avatar_uri: me.avatarUri, role_id: "member" })
      .then(({ error }) => { if (error) console.error("[group_members] join failed:", error.message); });
  };

  // Real: private groups get a request row instead, resolved later by the owner.
  const requestJoin = (id: string) => {
    if (atJoinLimit) return;
    const group = getGroup(id);
    if (!group || group.bans.includes(me.userId) || group.requests.some((r) => r.userId === me.userId)) return;
    patch(id, (g) => ({ ...g, requests: [...g.requests, { userId: me.userId, name: me.name, avatarUri: me.avatarUri, requestedAt: "Just now" }] }));
    supabase
      .from("group_requests")
      .insert({ group_id: id, user_id: me.userId, name: me.name, avatar_uri: me.avatarUri })
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

  // Real, but RLS only lets the actual group owner remove someone else — a non-owner "officer"
  // with the mock kick power will see it work locally until the next refresh reverts it, since
  // that permission isn't enforced server-side yet.
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
  };

  // The membership removal is real (same as kick); the ban itself (blocking rejoining) has no
  // table yet and stays local/mock, so it resets on reload.
  const banMember = (id: string, userId: string) => {
    patch(id, (g) => {
      const mem = g.members.find((m) => m.userId === userId);
      return withLog({ ...g, members: g.members.filter((m) => m.userId !== userId), bans: [...g.bans, userId] }, `${me.name} banned ${mem?.name ?? "a member"}`);
    });
    supabase
      .from("group_members")
      .delete()
      .eq("group_id", id)
      .eq("user_id", userId)
      .then(({ error }) => { if (error) console.error("[group_members] ban-removal failed:", error.message); });
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
    const message: GroupMessage = {
      id: messageId, senderId: me.userId, senderName: me.name, senderAvatar: me.avatarUri, text, time: nowLabel(),
    };
    patch(id, (g) => ({ ...g, messages: [...g.messages, message] }));
    supabase
      .from("group_messages")
      .insert({ id: messageId, group_id: id, sender_id: me.userId, text })
      .then(({ error }) => { if (error) console.error("[group_messages] send failed:", error.message); });
  };

  const editMessage = (id: string, messageId: string, text: string) => {
    patch(id, (g) => ({ ...g, messages: g.messages.map((m) => (m.id === messageId ? { ...m, text, edited: true } : m)) }));
    supabase
      .from("group_messages")
      .update({ text, edited: true })
      .eq("id", messageId)
      .then(({ error }) => { if (error) console.error("[group_messages] edit failed:", error.message); });
  };

  // Deleting your own message persists for real. Deleting someone else's (a moderator power) is
  // local-only for now — RLS only lets the sender update their own row.
  const deleteMessage = (id: string, messageId: string) => {
    const msg = getGroup(id)?.messages.find((m) => m.id === messageId);
    patch(id, (g) => {
      const updated = { ...g, messages: g.messages.map((m) => (m.id === messageId ? { ...m, deleted: true } : m)) };
      return msg && msg.senderId !== me.userId ? withLog(updated, `${me.name} deleted a message from ${msg.senderName}`) : updated;
    });
    if (msg && msg.senderId === me.userId) {
      supabase
        .from("group_messages")
        .update({ deleted: true })
        .eq("id", messageId)
        .then(({ error }) => { if (error) console.error("[group_messages] delete failed:", error.message); });
    }
  };

  // Persists for real only when you're the actual DB owner — other "editGroup"-power roles stay
  // local-only for now, matching the mock role/power system's scope.
  const updateGroup = (id: string, p: Partial<Pick<Group, "name" | "description" | "avatarUri" | "isPrivate">>) => {
    const group = getGroup(id);
    patch(id, (g) => withLog({ ...g, ...p }, `${me.name} updated the group settings`));
    if (group && group.ownerId === me.userId) {
      const dbPatch: Record<string, unknown> = {};
      if (p.name !== undefined) dbPatch.name = p.name;
      if (p.description !== undefined) dbPatch.description = p.description;
      if (p.avatarUri !== undefined) dbPatch.avatar_uri = p.avatarUri;
      if (p.isPrivate !== undefined) dbPatch.is_private = p.isPrivate;
      supabase
        .from("groups")
        .update(dbPatch)
        .eq("id", id)
        .then(({ error }) => { if (error) console.error("[groups] update failed:", error.message); });
    }
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
        acceptRequest, declineRequest, kickMember, banMember, setMemberRole,
        sendMessage, editMessage, deleteMessage,
        updateGroup, createRole, updateRole, deleteRole,
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
