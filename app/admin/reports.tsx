import { useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AdminHeader } from "../../src/components/AdminHeader";
import { Badge } from "../../src/components/Badge";
import { ActionSheet, type ActionSheetOption } from "../../src/components/ActionSheet";
import { useMessages } from "../../src/context/MessagesContext";
import { useRolePalette } from "../../src/theme/useRolePalette";
import { useThemeVars } from "../../src/theme/useThemeVars";
import type { PlatformReport, ReportReason } from "../../src/data/messagesMock";

const REASON_LABEL: Record<ReportReason, string> = {
  harassment: "Harassment",
  spam: "Spam",
  inappropriate: "Inappropriate",
  scam: "Scam",
  safety: "Safety",
  other: "Other",
};

const BAN_DURATIONS: Array<{ label: string; hours: number }> = [
  { label: "12 hours", hours: 12 },
  { label: "1 day", hours: 24 },
  { label: "1 week", hours: 168 },
  { label: "1 month", hours: 720 },
  { label: "Permanent", hours: Infinity },
];

function StatBox({ icon, value, label }: { icon: keyof typeof Ionicons.glyphMap; value: string; label: string }) {
  const palette = useRolePalette();
  return (
    <View className="flex-1 rounded-2xl border border-border bg-surface p-4">
      <View className="mb-2 h-8 w-8 items-center justify-center rounded-full bg-primary-soft">
        <Ionicons name={icon} size={16} color={palette.primary} />
      </View>
      <Text className="text-xl font-bold text-text">{value}</Text>
      <Text className="mt-0.5 text-xs text-muted">{label}</Text>
    </View>
  );
}

