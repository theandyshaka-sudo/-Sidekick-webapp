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
import { NO_POWERS, POWERS, type GroupRole, type PowerKey, type Powers } from "../../../src/data/groupsMock";

const POWER_ICON: Record<PowerKey, keyof typeof Ionicons.glyphMap> = {
  acceptRequests: "person-add-outline",
  editGroup: "create-outline",
  deleteMessages: "trash-outline",
  kick: "exit-outline",
  ban: "ban-outline",
  assignRoles: "swap-vertical-outline",
  manageRoles: "ribbon-outline",
};

function powerSummary(role: GroupRole): string {
  const on = Object.values(role.powers).filter(Boolean).length;
  if (role.id === "president" || on === POWERS.length) return "All powers";
  if (on === 0) return "No powers";
  return `${on} power${on === 1 ? "" : "s"}`;
}

export default function GroupRoles() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const palette = useRolePalette();
  const g = useGroups();
  const group = g.getGroup(id);

  const [expanded, setExpanded] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPowers, setNewPowers] = useState<Powers>({ ...NO_POWERS });
  const [error, setError] = useState<string | null>(null);

  if (!group) {
    return (
      <View className="flex-1 bg-bg"><ScreenHeader title="Roles & permissions" /><View className="flex-1 items-center justify-center"><Text className="text-sm text-muted">Group not found.</Text></View></View>
    );
  }

  const roles = [...group.roles].sort((a, b) => b.rank - a.rank);

  const createRole = () => {
    if (!newName.trim()) return setError("Name your new role.");
    g.createRole(group.id, newName.trim(), newPowers);
    setCreating(false);
    setNewName("");
    setNewPowers({ ...NO_POWERS });
    setError(null);
  };

  return (
    <View className="flex-1 bg-bg">
      <ScreenHeader title="Roles & permissions" />
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <Text className="mb-4 text-sm leading-6 text-muted">
          Tap a role to turn its powers on or off. Create custom roles (like "Elder") with exactly the powers you want.
        </Text>

        <View className="gap-3">
          {roles.map((role) => {
            const open = expanded === role.id;
            const deletable = !role.locked && role.id !== "vp"; // custom roles only
            return (
              <View key={role.id} className="rounded-2xl border border-border bg-surface">
                <Pressable onPress={() => setExpanded(open ? null : role.id)} className="flex-row items-center gap-3 p-4 active:opacity-70">
                  <View className="h-9 w-9 items-center justify-center rounded-full" style={{ backgroundColor: role.id === "president" ? palette.primary : palette.primarySoft }}>
                    <Ionicons name="shield-checkmark" size={16} color={role.id === "president" ? palette.primaryFg : palette.primary} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-bold text-text">{role.name}</Text>
                    <Text className="text-xs text-muted">{powerSummary(role)}</Text>
                  </View>
                  <Ionicons name={open ? "chevron-up" : "chevron-down"} size={18} color={palette.muted} />
                </Pressable>

                {open ? (
                  <View className="border-t border-border p-4">
                    {role.id === "president" ? (
                      <Text className="text-xs leading-5 text-muted">The president always has every power. This role can't be changed.</Text>
                    ) : role.id === "member" ? (
                      <Text className="text-xs leading-5 text-muted">Everyone who joins starts as a Member. The base role has no powers and can't be edited.</Text>
                    ) : (
                      <>
                        <View className="gap-2.5">
                          {POWERS.map((p) => (
                            <ToggleRow
                              key={p.key}
                              icon={POWER_ICON[p.key]}
                              label={p.label}
                              description={p.desc}
                              value={role.powers[p.key]}
                              onValueChange={(v) => g.updateRole(group.id, role.id, { powers: { ...role.powers, [p.key]: v } })}
                            />
                          ))}
                        </View>
                        {deletable ? (
                          <Pressable onPress={() => { g.deleteRole(group.id, role.id); setExpanded(null); }} className="mt-4 flex-row items-center justify-center gap-1.5 rounded-xl border border-border py-2.5 active:opacity-70">
                            <Ionicons name="trash-outline" size={15} color={palette.danger} />
                            <Text className="text-sm font-semibold" style={{ color: palette.danger }}>Delete role</Text>
                          </Pressable>
                        ) : null}
                      </>
                    )}
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>

        {creating ? (
          <View className="mt-5 rounded-2xl border-2 border-primary bg-surface p-4">
            <Text className="mb-3 text-sm font-bold text-text">New role</Text>
            <FormField label="Role name" value={newName} onChangeText={(t) => { setNewName(t); setError(null); }} placeholder="Elder" error={error ?? undefined} />
            <View className="gap-2.5">
              {POWERS.map((p) => (
                <ToggleRow key={p.key} icon={POWER_ICON[p.key]} label={p.label} description={p.desc} value={newPowers[p.key]} onValueChange={(v) => setNewPowers((prev) => ({ ...prev, [p.key]: v }))} />
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
