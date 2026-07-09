import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRolePalette } from "../theme/useRolePalette";

export function EmptyState({
  icon,
  title,
  subtitle,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
}) {
  const palette = useRolePalette();
  return (
    <View className="items-center px-6 py-12">
      <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-primary-soft">
        <Ionicons name={icon} size={30} color={palette.primary} />
      </View>
      <Text className="text-center text-base font-semibold text-text">{title}</Text>
      {subtitle ? <Text className="mt-1 text-center text-sm text-muted">{subtitle}</Text> : null}
    </View>
  );
}
