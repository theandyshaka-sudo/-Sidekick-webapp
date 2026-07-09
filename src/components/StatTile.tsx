import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRolePalette } from "../theme/useRolePalette";

export function StatTile({
  icon,
  value,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  label: string;
}) {
  const palette = useRolePalette();

  return (
    <View className="flex-1 rounded-2xl border border-border bg-surface p-4">
      <View className="mb-3 h-9 w-9 items-center justify-center rounded-full bg-primary-soft">
        <Ionicons name={icon} size={18} color={palette.primary} />
      </View>
      <Text className="text-xl font-bold text-text">{value}</Text>
      <Text className="mt-0.5 text-xs text-muted">{label}</Text>
    </View>
  );
}
