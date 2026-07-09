import { Pressable, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ScreenHeader } from "../../../src/components/settings/ScreenHeader";
import { Avatar } from "../../../src/components/Avatar";
import { EmptyState } from "../../../src/components/EmptyState";
import { useGroups } from "../../../src/context/GroupsContext";
import { useRolePalette } from "../../../src/theme/useRolePalette";

export default function GroupRequests() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const palette = useRolePalette();
  const g = useGroups();
  const group = g.getGroup(id);

  if (!group) {
    return (
      <View className="flex-1 bg-bg"><ScreenHeader title="Join requests" /><View className="flex-1 items-center justify-center"><Text className="text-sm text-muted">Group not found.</Text></View></View>
    );
  }

  return (
    <View className="flex-1 bg-bg">
      <ScreenHeader title="Join requests" />
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {group.requests.length === 0 ? (
          <EmptyState icon="checkmark-done-outline" title="No pending requests" subtitle="When someone asks to join, they'll show up here for you to accept or decline." />
        ) : (
          <View className="gap-3">
            {group.requests.map((r) => (
              <View key={r.userId} className="rounded-2xl border border-border bg-surface p-4">
                <View className="flex-row items-center gap-3">
                  <Avatar uri={r.avatarUri} name={r.name} size={44} />
                  <View className="flex-1">
                    <Text className="text-sm font-semibold text-text">{r.name}</Text>
                    <Text className="text-xs text-muted">Requested {r.requestedAt}</Text>
                  </View>
                </View>
                <View className="mt-3 flex-row gap-2 border-t border-border pt-3">
                  <Pressable onPress={() => g.declineRequest(group.id, r.userId)} className="flex-1 flex-row items-center justify-center gap-1.5 rounded-xl border border-border py-2.5 active:opacity-70">
                    <Ionicons name="close" size={16} color={palette.danger} />
                    <Text className="text-sm font-semibold" style={{ color: palette.danger }}>Decline</Text>
                  </Pressable>
                  <Pressable onPress={() => g.acceptRequest(group.id, r.userId)} className="flex-1 flex-row items-center justify-center gap-1.5 rounded-xl py-2.5 active:opacity-80" style={{ backgroundColor: palette.success }}>
                    <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                    <Text className="text-sm font-semibold text-white">Accept</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
