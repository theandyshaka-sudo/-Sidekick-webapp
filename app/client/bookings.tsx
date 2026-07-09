import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Avatar } from "../../src/components/Avatar";
import { Badge } from "../../src/components/Badge";
import { PrimaryButton } from "../../src/components/PrimaryButton";
import { StarRating } from "../../src/components/StarRating";
import { Calendar, type CalendarEvent } from "../../src/components/Calendar";
import { EmptyState } from "../../src/components/EmptyState";
import { useRolePalette } from "../../src/theme/useRolePalette";
import { useJobs } from "../../src/context/JobsContext";
import { useMessages } from "../../src/context/MessagesContext";
import { formatWhen, dateKey } from "../../src/lib/datetime";
import type { Job } from "../../src/data/jobsMock";

function BookingCard({ job }: { job: Job }) {
  const palette = useRolePalette();
  const router = useRouter();
  const { confirmCash, rateJob } = useJobs();
  const { ensureConversation } = useMessages();
  const [pendingRating, setPendingRating] = useState(0);
  const [reviewText, setReviewText] = useState("");

  const openChat = () => {
    const id = ensureConversation(job.counterpartName, job.counterpartAvatar, job.service);
    router.push(`/chat/${id}`);
  };

  return (
    <View className="rounded-2xl border border-border bg-surface p-4">
      <View className="flex-row items-center gap-3">
        <Avatar uri={job.counterpartAvatar} name={job.counterpartName} size={44} />
        <View className="flex-1">
          <Text className="text-sm font-semibold text-text" numberOfLines={1}>{job.service}</Text>
          <Text className="text-xs text-muted">
            {job.counterpartName} · {job.status === "requested" ? "Awaiting a time" : formatWhen(job.scheduledAt)}
          </Text>
        </View>
        <View className="items-end gap-1">
          <Text className="text-base font-bold text-text">${job.price}</Text>
          {job.status === "requested" ? <Badge label="Requested" tone="primary" /> : null}
          {job.status === "scheduled" ? <Badge label="Scheduled" tone="muted" /> : null}
          {job.status === "completed" ? <Badge label="Completed" tone="success" /> : null}
        </View>
      </View>

      {job.status === "requested" ? (
        <View className="mt-3 border-t border-border pt-3">
          <View className="mb-2 flex-row items-start gap-2">
            <Ionicons name="chatbubble-ellipses-outline" size={14} color={palette.muted} />
            <Text className="flex-1 text-xs leading-5 text-muted">
              Message {job.counterpartName} to agree on a time. One of you sends a time offer to lock it in.
            </Text>
          </View>
          <PrimaryButton label="Message" variant="outline" onPress={openChat} />
        </View>
      ) : null}

      {job.status === "scheduled" ? (
        <View className="mt-3 border-t border-border pt-3">
          <PrimaryButton label="Message" variant="outline" onPress={openChat} />
        </View>
      ) : null}

      {job.status === "completed" && !job.cashConfirmed ? (
        <View className="mt-3 border-t border-border pt-3">
          <View className="mb-2 flex-row items-start gap-2">
            <Ionicons name="cash-outline" size={14} color={palette.muted} />
            <Text className="flex-1 text-xs leading-5 text-muted">
              Pay {job.counterpartName} directly in cash, then confirm it here.
            </Text>
          </View>
          <PrimaryButton label="I paid in cash" onPress={() => confirmCash(job.id)} />
        </View>
      ) : null}

      {job.status === "completed" && job.cashConfirmed && job.rating == null ? (
        <View className="mt-3 border-t border-border pt-3">
          <Text className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Rate this job</Text>
          <StarRating value={pendingRating} onChange={setPendingRating} />
          <TextInput
            value={reviewText}
            onChangeText={setReviewText}
            placeholder="Add a review (optional)"
            placeholderTextColor={palette.muted}
            multiline
            style={{ color: palette.text, minHeight: 44 }}
            className="mt-3 rounded-xl border border-border bg-bg px-3 py-2 text-sm"
          />
          <View className="mt-3 items-end">
            <PrimaryButton label="Submit review" disabled={pendingRating === 0} onPress={() => rateJob(job.id, pendingRating, reviewText)} />
          </View>
        </View>
      ) : null}

      {job.status === "completed" && job.rating != null ? (
        <View className="mt-3 border-t border-border pt-3">
          <View className="flex-row items-center gap-1.5">
            <Ionicons name="checkmark-circle" size={14} color={palette.success} />
            <Text className="text-xs text-muted">You rated this job {job.rating} stars</Text>
          </View>
          {job.reviewText ? <Text className="mt-1 text-xs italic text-muted">"{job.reviewText}"</Text> : null}
        </View>
      ) : null}
    </View>
  );
}

const GROUPS: Array<{ title: string; statuses: Job["status"][] }> = [
  { title: "Needs a time", statuses: ["requested"] },
  { title: "Upcoming", statuses: ["scheduled"] },
  { title: "Completed", statuses: ["completed"] },
];

export default function ClientBookings() {
  const insets = useSafeAreaInsets();
  const palette = useRolePalette();
  const { jobs, upcoming, completed } = useJobs();
  const [view, setView] = useState<"list" | "calendar">("list");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const events: CalendarEvent[] = [...upcoming, ...completed]
    .filter((j) => j.scheduledAt || j.completedAt)
    .map((j) => ({ id: j.id, iso: (j.scheduledAt ?? j.completedAt) as string, title: j.service, past: j.status === "completed" }));

  const dayJobs = selectedKey
    ? [...upcoming, ...completed].filter((j) => {
        const iso = j.scheduledAt ?? j.completedAt;
        return iso && dateKey(iso) === selectedKey;
      })
    : [];

  return (
    <View className="flex-1 bg-bg">
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 24, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        <Text className="mb-5 text-2xl font-bold text-text">Bookings</Text>

        <View className="mb-5 flex-row rounded-2xl border border-border bg-surface p-1">
          {(["list", "calendar"] as const).map((v) => (
            <Pressable
              key={v}
              onPress={() => setView(v)}
              className="flex-1 items-center rounded-xl py-2"
              style={{ backgroundColor: view === v ? palette.primary : "transparent" }}
            >
              <Text className="text-sm font-semibold" style={{ color: view === v ? palette.primaryFg : palette.muted }}>
                {v === "list" ? "List" : "Calendar"}
              </Text>
            </Pressable>
          ))}
        </View>

        {view === "list" ? (
          <>
            {GROUPS.map((group) => {
              const groupJobs = jobs.filter((j) => group.statuses.includes(j.status));
              if (groupJobs.length === 0) return null;
              return (
                <View key={group.title} className="mb-6">
                  <Text className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">{group.title}</Text>
                  <View className="gap-3">
                    {groupJobs.map((job) => (
                      <BookingCard key={job.id} job={job} />
                    ))}
                  </View>
                </View>
              );
            })}
            {jobs.filter((j) => j.status !== "declined").length === 0 ? (
              <EmptyState icon="calendar-outline" title="No bookings yet" subtitle="Find a business owner from Discover to get started." />
            ) : null}
          </>
        ) : (
          <>
            <Calendar events={events} selectedKey={selectedKey} onSelectDay={(key) => setSelectedKey(key)} />
            <View className="mt-4 gap-3">
              {selectedKey && dayJobs.length === 0 ? <Text className="text-sm text-muted">No bookings on this day.</Text> : null}
              {dayJobs.map((job) => (
                <BookingCard key={job.id} job={job} />
              ))}
              {!selectedKey ? (
                <Text className="text-sm text-muted">Tap a day to see its bookings. Labels show the job and time.</Text>
              ) : null}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}
