import { ScrollView, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ScreenHeader } from "../../../src/components/settings/ScreenHeader";
import { EmptyState } from "../../../src/components/EmptyState";
import { useGroups } from "../../../src/context/GroupsContext";
import { useRolePalette } from "../../../src/theme/useRolePalette";

export default function GroupLogs() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const palette = useRolePalette();
  const g = useGroups();
  const group = g.getGroup(id);

  if (!group) {
    return (
      <View className="flex-1 bg-bg"><ScreenHeader title="Activity log" /><View className="flex-1 items-center justify-center"><Text className="text-sm text-muted">Group not found.</Text></View></View>
    );
  }

  return (
    <View className="flex-1 bg-bg">
      <ScreenHeader title="Activity log" />
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <View className="mb-4 flex-row items-start gap-2 rounded-2xl border border-border bg-surface p-3">
          <Ionicons name="lock-closed-outline" size={15} color={palette.primary} />
          <Text className="flex-1 text-xs leading-5 text-muted">Only staff (president, VP, and roles with powers) can see this log of moderation actions.</Text>
        </View>

        {group.logs.length === 0 ? (
          <EmptyState icon="list-outline" title="Nothing logged yet" subtitle="Kicks, bans, role changes, accepted requests, and deleted messages will appear here." />
        ) : (
          <View className="gap-2.5">
            {group.logs.map((entry) => (
              <View key={entry.id} className="flex-row items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3">
                <View className="h-8 w-8 items-center justify-center rounded-full" style={{ backgroundColor: palette.primarySoft }}>
                  <Ionicons name="ellipse-outline" size={14} color={palette.primary} />
                </View>
                <Text className="flex-1 text-sm text-text">{entry.text}</Text>
                <Text className="text-xs text-muted">{entry.at}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
