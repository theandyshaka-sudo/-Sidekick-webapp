// Groups = communities where business owners learn techniques and help each other grow.
// In-memory for now (becomes real with Supabase).

export type PowerKey =
  | "acceptRequests"
  | "editGroup"
  | "deleteMessages"
  | "kick"
  | "ban"
  | "assignRoles"
  | "manageRoles";

export type Powers = Record<PowerKey, boolean>;

// Every togglable power a president can grant a role.
export const POWERS: Array<{ key: PowerKey; label: string; desc: string }> = [
  { key: "acceptRequests", label: "Manage join requests", desc: "Accept or decline people who ask to join" },
  { key: "editGroup", label: "Edit group", desc: "Change the name, photo, description & privacy" },
  { key: "deleteMessages", label: "Delete messages", desc: "Remove anyone's messages" },
  { key: "kick", label: "Kick members", desc: "Remove members from the group" },
  { key: "ban", label: "Ban members", desc: "Remove members and block them from rejoining" },
  { key: "assignRoles", label: "Promote & demote", desc: "Change other members' roles" },
  { key: "manageRoles", label: "Manage roles", desc: "Create, edit & delete roles and their powers" },
];

export const NO_POWERS: Powers = {
  acceptRequests: false, editGroup: false, deleteMessages: false, kick: false, ban: false, assignRoles: false, manageRoles: false,
};
export const ALL_POWERS: Powers = {
  acceptRequests: true, editGroup: true, deleteMessages: true, kick: true, ban: true, assignRoles: true, manageRoles: true,
};

export type GroupRole = {
  id: string;
  name: string;
  rank: number; // hierarchy — higher outranks lower; you can only act on lower ranks
  powers: Powers;
  locked?: boolean; // president & member are built-in and can't be renamed/deleted
};

// The three roles every group starts with. President has everything; Member has nothing.
export function defaultRoles(): GroupRole[] {
  return [
    { id: "president", name: "President", rank: 100, powers: { ...ALL_POWERS }, locked: true },
    { id: "vp", name: "Vice President", rank: 80, powers: { acceptRequests: true, editGroup: true, deleteMessages: true, kick: true, ban: false, assignRoles: false, manageRoles: false } },
    { id: "member", name: "Member", rank: 10, powers: { ...NO_POWERS }, locked: true },
  ];
}

export type GroupMember = {
  userId: string;
  name: string;
  realName: string;
  avatarUri: string;
  roleId: string;
  joinedAt: string;
  mutedUntil?: string;
  // Real, DB-backed permission assignment — separate from `roleId` above, which stays the local
  // mock rank/powers system. Points at a `group_roles` row (or undefined = no elevated real power).
  customRoleId?: string;
};

// Real, DB-backed permission roles (group_roles table). `rank` is the only thing that stays
// local/mock now (hierarchy for who can act on whom) — every togglable power is real.
export type PermissionRole = {
  id: string;
  name: string;
  canKick: boolean;
  canAnswerFaq: boolean;
  canViewFlagged: boolean;
  canAcceptRequests: boolean;
  canEditGroup: boolean;
  canDeleteMessages: boolean;
  canAssignRoles: boolean;
  canManageRoles: boolean;
  canPostAnnouncements: boolean;
  canEditRules: boolean;
};

// Rules are stored as one text column ("1. ...\n2. ...\n3. ...") but edited/displayed as a
// numbered list. Any line that isn't already numbered becomes item 1 so nothing pre-existing is lost.
export function parseRules(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  const lines = trimmed.split("\n").map((l) => l.trim()).filter(Boolean);
  const numbered = lines.filter((l) => /^\d+\.\s*/.test(l));
  if (numbered.length === 0) return [trimmed];
  return lines.map((l) => l.replace(/^\d+\.\s*/, ""));
}

export function serializeRules(items: string[]): string {
  return items.map((item, i) => `${i + 1}. ${item}`).join("\n");
}

export type GroupMessage = {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  text: string;
  imageUrl?: string;
  time: string;
  edited?: boolean;
  deleted?: boolean;
  flagged?: boolean;
};

export type GroupAnnouncement = {
  id: string;
  authorId: string;
  authorName: string;
  text: string;
  createdAt: string;
};

export type GroupFaq = {
  id: string;
  authorId: string;
  authorName: string;
  question: string;
  answer: string | null; // null = pending, awaiting an answer
  flagged?: boolean;
  answeredById?: string;
  answeredByName?: string;
  answeredAt?: string;
  createdAt: string;
};

export type JoinRequest = {
  userId: string;
  name: string;
  realName: string;
  avatarUri: string;
  requestedAt: string;
};

export type GroupLog = { id: string; text: string; at: string };

export type GroupBan = { userId: string; name: string; bannedAt: string };

// A pending/past kick record for this group — real, from group_kicked_users. Used both to warn
// the owner reviewing a rejoin request, and (filtered to the current user) to notify someone
// they were removed.
export type GroupKickRecord = {
  userId: string;
  reason: string | null;
  kickedAt: string;
  kickedByName: string;
  kickedByRealName: string;
  acknowledgedAt: string | null;
};

export type ModerationAction = "kick" | "ban" | "mute" | "unban" | "unmute";
export type ModerationLogEntry = {
  id: string;
  action: ModerationAction;
  targetUserId: string;
  targetName: string;
  targetRealName: string;
  actorId: string;
  actorName: string;
  actorRealName: string;
  reason: string | null;
  muteUntil?: string;
  createdAt: string;
};

export type Group = {
  id: string;
  name: string;
  description: string;
  avatarUri: string;
  isPrivate: boolean;
  ownerId: string;
  rules: string;
  members: GroupMember[];
  messages: GroupMessage[];
  requests: JoinRequest[];
  announcements: GroupAnnouncement[];
  faqs: GroupFaq[];
  roles: GroupRole[];
  permissionRoles: PermissionRole[]; // real — from group_roles
  bans: GroupBan[]; // real — from group_bans
  kickRecords: GroupKickRecord[]; // real — from group_kicked_users
  moderationLog: ModerationLogEntry[]; // real — from group_moderation_log
  logs: GroupLog[]; // audit trail (president/staff only) — still local/mock
  createdAt: string;
};

export function getRole(group: Group, roleId: string): GroupRole | undefined {
  return group.roles.find((r) => r.id === roleId);
}
export function roleName(group: Group, roleId: string): string {
  return getRole(group, roleId)?.name ?? roleId;
}

// "RealName (BusinessName)", falling back gracefully when there's no real name on file.
export function displayName(name: string, realName?: string | null): string {
  return realName && realName.trim() && realName !== name ? `${realName} (${name})` : name;
}
export function memberRank(group: Group, member: GroupMember): number {
  return getRole(group, member.roleId)?.rank ?? 0;
}

// Fresh account — no groups exist yet. Real groups appear once owners create them (or the
// backend serves community groups). `defaultRoles` is used by GroupsContext when a group is made.
export const seedGroups: Group[] = [];
