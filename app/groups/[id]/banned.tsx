import { Pressable, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ScreenHeader } from "../../../src/components/settings/ScreenHeader";
import { useGroups } from "../../../src/context/GroupsContext";

export default function BannedMembers() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const g = useGroups();
  const group = g.getGroup(id);

  if (!group) {
    return (
      <View className="flex-1 bg-bg">
        <ScreenHeader title="Banned members" />
        <View className="flex-1 items-center justify-center"><Text className="text-sm text-muted">Group not found.</Text></View>
      </View>
    );
  }

  if (group.ownerId !== g.me.userId) {
    return (
      <View className="flex-1 bg-bg">
        <ScreenHeader title="Banned members" />
        <View className="flex-1 items-center justify-center px-8"><Text className="text-center text-sm text-muted">You're not this group's owner.</Text></View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-bg">
      <ScreenHeader title="Banned members" />
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {group.bans.length === 0 ? (
          <Text className="text-sm text-muted">No one is banned from this group.</Text>
        ) : (
          <View className="gap-2.5">
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
      </ScrollView>
    </View>
  );
}
