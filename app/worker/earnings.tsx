import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { StatTile } from "../../src/components/StatTile";
import { Avatar } from "../../src/components/Avatar";
import { BarChart } from "../../src/components/BarChart";
import { EmptyState } from "../../src/components/EmptyState";
import { useRolePalette } from "../../src/theme/useRolePalette";
import { useJobs } from "../../src/context/JobsContext";
import { formatShortDate } from "../../src/lib/datetime";

export default function WorkerEarnings() {
  const insets = useSafeAreaInsets();
  const palette = useRolePalette();
  const { earnings, completed, weeklyEarnings } = useJobs();

  return (
    <ScrollView
      className="flex-1 bg-bg"
      contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 24, paddingBottom: 32 }}
      showsVerticalScrollIndicator={false}
    >
      <Text className="mb-6 text-2xl font-bold text-text">Earnings</Text>

      <LinearGradient
        colors={[palette.primary, palette.accent]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ borderRadius: 24, padding: 20 }}
      >
        <Text className="text-sm font-medium text-white/85">Cash collected this week</Text>
        <Text className="mt-1 text-4xl font-extrabold text-white">${earnings.thisWeek}</Text>
        <View className="mt-3 flex-row items-center gap-1.5">
          <Ionicons name="cash-outline" size={14} color="white" />
          <Text className="text-sm text-white/85">Totals update as you complete jobs</Text>
        </View>
      </LinearGradient>

      <View className="mt-4 flex-row gap-3">
        <StatTile icon="cash-outline" value={`$${earnings.thisWeek}`} label="This week" />
        <StatTile icon="calendar-clear-outline" value={`$${earnings.thisMonth}`} label="This month" />
        <StatTile icon="trophy-outline" value={`$${earnings.lifetime}`} label="Lifetime" />
      </View>

      <View className="mt-4 rounded-2xl border border-border bg-surface p-4">
        <Text className="mb-3 text-sm font-semibold text-text">Last 6 weeks</Text>
        <BarChart values={weeklyEarnings} labels={["5w", "4w", "3w", "2w", "1w", "Now"]} />
      </View>

      <Text className="mb-3 mt-7 text-sm font-semibold uppercase tracking-wider text-muted">
        Recent completed jobs
      </Text>
      {completed.length === 0 ? (
        <EmptyState icon="cash-outline" title="No completed jobs yet" subtitle="Your earnings will show here once you finish a job." />
      ) : (
        <View className="gap-3">
          {completed.map((job) => (
            <View
              key={job.id}
              className="flex-row items-center justify-between rounded-2xl border border-border bg-surface p-4"
            >
              <View className="flex-1 flex-row items-center gap-3">
                <Avatar uri={job.counterpartAvatar} name={job.counterpartName} size={36} />
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-text" numberOfLines={1}>{job.service}</Text>
                  <Text className="text-xs text-muted">
                    {job.counterpartName} · {formatShortDate(job.completedAt)}
                  </Text>
                </View>
              </View>
              <Text className="text-base font-bold text-text">${job.price}</Text>
            </View>
          ))}
        </View>
      )}

      <View className="mt-6 flex-row items-start gap-2 px-1">
        <Ionicons name="information-circle-outline" size={16} color={palette.muted} />
        <Text className="flex-1 text-xs leading-5 text-muted">
          SideKick doesn't process payments — clients pay you directly in cash when the job is
          done. These totals are self-tracked from your completed jobs, for your own records.
        </Text>
      </View>
    </ScrollView>
  );
}
