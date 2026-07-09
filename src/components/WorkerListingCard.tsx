import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Avatar } from "./Avatar";
import { PrimaryButton } from "./PrimaryButton";
import { useRolePalette } from "../theme/useRolePalette";
import type { NearbyWorker } from "../data/clientMock";

export function WorkerListingCard({
  worker,
  onRequest,
  onOpen,
  requested,
}: {
  worker: NearbyWorker;
  onRequest: () => void;
  onOpen: () => void;
  requested?: boolean;
}) {
  const palette = useRolePalette();

  return (
    <View className="rounded-2xl border border-border bg-surface p-4">
      <Pressable className="flex-row items-center gap-3 active:opacity-70" onPress={onOpen}>
        <Avatar uri={worker.avatarUri} name={worker.name} size={52} />
        <View className="flex-1">
          <Text className="text-base font-semibold text-text" numberOfLines={1}>
            {worker.businessName}
          </Text>
          <Text className="text-xs text-muted" numberOfLines={1}>
            {worker.name} · {worker.category}
          </Text>
          <View className="mt-1 flex-row items-center gap-3">
            <View className="flex-row items-center gap-1">
              <Ionicons name="star" size={12} color={palette.primary} />
              <Text className="text-xs text-muted">
                {worker.rating} ({worker.ratingCount})
              </Text>
            </View>
            <View className="flex-row items-center gap-1">
              <Ionicons name="location-outline" size={12} color={palette.muted} />
              <Text className="text-xs text-muted">{worker.distanceMiles} mi</Text>
            </View>
          </View>
          <View className="mt-1 flex-row items-center gap-1">
            <Ionicons name="time-outline" size={12} color={palette.muted} />
            <Text className="text-xs text-muted">Available {worker.availLabel}</Text>
          </View>
        </View>
        <View className="items-end">
          <Text className="text-sm font-bold text-text">{worker.priceLabel}</Text>
          <View className="mt-1 flex-row items-center gap-0.5">
            <Text className="text-xs font-medium text-primary">View</Text>
            <Ionicons name="chevron-forward" size={12} color={palette.primary} />
          </View>
        </View>
      </Pressable>
      <View className="mt-3">
        <PrimaryButton
          label={requested ? "Requested" : "Request booking"}
          variant={requested ? "outline" : "solid"}
          disabled={requested}
          onPress={onRequest}
        />
      </View>
    </View>
  );
}
