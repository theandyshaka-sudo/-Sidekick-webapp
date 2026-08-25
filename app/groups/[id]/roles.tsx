import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ScreenHeader } from "../../../src/components/settings/ScreenHeader";
import { FormField } from "../../../src/components/FormField";
import { PrimaryButton } from "../../../src/components/PrimaryButton";
import { ToggleRow } from "../../../src/components/ToggleRow";
import { useGroups } from "../../../src/context/GroupsContext";
import { useRolePalette } from "../../../src/theme/useRolePalette";
import { NO_POWERS, type PermissionRole } from "../../../src/data/groupsMock";

// Every togglable power is real (group_roles-backed) now — nothing here is mock/local-only
// anymore. `rank` (hierarchy) is the only thing that still lives outside this table.
type RealPatch = Omit<PermissionRole, "id" | "name">;

const REAL_TOGGLES: Array<{ key: keyof RealPatch; label: string; desc: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { key: "canKick", label: "Mute, kick & ban", desc: "Act on any member — not just flagged-message senders", icon: "exit-outline" },
  { key: "canAnswerFaq", label: "Answer FAQs", desc: "See and answer pending questions before they're public", icon: "help-buoy-outline" },
  { key: "canViewFlagged", label: "View & act on flagged messages", desc: "See flagged chat messages and mute/kick/ban whoever sent them", icon: "flag-outline" },
  { key: "canAcceptRequests", label: "Manage join requests", desc: "Accept or decline people who ask to join", icon: "person-add-outline" },
  { key: "canEditGroup", label: "Edit group", desc: "Change the name, photo, description & privacy", icon: "create-outline" },
  { key: "canDeleteMessages", label: "Delete messages", desc: "Remove anyone's messages", icon: "trash-outline" },
  { key: "canAssignRoles", label: "Promote & demote", desc: "Change other members' roles", icon: "swap-vertical-outline" },
  { key: "canManageRoles", label: "Manage roles", desc: "Create, edit & delete roles and their powers", icon: "ribbon-outline" },
  { key: "canPostAnnouncements", label: "Post announcements", desc: "Broadcast posts to every member, and delete any announcement", icon: "megaphone-outline" },
  { key: "canEditRules", label: "Edit rules", desc: "Add, edit & delete the group's rules", icon: "list-outline" },
];

const NO_REAL_POWERS: RealPatch = {
  canKick: false, canAnswerFaq: false, canViewFlagged: false,
  canAcceptRequests: false, canEditGroup: false, canDeleteMessages: false, canAssignRoles: false, canManageRoles: false,
  canPostAnnouncements: false, canEditRules: false,
};

