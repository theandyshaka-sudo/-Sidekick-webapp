import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRolePalette } from "../theme/useRolePalette";
import { formatServicePrice } from "../data/workerMock";
import { formatWhen } from "../lib/datetime";
import type { JobOffer } from "../data/messagesMock";

// A job offer rendered inside the chat. If it's an offer you sent, it shows as pending
// ("Waiting for a response"). If you received it and it's still pending, you get Accept / Decline.
export function OfferCard({
  offer,
  fromMe,
  onAccept,
  onDecline,
}: {
  offer: JobOffer;
  fromMe: boolean;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const palette = useRolePalette();

  return (
    <View
      className="max-w-[85%] self-start rounded-2xl border p-3.5"
      style={{
        alignSelf: fromMe ? "flex-end" : "flex-start",
        borderColor: palette.border,
        backgroundColor: palette.surface,
      }}
    >
      <View className="mb-1.5 flex-row items-center gap-1.5">
        <Ionicons name="briefcase" size={14} color={palette.primary} />
        <Text className="text-xs font-semibold uppercase tracking-wider text-muted">Job offer</Text>
      </View>
      <Text className="text-base font-bold text-text">{offer.service}</Text>
      <Text className="mt-0.5 text-sm font-semibold" style={{ color: palette.primary }}>
        {formatServicePrice(offer.priceType, offer.price)}
      </Text>
      <View className="mt-1 flex-row items-center gap-1.5">
        <Ionicons name="calendar-outline" size={13} color={palette.muted} />
        <Text className="text-sm text-muted">{formatWhen(offer.scheduledAt)}</Text>
      </View>

      {offer.status === "accepted" ? (
        <View className="mt-2.5 flex-row items-center gap-1.5 border-t border-border pt-2.5">
          <Ionicons name="checkmark-circle" size={15} color={palette.success} />
          <Text className="text-sm font-medium" style={{ color: palette.success }}>Accepted · added to schedule</Text>
        </View>
      ) : offer.status === "declined" ? (
        <View className="mt-2.5 flex-row items-center gap-1.5 border-t border-border pt-2.5">
          <Ionicons name="close-circle" size={15} color={palette.danger} />
          <Text className="text-sm font-medium" style={{ color: palette.danger }}>Declined</Text>
        </View>
      ) : fromMe ? (
        <View className="mt-2.5 flex-row items-center gap-1.5 border-t border-border pt-2.5">
          <Ionicons name="time-outline" size={14} color={palette.muted} />
          <Text className="text-sm text-muted">Waiting for a response</Text>
        </View>
      ) : (
        <View className="mt-3 flex-row gap-2">
          <Pressable onPress={onDecline} className="flex-1 items-center rounded-xl border border-border py-2.5 active:opacity-70">
            <Text className="text-sm font-semibold text-muted">Decline</Text>
          </Pressable>
          <Pressable onPress={onAccept} className="flex-1 items-center rounded-xl bg-primary py-2.5 active:opacity-80">
            <Text className="text-sm font-semibold text-primary-fg">Accept</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}
