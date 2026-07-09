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
  avatarUri: string;
  roleId: string;
  joinedAt: string;
};

export type GroupMessage = {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  text: string;
  time: string;
  edited?: boolean;
  deleted?: boolean;
};

export type JoinRequest = {
  userId: string;
  name: string;
  avatarUri: string;
  requestedAt: string;
};

export type GroupLog = { id: string; text: string; at: string };

export type Group = {
  id: string;
  name: string;
  description: string;
  avatarUri: string;
  isPrivate: boolean;
  ownerId: string;
  members: GroupMember[];
  messages: GroupMessage[];
  requests: JoinRequest[];
  roles: GroupRole[];
  bans: string[]; // userIds blocked from rejoining
  logs: GroupLog[]; // audit trail (president/staff only)
  createdAt: string;
};

export function getRole(group: Group, roleId: string): GroupRole | undefined {
  return group.roles.find((r) => r.id === roleId);
}
export function roleName(group: Group, roleId: string): string {
  return getRole(group, roleId)?.name ?? roleId;
}
export function memberRank(group: Group, member: GroupMember): number {
  return getRole(group, member.roleId)?.rank ?? 0;
}

// Fresh account — no groups exist yet. Real groups appear once owners create them (or the
// backend serves community groups). `defaultRoles` is used by GroupsContext when a group is made.
export const seedGroups: Group[] = [];
