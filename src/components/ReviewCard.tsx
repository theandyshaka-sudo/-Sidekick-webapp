import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Avatar } from "./Avatar";
import { useRolePalette } from "../theme/useRolePalette";
import { formatShortDate } from "../lib/datetime";

export function ReviewCard({
  author,
  avatar,
  rating,
  text,
  date,
}: {
  author: string;
  avatar?: string;
  rating: number;
  text: string;
  date?: string; // ISO
}) {
  const palette = useRolePalette();
  return (
    <View className="rounded-2xl border border-border bg-surface p-4">
      <View className="flex-row items-center gap-3">
        <Avatar uri={avatar} name={author} size={36} />
        <View className="flex-1">
          <Text className="text-sm font-semibold text-text">{author}</Text>
          <View className="flex-row items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((s) => (
              <Ionicons key={s} name={s <= rating ? "star" : "star-outline"} size={11} color={palette.primary} />
            ))}
          </View>
        </View>
        {date ? <Text className="text-xs text-muted">{formatShortDate(date)}</Text> : null}
      </View>
      <Text className="mt-2 text-sm leading-5 text-text">{text}</Text>
    </View>
  );
}
