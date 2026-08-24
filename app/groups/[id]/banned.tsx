import { Pressable, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { ScreenHeader } from "../../../src/components/settings/ScreenHeader";
import { useGroups } from "../../../src/context/GroupsContext";
import { displayName } from "../../../src/data/groupsMock";

function formatUntil(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export default function BannedMembers() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const g = useGroups();
  const group = g.getGroup(id);

  if (!group) {
    return (
      <View className="flex-1 bg-bg">
        <ScreenHeader title="Banned & muted members" />
        <View className="flex-1 items-center justify-center"><Text className="text-sm text-muted">Group not found.</Text></View>
      </View>
    );
  }

  if (group.ownerId !== g.me.userId) {
    return (
      <View className="flex-1 bg-bg">
        <ScreenHeader title="Banned & muted members" />
        <View className="flex-1 items-center justify-center px-8"><Text className="text-center text-sm text-muted">You're not this group's owner.</Text></View>
      </View>
    );
  }

  const mutedMembers = group.members.filter((m) => m.mutedUntil && new Date(m.mutedUntil).getTime() > Date.now());

  return (
    <View className="flex-1 bg-bg">
      <ScreenHeader title="Banned & muted members" />
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <Text className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">Banned</Text>
        {group.bans.length === 0 ? (
          <Text className="mb-6 text-sm text-muted">No one is banned from this group.</Text>
        ) : (
          <View className="mb-6 gap-2.5">
            {group.bans.map((b) => (
              <View key={b.userId} className="flex-row items-center gap-3 rounded-2xl border border-border bg-surface p-3.5">
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-text">{b.name}</Text>
                  <Text className="text-xs text-muted">Banned {b.bannedAt}</Text>
                </View>
                <Pressable onPress={() => g.unbanMember(group.id, b.userId)} className="rounded-xl border border-border px-3 py-2 active:opacity-70">
                  <Text className="text-xs font-semibold text-text">Unban</Text>
                </Pressable>
              </View>
            ))}
          </View>
        )}

        <Text className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">Muted</Text>
        {mutedMembers.length === 0 ? (
          <Text className="text-sm text-muted">No one is currently muted.</Text>
        ) : (
          <View className="gap-2.5">
            {mutedMembers.map((m) => (
              <View key={m.userId} className="flex-row items-center gap-3 rounded-2xl border border-border bg-surface p-3.5">
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-text">{displayName(m.name, m.realName)}</Text>
                  <Text className="text-xs text-muted">Muted until {formatUntil(m.mutedUntil as string)}</Text>
                </View>
                <Pressable onPress={() => g.unmuteMember(group.id, m.userId)} className="rounded-xl border border-border px-3 py-2 active:opacity-70">
                  <Text className="text-xs font-semibold text-text">Unmute</Text>
                </Pressable>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
