import { Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Avatar } from "../../src/components/Avatar";
import { StatTile } from "../../src/components/StatTile";
import { SectionHeader } from "../../src/components/SectionHeader";
import { ServiceChip } from "../../src/components/ServiceChip";
import { Badge } from "../../src/components/Badge";
import { useRolePalette } from "../../src/theme/useRolePalette";
import { useWorkerData } from "../../src/context/WorkerDataContext";
import { useJobs } from "../../src/context/JobsContext";
import { formatServicePrice } from "../../src/data/workerMock";
import { formatWhen } from "../../src/lib/datetime";
import { streakTier } from "../../src/lib/streak";

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning,";
  if (h < 18) return "Good afternoon,";
  return "Good evening,";
}

export default function WorkerHome() {
  const router = useRouter();
  const palette = useRolePalette();
  const insets = useSafeAreaInsets();
  const { profile, services } = useWorkerData();
  const { earnings, rating, upcoming, requests, completed, streakWeeks } = useJobs();
  const activeServices = services.filter((service) => service.active);
  const nextJobs = upcoming.slice(0, 3);

  return (
    <ScrollView
      className="flex-1 bg-bg"
      contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 32 }}
      showsVerticalScrollIndicator={false}
    >
      <View className="flex-row items-center justify-between px-6">
        <View className="flex-row items-center gap-3">
          <Avatar uri={profile.avatarUri} name={profile.displayName} size={44} />
          <View>
            <Text className="text-sm text-muted">{profile.displayName ? greeting() : "Welcome to SideKick"}</Text>
            <Text className="text-lg font-bold text-text">{profile.displayName ? profile.displayName.split(" ")[0] : "Set up your profile"}</Text>
          </View>
        </View>
        <Pressable
          onPress={() => router.push("/worker/messages")}
          className="h-10 w-10 items-center justify-center rounded-full border border-border bg-surface"
        >
          <Ionicons name="chatbubbles-outline" size={18} color={palette.text} />
        </Pressable>
      </View>

      {streakWeeks >= 2
        ? (() => {
            const tier = streakTier(streakWeeks);
            return (
              <View className="mt-4 px-6">
                <View
                  className="flex-row items-center gap-2 rounded-2xl border px-4 py-2.5"
                  style={{ borderColor: tier.color + "55", backgroundColor: tier.color + "1A" }}
                >
                  <Ionicons name={tier.icon} size={18} color={tier.color} />
                  <Text className="flex-1 text-sm font-semibold text-text">
                    {streakWeeks}-week streak · {tier.label}
                  </Text>
                  <Text className="text-xs text-muted">Keep it going!</Text>
                </View>
              </View>
            );
          })()
        : null}

      <View className="mt-5 px-6">
        <Pressable onPress={() => router.push("/worker/earnings")}>
          <LinearGradient
            colors={[palette.primary, palette.accent]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ borderRadius: 24, padding: 20 }}
          >
            <Text className="text-sm font-medium text-white/85">This week's earnings</Text>
            <Text className="mt-1 text-4xl font-extrabold text-white">${earnings.thisWeek}</Text>
            <View className="mt-4 flex-row items-center justify-between">
              <Text className="text-sm text-white/85">{completed.length} jobs completed</Text>
              <View className="flex-row items-center gap-1">
                <Text className="text-sm font-semibold text-white">View earnings</Text>
                <Ionicons name="arrow-forward" size={14} color="white" />
              </View>
            </View>
          </LinearGradient>
        </Pressable>
      </View>

      <View className="mt-4 flex-row gap-3 px-6">
        <StatTile icon="star" value={rating.count ? rating.average.toFixed(1) : "—"} label={`Rating (${rating.count})`} />
        <StatTile icon="checkmark-done" value={String(completed.length)} label="Jobs done" />
        <StatTile icon="mail-unread" value={String(requests.length)} label="New requests" />
      </View>

      <View className="mt-7 px-6">
        <SectionHeader title="Upcoming jobs" actionLabel="See all" onAction={() => router.push("/worker/jobs")} />
        <View className="gap-3">
          {nextJobs.map((job) => (
            <View key={job.id} className="flex-row items-center gap-3 rounded-2xl border border-border bg-surface p-3.5">
              <Avatar uri={job.counterpartAvatar} name={job.counterpartName} size={44} />
              <View className="flex-1">
                <Text className="text-sm font-semibold text-text" numberOfLines={1}>{job.service}</Text>
                <Text className="text-xs text-muted">{job.counterpartName} · {formatWhen(job.scheduledAt)}</Text>
              </View>
              <Text className="text-sm font-bold text-text">{formatServicePrice(job.priceType, job.price)}</Text>
            </View>
          ))}
          {nextJobs.length === 0 ? (
            <Text className="text-sm text-muted">No upcoming jobs yet.</Text>
          ) : null}
          {requests.length > 0 ? (
            <Pressable
              onPress={() => router.push("/worker/jobs")}
              className="flex-row items-center justify-between rounded-2xl border border-border bg-primary-soft p-3.5 active:opacity-80"
            >
              <View className="flex-row items-center gap-2">
                <Ionicons name="mail-unread-outline" size={16} color={palette.primary} />
                <Text className="text-sm font-semibold text-text">
                  {requests.length} new job {requests.length === 1 ? "request" : "requests"}
                </Text>
              </View>
              <Badge label="Review" tone="primary" />
            </Pressable>
          ) : null}
        </View>
      </View>

      <View className="mt-7">
        <View className="px-6">
          <SectionHeader
            title="Your services"
            actionLabel="Manage"
            onAction={() => router.push("/settings/worker-services")}
          />
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 24, gap: 12 }}
        >
          {activeServices.map((service) => (
            <ServiceChip
              key={service.id}
              title={service.title}
              priceLabel={formatServicePrice(service.priceType, service.priceAmount)}
              photoUri={service.photoUri}
            />
          ))}
          <Pressable
            onPress={() => router.push("/settings/worker-services")}
            className="w-32 items-center justify-center rounded-2xl border border-dashed border-border py-8 active:opacity-70"
          >
            <Ionicons name="add-circle-outline" size={22} color={palette.muted} />
            <Text className="mt-1 text-xs font-medium text-muted">Add service</Text>
          </Pressable>
        </ScrollView>
      </View>
    </ScrollView>
  );
}
