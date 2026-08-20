import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Avatar } from "../../src/components/Avatar";
import { PrimaryButton } from "../../src/components/PrimaryButton";
import { ReviewCard } from "../../src/components/ReviewCard";
import { useRolePalette } from "../../src/theme/useRolePalette";
import { useJobs } from "../../src/context/JobsContext";
import { useMessages } from "../../src/context/MessagesContext";
import { useClientData } from "../../src/context/ClientDataContext";
import { supabase } from "../../src/lib/supabase";
import type { PriceType } from "../../src/data/workerMock";

function parsePrice(label: string): { price: number; priceType: PriceType } {
  return { price: Number(label.replace(/[^0-9]/g, "")) || 0, priceType: label.includes("/hr") ? "hour" : "job" };
}

// Shape of a row from `worker_reviews()` (snake_case, as Postgres returns it).
type ReviewRow = {
  reviewer_business_name: string | null;
  reviewer_first_name: string | null;
  reviewer_avatar_uri: string | null;
  rating: number;
  review_text: string;
  completed_at: string | null;
};

function rowToReview(row: ReviewRow) {
  return {
    author: row.reviewer_business_name || row.reviewer_first_name || "SideKick user",
    avatar: row.reviewer_avatar_uri ?? "",
    rating: row.rating,
    text: row.review_text,
    date: row.completed_at ?? undefined,
  };
}

export default function ProviderDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const palette = useRolePalette();
  const { jobs, requestJob } = useJobs();
  const { ensureConversation } = useMessages();
  const { nearbyWorkers } = useClientData();
  const [reviews, setReviews] = useState<ReturnType<typeof rowToReview>[]>([]);

  const worker = nearbyWorkers.find((w) => w.id === id);

  useEffect(() => {
    if (!worker) return;
    supabase.rpc("worker_reviews", { target_worker_id: worker.workerId }).then(({ data, error }) => {
      if (error) console.error("[worker_reviews] fetch failed:", error.message);
      setReviews(((data as ReviewRow[] | null) ?? []).map(rowToReview));
    });
  }, [worker?.workerId]);

  if (!worker) {
    return (
      <View className="flex-1 items-center justify-center bg-bg">
        <Text className="text-sm text-muted">Business owner not found.</Text>
      </View>
    );
  }

  const alreadyRequested = jobs.some((j) => j.status !== "declined" && j.counterpartName === worker.name);

  const message = async () => {
    const { price, priceType } = parsePrice(worker.priceLabel);
    const convId = await ensureConversation(worker.name, worker.avatarUri, worker.category, worker.rating, worker.workerId, price, priceType);
    router.push(`/chat/${convId}`);
  };

  const request = async () => {
    const { price, priceType } = parsePrice(worker.priceLabel);
    requestJob({ service: worker.category, counterpartName: worker.name, counterpartAvatar: worker.avatarUri, price, priceType, counterpartUserId: worker.workerId });
    await message();
  };

  return (
    <View className="flex-1 bg-bg">
      <View className="flex-row items-center gap-3 border-b border-border bg-bg px-4 pb-3" style={{ paddingTop: insets.top + 12 }}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          className="h-9 w-9 items-center justify-center rounded-full border border-border bg-surface active:opacity-70"
        >
          <Ionicons name="chevron-back" size={18} color={palette.text} />
        </Pressable>
        <Text className="text-lg font-bold text-text">Business profile</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 28 }} showsVerticalScrollIndicator={false}>
        <View className="items-center px-6 pt-6">
          <Avatar uri={worker.avatarUri} name={worker.name} size={80} />
          <Text className="mt-3 text-xl font-bold text-text">{worker.businessName}</Text>
          <Text className="text-sm text-muted">{worker.name}</Text>
          <View className="mt-2 flex-row items-center gap-3">
            <View className="flex-row items-center gap-1">
              <Ionicons name="star" size={14} color={palette.primary} />
              <Text className="text-sm text-muted">
                {worker.ratingCount ? `${worker.rating.toFixed(1)} (${worker.ratingCount})` : "No reviews yet"}
              </Text>
            </View>
            <View className="flex-row items-center gap-1">
              <Ionicons name="location-outline" size={14} color={palette.muted} />
              <Text className="text-sm text-muted">{worker.distanceMiles != null ? `${worker.distanceMiles} mi away` : "Distance unknown"}</Text>
            </View>
          </View>
          <View className="mt-3 flex-row items-center gap-1.5 rounded-full border border-border px-3 py-1">
            <Ionicons name="happy-outline" size={13} color={palette.muted} />
            <Text className="text-xs font-medium text-muted">{worker.age} years old (self-reported)</Text>
          </View>
          {worker.inSoftZone && (
            <Text className="mt-3 px-6 text-center text-xs text-amber-600">
              This business owner prefers not to work this far out, but you're welcome to reach out anyway.
            </Text>
          )}
        </View>

        <View className="mt-6 px-6">
          <Text className="text-sm leading-6 text-text">{worker.bio}</Text>
        </View>

        <View className="mt-6 px-6">
          <Text className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">Offers</Text>
          <View className="rounded-2xl border border-border bg-surface p-4">
            <View className="flex-row items-center justify-between">
              <Text className="text-base font-semibold text-text">{worker.category}</Text>
              <Text className="text-base font-bold text-text">{worker.priceLabel}</Text>
            </View>
            <View className="mt-2 flex-row items-center gap-1.5">
              <Ionicons name="time-outline" size={13} color={palette.muted} />
              <Text className="text-sm text-muted">Available {worker.availLabel}</Text>
            </View>
          </View>
        </View>

        <View className="mt-6 px-6">
          <Text className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">
            Reviews ({reviews.length})
          </Text>
          <View className="gap-3">
            {reviews.map((review, i) => (
              <ReviewCard key={i} author={review.author} avatar={review.avatar} rating={review.rating} text={review.text} date={review.date} />
            ))}
          </View>
        </View>
      </ScrollView>

      <View className="flex-row gap-3 border-t border-border bg-bg px-6 pt-3" style={{ paddingBottom: insets.bottom + 12 }}>
        <View className="flex-1">
          <PrimaryButton label="Message" variant="outline" onPress={message} />
        </View>
        <View className="flex-1">
          <PrimaryButton label={alreadyRequested ? "Requested" : "Request booking"} disabled={alreadyRequested} onPress={request} />
        </View>
      </View>
    </View>
  );
}
