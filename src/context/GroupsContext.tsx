import { createContext, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { useAuth } from "./AuthContext";
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
  createGroup: (input: NewGroup) => string;
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
};

const GroupsContext = createContext<GroupsState | null>(null);

function nowLabel(): string {
  const d = new Date();
  const h = d.getHours() % 12 || 12;
  return `${h}:${String(d.getMinutes()).padStart(2, "0")} ${d.getHours() >= 12 ? "PM" : "AM"}`;
}

export function GroupsProvider({ children }: { children: ReactNode }) {
  const { currentUser } = useAuth();
  const [groups, setGroups] = useState<Group[]>(seedGroups.map((g) => ({ ...g })));
  const counter = useRef(0);
  const nextId = (p: string) => { counter.current += 1; return `${p}-${counter.current}`; };

  const me: CurrentGroupUser = {
    userId: currentUser?.username ?? "me",
    name: currentUser?.businessName?.trim() || currentUser?.firstName?.trim() || "You",
    avatarUri: currentUser?.avatarUri ?? "",
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

  const createGroup = (input: NewGroup): string => {
    const id = nextId("grp");
    const group: Group = {
      id,
      name: input.name,
      description: input.description,
      avatarUri: input.avatarUri,
      isPrivate: input.isPrivate,
      ownerId: me.userId,
      members: [{ userId: me.userId, name: me.name, avatarUri: me.avatarUri, roleId: "president", joinedAt: "Just now" }],
      messages: [],
      requests: [],
      roles: defaultRoles(),
      bans: [],
      logs: [{ id: nextId("log"), text: "Group created", at: nowLabel() }],
      createdAt: "Just now",
    };
    setGroups((prev) => [group, ...prev]);
    return id;
  };

  const addMember = (g: Group, u: CurrentGroupUser, roleId = "member"): Group =>
    g.members.some((m) => m.userId === u.userId)
      ? g
      : { ...g, members: [...g.members, { userId: u.userId, name: u.name, avatarUri: u.avatarUri, roleId, joinedAt: "Just now" }] };

  const joinGroup = (id: string) => {
    if (atJoinLimit) return; // plan limit reached
    patch(id, (g) => (g.bans.includes(me.userId) ? g : addMember(g, me)));
  };

  const requestJoin = (id: string) => {
    if (atJoinLimit) return; // plan limit reached
    patch(id, (g) =>
      g.bans.includes(me.userId) || g.requests.some((r) => r.userId === me.userId)
        ? g
        : { ...g, requests: [...g.requests, { userId: me.userId, name: me.name, avatarUri: me.avatarUri, requestedAt: "Just now" }] });
  };

  const cancelRequest = (id: string) =>
    patch(id, (g) => ({ ...g, requests: g.requests.filter((r) => r.userId !== me.userId) }));

  const leaveGroup = (id: string) =>
    patch(id, (g) => ({ ...g, members: g.members.filter((m) => m.userId !== me.userId) }));

  const acceptRequest = (id: string, userId: string) =>
    patch(id, (g) => {
      const req = g.requests.find((r) => r.userId === userId);
      if (!req) return g;
      const added = addMember({ ...g, requests: g.requests.filter((r) => r.userId !== userId) }, req);
      return withLog(added, `${me.name} accepted ${req.name}`);
    });

  const declineRequest = (id: string, userId: string) =>
    patch(id, (g) => {
      const req = g.requests.find((r) => r.userId === userId);
      return withLog({ ...g, requests: g.requests.filter((r) => r.userId !== userId) }, `${me.name} declined ${req?.name ?? "a request"}`);
    });

  const kickMember = (id: string, userId: string) =>
    patch(id, (g) => {
      const mem = g.members.find((m) => m.userId === userId);
      return withLog({ ...g, members: g.members.filter((m) => m.userId !== userId) }, `${me.name} kicked ${mem?.name ?? "a member"}`);
    });

  const banMember = (id: string, userId: string) =>
    patch(id, (g) => {
      const mem = g.members.find((m) => m.userId === userId);
      return withLog({ ...g, members: g.members.filter((m) => m.userId !== userId), bans: [...g.bans, userId] }, `${me.name} banned ${mem?.name ?? "a member"}`);
    });

  const setMemberRole = (id: string, userId: string, roleId: string) =>
    patch(id, (g) => {
      const mem = g.members.find((m) => m.userId === userId);
      const updated = { ...g, members: g.members.map((m) => (m.userId === userId ? { ...m, roleId } : m)) };
      return withLog(updated, `${me.name} made ${mem?.name ?? "a member"} ${getRole(g, roleId)?.name ?? roleId}`);
    });

  const sendMessage = (id: string, text: string) => {
    const message: GroupMessage = {
      id: nextId("gm"), senderId: me.userId, senderName: me.name, senderAvatar: me.avatarUri, text, time: nowLabel(),
    };
    patch(id, (g) => ({ ...g, messages: [...g.messages, message] }));
  };

  const editMessage = (id: string, messageId: string, text: string) =>
    patch(id, (g) => ({ ...g, messages: g.messages.map((m) => (m.id === messageId ? { ...m, text, edited: true } : m)) }));

  const deleteMessage = (id: string, messageId: string) =>
    patch(id, (g) => {
      const msg = g.messages.find((m) => m.id === messageId);
      const updated = { ...g, messages: g.messages.map((m) => (m.id === messageId ? { ...m, deleted: true } : m)) };
      // Log only moderator deletions (removing someone else's message).
      return msg && msg.senderId !== me.userId ? withLog(updated, `${me.name} deleted a message from ${msg.senderName}`) : updated;
    });

  const updateGroup = (id: string, p: Partial<Pick<Group, "name" | "description" | "avatarUri" | "isPrivate">>) =>
    patch(id, (g) => withLog({ ...g, ...p }, `${me.name} updated the group settings`));

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

  const myGroups = useMemo(() => groups.filter((g) => g.members.some((m) => m.userId === me.userId)), [groups, me.userId]);
  const discoverGroups = useMemo(() => groups.filter((g) => !g.members.some((m) => m.userId === me.userId)), [groups, me.userId]);

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
