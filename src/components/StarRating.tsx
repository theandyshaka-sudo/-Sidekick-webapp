import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRolePalette } from "../theme/useRolePalette";

export function StarRating({
  value,
  onChange,
  size = 22,
}: {
  value: number;
  onChange: (value: number) => void;
  size?: number;
}) {
  const palette = useRolePalette();

  return (
    <View className="flex-row gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Pressable key={star} onPress={() => onChange(star)} hitSlop={4}>
          <Ionicons
            name={star <= value ? "star" : "star-outline"}
            size={size}
            color={star <= value ? palette.primary : palette.muted}
          />
        </Pressable>
      ))}
    </View>
  );
}
