import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ScreenHeader } from "../../../src/components/settings/ScreenHeader";
import { ActionSheet, type ActionSheetOption } from "../../../src/components/ActionSheet";
import { useGroups } from "../../../src/context/GroupsContext";
import { useMessages } from "../../../src/context/MessagesContext";
import { useRolePalette } from "../../../src/theme/useRolePalette";
import type { ReportReason } from "../../../src/data/messagesMock";

const REPORT_REASONS: Array<{ reason: ReportReason; label: string }> = [
  { reason: "harassment", label: "Harassment or bullying" },
  { reason: "spam", label: "Spam or scam" },
  { reason: "inappropriate", label: "Inappropriate content" },
  { reason: "safety", label: "Safety concern" },
  { reason: "other", label: "Something else" },
];

function Row({ icon, label, sub, onPress, danger, badge, dot }: {
  icon: keyof typeof Ionicons.glyphMap; label: string; sub?: string; onPress: () => void; danger?: boolean; badge?: number; dot?: boolean;
}) {
  const palette = useRolePalette();
  return (
    <Pressable onPress={onPress} className="flex-row items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3.5 active:opacity-70">
      <View>
        <Ionicons name={icon} size={18} color={danger ? palette.danger : palette.text} />
        {dot ? <View className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full" style={{ backgroundColor: palette.danger }} /> : null}
      </View>
      <View className="flex-1">
        <Text className="text-sm font-medium" style={{ color: danger ? palette.danger : palette.text }}>{label}</Text>
        {sub ? <Text className="text-xs text-muted">{sub}</Text> : null}
      </View>
      {badge != null && badge > 0 ? (
        <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: palette.primary }}>
          <Text className="text-[11px] font-bold" style={{ color: palette.primaryFg }}>{badge}</Text>
        </View>
      ) : null}
      {!danger ? <Ionicons name="chevron-forward" size={18} color={palette.muted} /> : null}
    </Pressable>
  );
}

export default function GroupSettings() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const palette = useRolePalette();
  const g = useGroups();
  const { fileReport } = useMessages();
  const [reportOpen, setReportOpen] = useState(false);

  const group = g.getGroup(id);
  if (!group) {
    return (
      <View className="flex-1 bg-bg">
        <ScreenHeader title="Group settings" />
        <View className="flex-1 items-center justify-center"><Text className="text-sm text-muted">Group not found.</Text></View>
      </View>
    );
  }

  const reportOptions: ActionSheetOption[] = REPORT_REASONS.map((r) => ({
    label: r.label,
    onPress: () => fileReport({ reportedName: group.name, reason: r.reason, context: `Group: ${group.name}` }),
  }));

  return (
    <View className="flex-1 bg-bg">
      <ScreenHeader title={group.name} />
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <Text className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">Manage</Text>
        <View className="gap-2.5">
          {g.can(group, "acceptRequests") ? (
            <Row icon="person-add-outline" label="Join requests" sub="Accept or decline people who want in"
              badge={group.requests.length} dot={group.requests.length > 0}
              onPress={() => router.push(`/groups/${group.id}/requests`)} />
          ) : null}
          {g.can(group, "editGroup") ? (
            <Row icon="create-outline" label="Edit group" sub="Name, photo, description & privacy" onPress={() => router.push(`/groups/${group.id}/edit`)} />
          ) : null}
          {g.can(group, "manageRoles") ? (
            <Row icon="ribbon-outline" label="Roles & permissions" sub="Create roles and toggle their powers" onPress={() => router.push(`/groups/${group.id}/roles`)} />
          ) : null}
          {g.isStaff(group) ? (
            <Row icon="list-outline" label="Activity log" sub="Recent kicks, bans, role changes & more" onPress={() => router.push(`/groups/${group.id}/logs`)} />
          ) : null}
        </View>

        {!g.isStaff(group) ? (
          <View className="mt-4 flex-row items-start gap-2 rounded-2xl border border-border bg-surface p-4">
            <Ionicons name="people-outline" size={16} color={palette.muted} />
            <Text className="flex-1 text-xs leading-5 text-muted">You're a member of this group. The president can grant you powers like managing requests or roles.</Text>
          </View>
        ) : null}

        <Text className="mb-3 mt-7 text-xs font-semibold uppercase tracking-wider text-muted">Group</Text>
        <View className="gap-2.5">
          <Row icon="flag-outline" label="Report group" danger onPress={() => setReportOpen(true)} />
          <Row icon="exit-outline" label="Leave group" danger onPress={() => { g.leaveGroup(group.id); router.replace("/worker/groups"); }} />
        </View>
      </ScrollView>

      <ActionSheet visible={reportOpen} title={`Report ${group.name} for…`} options={reportOptions} onClose={() => setReportOpen(false)} />
    </View>
  );
}
