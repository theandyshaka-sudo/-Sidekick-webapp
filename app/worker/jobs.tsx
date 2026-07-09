import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Avatar } from "../../src/components/Avatar";
import { Badge } from "../../src/components/Badge";
import { PrimaryButton } from "../../src/components/PrimaryButton";
import { Calendar, type CalendarEvent } from "../../src/components/Calendar";
import { EmptyState } from "../../src/components/EmptyState";
import { OfferForm } from "../../src/components/OfferForm";
import { useJobs } from "../../src/context/JobsContext";
import { useMessages } from "../../src/context/MessagesContext";
import { useWorkerData } from "../../src/context/WorkerDataContext";
import { useRolePalette } from "../../src/theme/useRolePalette";
import { formatServicePrice } from "../../src/data/workerMock";
import { formatWhen, dateKey } from "../../src/lib/datetime";
import type { Job } from "../../src/data/jobsMock";

function RequestCard({ job, onMessage, onOffer, onDecline }: { job: Job; onMessage: () => void; onOffer: () => void; onDecline: () => void }) {
  const palette = useRolePalette();
  return (
    <View className="rounded-2xl border border-border bg-surface p-4">
      <View className="flex-row items-center gap-3">
        <Avatar uri={job.counterpartAvatar} name={job.counterpartName} size={44} />
        <View className="flex-1">
          <Text className="text-sm font-semibold text-text" numberOfLines={1}>{job.service}</Text>
          <Text className="text-xs text-muted">{job.counterpartName} · needs a time</Text>
        </View>
        <Badge label="New request" tone="primary" />
      </View>
      <View className="mt-3 flex-row gap-2 border-t border-border pt-3">
        <Pressable onPress={onDecline} hitSlop={6} className="h-11 w-11 items-center justify-center rounded-xl border border-border active:opacity-70">
          <Ionicons name="close" size={18} color={palette.danger} />
        </Pressable>
        <Pressable onPress={onMessage} className="h-11 flex-1 flex-row items-center justify-center gap-1.5 rounded-xl border border-border active:opacity-70">
          <Ionicons name="chatbubble-outline" size={15} color={palette.text} />
          <Text className="text-sm font-semibold text-text">Message</Text>
        </Pressable>
        <Pressable onPress={onOffer} className="h-11 flex-1 flex-row items-center justify-center gap-1.5 rounded-xl bg-primary active:opacity-80">
          <Ionicons name="calendar-outline" size={15} color={palette.primaryFg} />
          <Text className="text-sm font-semibold text-primary-fg">Propose time</Text>
        </Pressable>
      </View>
    </View>
  );
}