// One role = one card, every real switch it has, shown together.
function RoleCard({
  name,
  memberCount,
  real,
  onRealChange,
  onDelete,
}: {
  name: string;
  memberCount: number;
  real: RealPatch | null; // null = this legacy role (e.g. built-in Vice President) has no real
                           // group_roles counterpart — can't grant it any power from here.
  onRealChange: (patch: Partial<RealPatch>) => void;
  onDelete: () => void;
}) {
  const palette = useRolePalette();
  const [open, setOpen] = useState(false);
  const onCount = real ? Object.values(real).filter(Boolean).length : 0;
  return (
    <View className="rounded-2xl border border-border bg-surface">
      <Pressable onPress={() => setOpen((o) => !o)} className="flex-row items-center gap-3 p-4 active:opacity-70">
        <View className="h-9 w-9 items-center justify-center rounded-full" style={{ backgroundColor: palette.primarySoft }}>
          <Ionicons name="shield-checkmark" size={16} color={palette.primary} />
        </View>
        <View className="flex-1">
          <Text className="text-sm font-bold text-text">{name}</Text>
          <Text className="text-xs text-muted">{memberCount} member{memberCount === 1 ? "" : "s"} · {onCount === 0 ? "no powers" : `${onCount} power${onCount === 1 ? "" : "s"}`}</Text>
        </View>
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={18} color={palette.muted} />
      </Pressable>
      {open ? (
        <View className="border-t border-border p-4">
          {real ? (
            <View className="gap-2.5">
              {REAL_TOGGLES.map((t) => (
                <ToggleRow key={t.key} icon={t.icon} label={t.label} description={t.desc} value={real[t.key]} onValueChange={(v) => onRealChange({ [t.key]: v })} />
              ))}
            </View>
          ) : (
            <Text className="text-xs leading-5 text-muted">
              This role predates real permissions and can't be granted any power here — delete it and create a new role instead.
            </Text>
          )}
          <Pressable onPress={onDelete} className="mt-4 flex-row items-center justify-center gap-1.5 rounded-xl border border-border py-2.5 active:opacity-70">
            <Ionicons name="trash-outline" size={15} color={palette.danger} />
            <Text className="text-sm font-semibold" style={{ color: palette.danger }}>Delete role</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

export default function GroupRoles() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const g = useGroups();
  const palette = useRolePalette();
  const group = g.getGroup(id);

  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newReal, setNewReal] = useState<RealPatch>({ ...NO_REAL_POWERS });
  const [error, setError] = useState<string | null>(null);

  if (!group) {
    return (
      <View className="flex-1 bg-bg"><ScreenHeader title="Roles & permissions" /><View className="flex-1 items-center justify-center"><Text className="text-sm text-muted">Group not found.</Text></View></View>
    );
  }

  const editableRoles = [...group.roles].filter((r) => r.id !== "president" && r.id !== "member").sort((a, b) => b.rank - a.rank);

  const createRole = () => {
    if (!newName.trim()) return setError("Name your new role.");
    g.createUnifiedRole(group.id, newName.trim(), { ...NO_POWERS }, newReal);
    setCreating(false);
    setNewName("");
    setNewReal({ ...NO_REAL_POWERS });
    setError(null);
  };

  return (
    <View className="flex-1 bg-bg">
      <ScreenHeader title="Roles & permissions" />
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <Text className="mb-4 text-sm leading-6 text-muted">
          Tap a role to turn its powers on or off. Assign a member to one from their name in the Members tab.
        </Text>

        <View className="gap-3">
          <View className="rounded-2xl border border-border bg-surface p-4">
            <View className="mb-1 flex-row items-center gap-3">
              <View className="h-9 w-9 items-center justify-center rounded-full" style={{ backgroundColor: palette.primary }}>
                <Ionicons name="shield-checkmark" size={16} color={palette.primaryFg} />
              </View>
              <Text className="text-sm font-bold text-text">President</Text>
            </View>
            <Text className="text-xs leading-5 text-muted">The president always has every power. This role can't be changed.</Text>
          </View>
          <View className="rounded-2xl border border-border bg-surface p-4">
            <View className="mb-1 flex-row items-center gap-3">
              <View className="h-9 w-9 items-center justify-center rounded-full" style={{ backgroundColor: palette.primarySoft }}>
                <Ionicons name="shield-checkmark" size={16} color={palette.primary} />
              </View>
              <Text className="text-sm font-bold text-text">Member</Text>
            </View>
            <Text className="text-xs leading-5 text-muted">Everyone who joins starts as a Member. The base role has no powers and can't be edited.</Text>
          </View>

          {editableRoles.map((role) => {
            const found = group.permissionRoles.find((r) => r.id === role.id) ?? null;
            const real: RealPatch | null = found ? {
              canKick: found.canKick, canAnswerFaq: found.canAnswerFaq, canViewFlagged: found.canViewFlagged,
              canAcceptRequests: found.canAcceptRequests, canEditGroup: found.canEditGroup, canDeleteMessages: found.canDeleteMessages,
              canAssignRoles: found.canAssignRoles, canManageRoles: found.canManageRoles,
              canPostAnnouncements: found.canPostAnnouncements, canEditRules: found.canEditRules,
            } : null;
            return (
              <RoleCard
                key={role.id}
                name={role.name}
                memberCount={group.members.filter((m) => m.roleId === role.id).length}
                real={real}
                onRealChange={(patch) => g.updatePermissionRole(group.id, role.id, patch)}
                onDelete={() => g.deleteUnifiedRole(group.id, role.id)}
              />
            );
          })}
        </View>

        {creating ? (
          <View className="mt-5 rounded-2xl border-2 border-primary bg-surface p-4">
            <Text className="mb-3 text-sm font-bold text-text">New role</Text>
            <FormField label="Role name" value={newName} onChangeText={(t) => { setNewName(t); setError(null); }} placeholder="Elder" error={error ?? undefined} />
            <View className="gap-2.5">
              {REAL_TOGGLES.map((t) => (
                <ToggleRow key={t.key} icon={t.icon} label={t.label} description={t.desc} value={newReal[t.key]} onValueChange={(v) => setNewReal((prev) => ({ ...prev, [t.key]: v }))} />
              ))}
            </View>
            <View className="mt-4 flex-row gap-2">
              <View className="flex-1"><PrimaryButton label="Cancel" variant="outline" onPress={() => { setCreating(false); setError(null); }} /></View>
              <View className="flex-1"><PrimaryButton label="Create" onPress={createRole} /></View>
            </View>
          </View>
        ) : (
          <Pressable onPress={() => setCreating(true)} className="mt-5 flex-row items-center justify-center gap-1.5 rounded-2xl border border-dashed border-border py-3.5 active:opacity-70">
            <Ionicons name="add-circle-outline" size={18} color={palette.primary} />
            <Text className="text-sm font-semibold text-primary">Create a role</Text>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}
