import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ScreenHeader } from "../../../src/components/settings/ScreenHeader";
import { Avatar } from "../../../src/components/Avatar";
import { PrimaryButton } from "../../../src/components/PrimaryButton";
import { useGroups } from "../../../src/context/GroupsContext";
import { useRolePalette } from "../../../src/theme/useRolePalette";
import type { GroupMember } from "../../../src/data/groupsMock";

export default function TransferOwnership() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const palette = useRolePalette();
  const g = useGroups();
  const group = g.getGroup(id);

  const [target, setTarget] = useState<GroupMember | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!group) {
    return (
      <View className="flex-1 bg-bg"><ScreenHeader title="Give up ownership" /><View className="flex-1 items-center justify-center"><Text className="text-sm text-muted">Group not found.</Text></View></View>
    );
  }

  if (group.ownerId !== g.me.userId) {
    return (
      <View className="flex-1 bg-bg"><ScreenHeader title="Give up ownership" /><View className="flex-1 items-center justify-center px-8"><Text className="text-center text-sm text-muted">You're not this group's owner.</Text></View></View>
    );
  }

  const otherMembers = group.members.filter((m) => m.userId !== g.me.userId);

  const confirm = async () => {
    if (!target) return;
    setConfirming(true);
    setError(null);
    try {
      await g.transferOwnership(group.id, target.userId);
      router.replace(`/groups/${group.id}`);
    } catch {
      setConfirming(false);
      setError("Something went wrong transferring ownership. Try again.");
    }
  };

  if (target) {
    return (
      <View className="flex-1 bg-bg">
        <ScreenHeader title="Give up ownership" />
        <View className="flex-1 items-center px-8 pt-12">
          <View className="h-16 w-16 items-center justify-center rounded-2xl" style={{ backgroundColor: palette.danger + "22" }}>
            <Ionicons name="warning-outline" size={30} color={palette.danger} />
          </View>
          <Text className="mt-4 text-center text-xl font-bold text-text">
            Give up ownership to {target.name}?
          </Text>
          <Text className="mt-3 text-center text-sm leading-6 text-muted">
            {target.name} will become the group's president with full control, and you'll become a
            regular member. You cannot take this back after — {target.name} would have to transfer
            it back to you themselves.
          </Text>
          {error ? (
            <View className="mt-4 flex-row items-center gap-1.5">
              <Ionicons name="alert-circle" size={14} color={palette.danger} />
              <Text className="text-xs" style={{ color: palette.danger }}>{error}</Text>
            </View>
          ) : null}
          <View className="mt-8 w-full gap-3">
            <PrimaryButton label={`Yes, give ownership to ${target.name}`} onPress={confirm} loading={confirming} />
            <PrimaryButton label="Cancel" variant="outline" onPress={() => setTarget(null)} />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-bg">
      <ScreenHeader title="Give up ownership" />
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <Text className="mb-4 text-sm leading-6 text-muted">
          Pick who should become this group's new owner. This can't be undone from your side.
        </Text>
        {otherMembers.length === 0 ? (
          <Text className="text-sm text-muted">There's no one else in this group yet to hand it to.</Text>
        ) : (
          <View className="gap-2.5">
            {otherMembers.map((m) => (
              <Pressable key={m.userId} onPress={() => setTarget(m)} className="flex-row items-center gap-3 rounded-2xl border border-border bg-surface p-3.5 active:opacity-70">
                <Avatar uri={m.avatarUri} name={m.name} size={40} />
                <Text className="flex-1 text-sm font-semibold text-text">{m.name}</Text>
                <Ionicons name="chevron-forward" size={16} color={palette.muted} />
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