function ScheduledCard({ job, onComplete }: { job: Job; onComplete: (finalPrice: number) => void }) {
  const palette = useRolePalette();
  const [editing, setEditing] = useState(false);
  const [amount, setAmount] = useState(String(job.price));

  return (
    <View className="rounded-2xl border border-border bg-surface p-4">
      <View className="flex-row items-center gap-3">
        <Avatar uri={job.counterpartAvatar} name={job.counterpartName} size={44} />
        <View className="flex-1">
          <Text className="text-sm font-semibold text-text" numberOfLines={1}>{job.service}</Text>
          <Text className="text-xs text-muted">{job.counterpartName} · {formatWhen(job.scheduledAt)}</Text>
        </View>
        <Text className="text-base font-bold text-text">{formatServicePrice(job.priceType, job.price)}</Text>
      </View>

      <View className="mt-3 border-t border-border pt-3">
        {editing ? (
          <View className="gap-2">
            <Text className="text-xs font-semibold uppercase tracking-wider text-muted">Final amount collected</Text>
            <View className="flex-row items-center gap-2">
              <View className="flex-1 flex-row items-center gap-2 rounded-xl border border-border bg-bg px-3 py-2">
                <Text className="text-base text-muted">$</Text>
                <TextInput
                  value={amount}
                  onChangeText={(t) => setAmount(t.replace(/[^0-9]/g, ""))}
                  keyboardType="number-pad"
                  autoFocus
                  className="flex-1 text-base text-text"
                />
                <Text className="text-sm text-muted">{job.priceType === "hour" ? "/hr" : ""}</Text>
              </View>
              <PrimaryButton label="Complete" onPress={() => onComplete(Number(amount) || job.price)} />
            </View>
          </View>
        ) : (
          <Pressable
            onPress={() => setEditing(true)}
            className="flex-row items-center justify-center gap-1.5 rounded-xl bg-primary py-3 active:opacity-80"
          >
            <Ionicons name="checkmark-circle-outline" size={16} color={palette.primaryFg} />
            <Text className="text-sm font-semibold text-primary-fg">Edit price & mark complete</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

function CompletedCard({ job }: { job: Job }) {
  const palette = useRolePalette();
  return (
    <View className="flex-row items-center gap-3 rounded-2xl border border-border bg-surface p-4">
      <Avatar uri={job.counterpartAvatar} name={job.counterpartName} size={40} />
      <View className="flex-1">
        <Text className="text-sm font-semibold text-text" numberOfLines={1}>{job.service}</Text>
        <View className="flex-row items-center gap-1">
          <Text className="text-xs text-muted">{job.counterpartName}</Text>
          {job.rating != null ? (
            <>
              <Text className="text-xs text-muted">·</Text>
              <Ionicons name="star" size={11} color={palette.primary} />
              <Text className="text-xs text-muted">{job.rating}</Text>
            </>
          ) : null}
        </View>
      </View>
      <Text className="text-base font-bold text-text">${job.price}</Text>
    </View>
  );
}

export default function WorkerJobs() {
  const insets = useSafeAreaInsets();
  const palette = useRolePalette();
  const router = useRouter();
  const { requests, upcoming, completed, declineRequest, completeJob, scheduleFromOffer } = useJobs();
  const { ensureConversation, sendOffer } = useMessages();
  const { verification } = useWorkerData();
  const canSchedule = verification.status === "verified";
  const [view, setView] = useState<"list" | "calendar">("list");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [offerFor, setOfferFor] = useState<Job | null>(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualDayOffset, setManualDayOffset] = useState(0);

  // Adding or scheduling a job requires a verified age (HANDOFF §4/§5). Until then, these
  // actions route the worker to the verification flow instead.
  const goVerify = () => router.push("/settings/worker-verify");

  // Days between today (midnight) and a selected calendar day key ("YYYY-M-D"), clamped to the
  // 0–13 window the OfferForm date picker offers.
  const dayOffsetFromKey = (key: string): number => {
    const [y, m, d] = key.split("-").map(Number);
    const target = new Date(y, m, d);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return Math.min(Math.max(diff, 0), 13);
  };

  const openManual = (offset: number) => {
    setManualDayOffset(offset);
    setManualOpen(true);
  };

  const events: CalendarEvent[] = [...upcoming, ...completed]
    .filter((j) => j.scheduledAt || j.completedAt)
    .map((j) => ({ id: j.id, iso: (j.scheduledAt ?? j.completedAt) as string, title: j.service, past: j.status === "completed" }));

  const dayJobs = selectedKey
    ? [...upcoming, ...completed].filter((j) => {
        const iso = j.scheduledAt ?? j.completedAt;
        return iso && dateKey(iso) === selectedKey;
      })
    : [];

  const messageCounterpart = (job: Job) => {
    const id = ensureConversation(job.counterpartName, job.counterpartAvatar, job.service);
    router.push(`/chat/${id}`);
  };

  return (
    <View className="flex-1 bg-bg">
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 24, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="mb-5 flex-row items-center justify-between">
          <Text className="text-2xl font-bold text-text">Jobs</Text>
          <Pressable
            onPress={() => (canSchedule ? openManual(0) : goVerify())}
            className="h-9 flex-row items-center gap-1 rounded-full px-3 active:opacity-80"
            style={{ backgroundColor: canSchedule ? palette.primary : palette.border }}
          >
            <Ionicons name={canSchedule ? "add" : "lock-closed"} size={16} color={canSchedule ? palette.primaryFg : palette.muted} />
            <Text className="text-sm font-semibold" style={{ color: canSchedule ? palette.primaryFg : palette.muted }}>Add job</Text>
          </Pressable>
        </View>

        {!canSchedule ? (
          <Pressable
            onPress={goVerify}
            className="mb-5 flex-row items-center gap-3 rounded-2xl border px-4 py-3.5 active:opacity-80"
            style={{ borderColor: palette.primary, backgroundColor: palette.primarySoft }}
          >
            <Ionicons name="finger-print" size={22} color={palette.primary} />
            <View className="flex-1">
              <Text className="text-sm font-semibold text-text">Verify your age to start taking jobs</Text>
              <Text className="text-xs text-muted">You can message clients, but adding or scheduling jobs is locked until you verify.</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={palette.primary} />
          </Pressable>
        ) : null}

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
            {requests.length > 0 ? (
              <View className="mb-6">
                <Text className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">New requests</Text>
                <View className="gap-3">
                  {requests.map((job) => (
                    <RequestCard
                      key={job.id}
                      job={job}
                      onMessage={() => messageCounterpart(job)}
                      onOffer={() => (canSchedule ? setOfferFor(job) : goVerify())}
                      onDecline={() => declineRequest(job.id)}
                    />
                  ))}
                </View>
              </View>
            ) : null}

            {upcoming.length > 0 ? (
              <View className="mb-6">
                <Text className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">Scheduled</Text>
                <View className="gap-3">
                  {upcoming.map((job) => (
                    <ScheduledCard key={job.id} job={job} onComplete={(final) => completeJob(job.id, final)} />
                  ))}
                </View>
              </View>
            ) : null}

            {completed.length > 0 ? (
              <View className="mb-6">
                <Text className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">Completed</Text>
                <View className="gap-3">
                  {completed.map((job) => (
                    <CompletedCard key={job.id} job={job} />
                  ))}
                </View>
              </View>
            ) : null}

            {requests.length === 0 && upcoming.length === 0 && completed.length === 0 ? (
              <EmptyState
                icon="briefcase-outline"
                title="No jobs yet"
                subtitle="New client requests show up here. You can also add a job with the button above."
              />
            ) : null}
          </>
        ) : (
          <>
            <Calendar events={events} selectedKey={selectedKey} onSelectDay={(key) => setSelectedKey(key)} />
            <View className="mt-4 gap-3">
              {selectedKey && dayJobs.length === 0 ? (
                <Text className="text-sm text-muted">No jobs on this day.</Text>
              ) : null}
              {dayJobs.map((job) =>
                job.status === "completed" ? (
                  <CompletedCard key={job.id} job={job} />
                ) : (
                  <View key={job.id} className="flex-row items-center gap-3 rounded-2xl border border-border bg-surface p-4">
                    <Avatar uri={job.counterpartAvatar} name={job.counterpartName} size={40} />
                    <View className="flex-1">
                      <Text className="text-sm font-semibold text-text">{job.service}</Text>
                      <Text className="text-xs text-muted">{job.counterpartName} · {formatWhen(job.scheduledAt)}</Text>
                    </View>
                    <Badge label="Scheduled" tone="muted" />
                  </View>
                )
              )}
              {!selectedKey ? (
                <Text className="text-sm text-muted">Tap a day to see its jobs. Labels show the job and time.</Text>
              ) : null}
              {selectedKey ? (
                <Pressable
                  onPress={() => (canSchedule ? openManual(dayOffsetFromKey(selectedKey)) : goVerify())}
                  className="flex-row items-center justify-center gap-1.5 rounded-2xl border border-dashed border-border py-3.5 active:opacity-70"
                >
                  <Ionicons name={canSchedule ? "add-circle-outline" : "lock-closed-outline"} size={18} color={palette.primary} />
                  <Text className="text-sm font-semibold text-primary">{canSchedule ? "Add a job on this day" : "Verify to add a job"}</Text>
                </Pressable>
              ) : null}
            </View>
          </>
        )}
      </ScrollView>

      <OfferForm
        visible={offerFor != null}
        title="Propose a time"
        initialService={offerFor?.service}
        onClose={() => setOfferFor(null)}
        onSubmit={(draft) => {
          if (!offerFor) return;
          const convId = ensureConversation(offerFor.counterpartName, offerFor.counterpartAvatar, draft.service);
          sendOffer(convId, draft);
          setOfferFor(null);
          router.push(`/chat/${convId}`);
        }}
      />

      <OfferForm
        visible={manualOpen}
        title="Add a job"
        submitLabel="Add job"
        initialDayOffset={manualDayOffset}
        onClose={() => setManualOpen(false)}
        onSubmit={(draft) => {
          scheduleFromOffer({
            service: draft.service,
            counterpartName: "Added by you",
            counterpartAvatar: "https://i.pravatar.cc/150?img=64",
            price: draft.price,
            priceType: draft.priceType,
            scheduledAt: draft.scheduledAt,
          });
          setManualOpen(false);
        }}
      />
    </View>
  );
}