function TranscriptModal({ report, onClose }: { report: PlatformReport | null; onClose: () => void }) {
  const palette = useRolePalette();
  const themeVars = useThemeVars();
  return (
    <Modal visible={report != null} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 justify-end bg-black/40" style={themeVars} onPress={onClose}>
        <Pressable className="rounded-t-3xl px-5 pb-8 pt-4" style={{ backgroundColor: palette.surface, maxHeight: "80%" }} onPress={(e) => e.stopPropagation()}>
          <View className="mb-1 flex-row items-center justify-between">
            <Text className="text-lg font-bold text-text">Reported chat</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={22} color={palette.muted} />
            </Pressable>
          </View>
          {report ? (
            <>
              <Text className="mb-4 text-xs text-muted">
                {report.reportedName} · {report.context} · reported for {REASON_LABEL[report.reason].toLowerCase()}
              </Text>
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 8 }}>
                {report.messages.map((m, i) => (
                  <View
                    key={i}
                    className="max-w-[85%] rounded-2xl px-4 py-2.5"
                    style={{
                      alignSelf: m.fromReported ? "flex-start" : "flex-end",
                      backgroundColor: m.fromReported ? palette.danger + "22" : palette.primarySoft,
                    }}
                  >
                    <Text className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider" style={{ color: m.fromReported ? palette.danger : palette.primary }}>
                      {m.fromReported ? report.reportedName : report.reporterName}
                    </Text>
                    <Text className="text-sm text-text">{m.text}</Text>
                    <Text className="mt-1 text-[10px] text-muted">{m.time}</Text>
                  </View>
                ))}
                {report.messages.length === 0 ? <Text className="text-sm text-muted">No messages on record.</Text> : null}
              </ScrollView>
            </>
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function ReportCard({ report, onViewMessages, onBan }: { report: PlatformReport; onViewMessages: () => void; onBan: () => void }) {
  const palette = useRolePalette();
  const { unbanMessaging, banStatus, setReportStatus } = useMessages();
  const ban = banStatus(report.reportedName);
  const resolved = report.status !== "open";

  return (
    <View className="rounded-2xl border border-border bg-surface p-4" style={{ opacity: resolved ? 0.6 : 1 }}>
      <View className="mb-2 flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <Badge label={REASON_LABEL[report.reason]} tone={report.reason === "safety" || report.reason === "harassment" ? "danger" : "primary"} />
          {report.status === "resolved" ? <Badge label="Resolved" tone="success" /> : null}
          {report.status === "dismissed" ? <Badge label="Dismissed" tone="muted" /> : null}
        </View>
        <Text className="text-xs text-muted">{report.time}</Text>
      </View>
      <View className="flex-row items-center gap-2">
        <Ionicons name="person-circle-outline" size={16} color={palette.muted} />
        <Text className="flex-1 text-sm text-text">
          <Text className="font-semibold">{report.reporterName}</Text>
          <Text className="text-muted"> ({report.reporterRole}) reported </Text>
          <Text className="font-semibold">{report.reportedName}</Text>
        </Text>
      </View>
      <View className="mt-1.5 flex-row items-center gap-3">
        <View className="flex-row items-center gap-1">
          <Ionicons name="briefcase-outline" size={12} color={palette.muted} />
          <Text className="text-xs text-muted">{report.context}</Text>
        </View>
        {report.blocked ? (
          <View className="flex-row items-center gap-1">
            <Ionicons name="ban" size={12} color={palette.danger} />
            <Text className="text-xs" style={{ color: palette.danger }}>Blocked by reporter</Text>
          </View>
        ) : null}
      </View>

      <View className="mt-3 flex-row gap-2 border-t border-border pt-3">
        <Pressable onPress={onViewMessages} className="flex-1 flex-row items-center justify-center gap-1.5 rounded-xl border border-border py-2.5 active:opacity-70">
          <Ionicons name="chatbubble-ellipses-outline" size={14} color={palette.text} />
          <Text className="text-xs font-semibold text-text">View messages</Text>
        </Pressable>
        {ban.banned ? (
          <Pressable onPress={() => unbanMessaging(report.reportedName)} className="flex-1 flex-row items-center justify-center gap-1.5 rounded-xl border border-border py-2.5 active:opacity-70">
            <Ionicons name="alarm-outline" size={14} color={palette.danger} />
            <Text className="text-xs font-semibold" style={{ color: palette.danger }}>Banned · {ban.label} · Lift</Text>
          </Pressable>
        ) : (
          <Pressable onPress={onBan} className="flex-1 flex-row items-center justify-center gap-1.5 rounded-xl py-2.5 active:opacity-80" style={{ backgroundColor: palette.danger }}>
            <Ionicons name="ban" size={14} color="#FFFFFF" />
            <Text className="text-xs font-semibold text-white">Ban messaging</Text>
          </Pressable>
        )}
      </View>

      {resolved ? (
        <Pressable onPress={() => setReportStatus(report.id, "open")} className="mt-2 items-center rounded-xl border border-border py-2 active:opacity-70">
          <Text className="text-xs font-semibold text-muted">Reopen</Text>
        </Pressable>
      ) : (
        <View className="mt-2 flex-row gap-2">
          <Pressable onPress={() => setReportStatus(report.id, "resolved")} className="flex-1 flex-row items-center justify-center gap-1.5 rounded-xl border border-border py-2 active:opacity-70">
            <Ionicons name="checkmark-circle-outline" size={14} color={palette.success} />
            <Text className="text-xs font-semibold" style={{ color: palette.success }}>Resolve</Text>
          </Pressable>
          <Pressable onPress={() => setReportStatus(report.id, "dismissed")} className="flex-1 flex-row items-center justify-center gap-1.5 rounded-xl border border-border py-2 active:opacity-70">
            <Ionicons name="close-circle-outline" size={14} color={palette.muted} />
            <Text className="text-xs font-semibold text-muted">Dismiss</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

export default function DeveloperReports() {
  const palette = useRolePalette();
  const { getAllReports, banMessaging } = useMessages();
  const reports = getAllReports();
  const [transcript, setTranscript] = useState<PlatformReport | null>(null);
  const [banFor, setBanFor] = useState<PlatformReport | null>(null);
  const [filter, setFilter] = useState<"open" | "all">("open");

  const stats = useMemo(() => {
    const open = reports.filter((r) => r.status === "open").length;
    const byReason = reports.reduce<Record<string, number>>((acc, r) => {
      acc[r.reason] = (acc[r.reason] ?? 0) + 1;
      return acc;
    }, {});
    const topReason = Object.entries(byReason).sort((a, b) => b[1] - a[1])[0];
    return { total: reports.length, open, topReason: topReason ? REASON_LABEL[topReason[0] as ReportReason] : "—" };
  }, [reports]);

  const visibleReports = filter === "open" ? reports.filter((r) => r.status === "open") : reports;

  const banOptions: ActionSheetOption[] = banFor
    ? BAN_DURATIONS.map((d) => ({
        label: d.label,
        destructive: d.hours === Infinity,
        onPress: () => banMessaging(banFor.reportedName, d.hours),
      }))
    : [];

  return (
    <View className="flex-1 bg-bg">
      <AdminHeader title="Reports" />
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <View className="mb-5 flex-row items-center gap-2 rounded-2xl border border-border bg-surface p-3">
          <Ionicons name="shield-checkmark" size={18} color={palette.primary} />
          <Text className="flex-1 text-xs text-muted">
            Internal moderation console — reports submitted across SideKick, including any filed this session.
          </Text>
        </View>

        <View className="mb-6 flex-row gap-3">
          <StatBox icon="flag" value={String(stats.open)} label="Open reports" />
          <StatBox icon="albums-outline" value={String(stats.total)} label="Total reports" />
          <StatBox icon="trending-up" value={stats.topReason} label="Top reason" />
        </View>

        <View className="mb-3 flex-row items-center justify-between">
          <Text className="text-sm font-semibold uppercase tracking-wider text-muted">Submitted reports</Text>
          <View className="flex-row rounded-full border border-border bg-surface p-0.5">
            {(["open", "all"] as const).map((f) => {
              const active = filter === f;
              return (
                <Pressable
                  key={f}
                  onPress={() => setFilter(f)}
                  className="rounded-full px-3 py-1"
                  style={{ backgroundColor: active ? palette.primary : "transparent" }}
                >
                  <Text className="text-xs font-semibold" style={{ color: active ? palette.primaryFg : palette.muted }}>
                    {f === "open" ? "Open" : "All"}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View className="gap-3">
          {visibleReports.map((report) => (
            <ReportCard
              key={report.id}
              report={report}
              onViewMessages={() => setTranscript(report)}
              onBan={() => setBanFor(report)}
            />
          ))}
          {visibleReports.length === 0 ? (
            <Text className="text-sm text-muted">
              {filter === "open" ? "No open reports — all clear." : "No reports submitted."}
            </Text>
          ) : null}
        </View>
      </ScrollView>

      <TranscriptModal report={transcript} onClose={() => setTranscript(null)} />
      <ActionSheet
        visible={banFor != null}
        title={banFor ? `Ban ${banFor.reportedName} from messaging for…` : ""}
        options={banOptions}
        onClose={() => setBanFor(null)}
      />
    </View>
  );
}
