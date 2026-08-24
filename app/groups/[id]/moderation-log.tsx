import { ScrollView, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ScreenHeader } from "../../../src/components/settings/ScreenHeader";
import { EmptyState } from "../../../src/components/EmptyState";
import { useGroups } from "../../../src/context/GroupsContext";
import { useRolePalette } from "../../../src/theme/useRolePalette";
import { displayName, type ModerationAction } from "../../../src/data/groupsMock";

const ACTION_LABEL: Record<ModerationAction, string> = {
  kick: "kicked",
  ban: "banned",
  mute: "muted",
  unban: "unbanned",
  unmute: "unmuted",
};

const ACTION_ICON: Record<ModerationAction, keyof typeof Ionicons.glyphMap> = {
  kick: "exit-outline",
  ban: "ban-outline",
  mute: "volume-mute-outline",
  unban: "checkmark-circle-outline",
  unmute: "volume-high-outline",
};

export default function GroupModerationLog() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const palette = useRolePalette();
  const g = useGroups();
  const group = g.getGroup(id);

  if (!group) {
    return (
      <View className="flex-1 bg-bg"><ScreenHeader title="Kick, ban & mute log" /><View className="flex-1 items-center justify-center"><Text className="text-sm text-muted">Group not found.</Text></View></View>
    );
  }

  const isOwner = group.ownerId === g.me.userId;
  const canView = isOwner || g.hasRealPower(group, "canKick") || g.hasRealPower(group, "canViewFlagged");
  if (!canView) {
    return (
      <View className="flex-1 bg-bg"><ScreenHeader title="Kick, ban & mute log" /><View className="flex-1 items-center justify-center px-8"><Text className="text-center text-sm text-muted">You don't have permission to view this.</Text></View></View>
    );
  }

  return (
    <View className="flex-1 bg-bg">
      <ScreenHeader title="Kick, ban & mute log" />
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {group.moderationLog.length === 0 ? (
          <EmptyState icon="shield-checkmark-outline" title="Nothing logged yet" subtitle="Kicks, bans, mutes, and their reversals will appear here." />
        ) : (
          <View className="gap-2.5">
            {group.moderationLog.map((entry) => (
              <View key={entry.id} className="rounded-2xl border border-border bg-surface p-3.5">
                <View className="flex-row items-center gap-3">
                  <View className="h-8 w-8 items-center justify-center rounded-full" style={{ backgroundColor: palette.primarySoft }}>
                    <Ionicons name={ACTION_ICON[entry.action]} size={14} color={palette.primary} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm text-text">
                      <Text className="font-semibold">{displayName(entry.actorName, entry.actorRealName)}</Text>
                      {` ${ACTION_LABEL[entry.action]} `}
                      <Text className="font-semibold">{displayName(entry.targetName, entry.targetRealName)}</Text>
                    </Text>
                    <Text className="text-xs text-muted">{entry.createdAt}</Text>
                  </View>
                </View>
                {entry.reason ? <Text className="mt-2 text-xs leading-5 text-muted">Reason: {entry.reason}</Text> : null}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
