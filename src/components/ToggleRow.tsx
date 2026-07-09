import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRolePalette } from "../theme/useRolePalette";
import { Toggle } from "./Toggle";

export function ToggleRow({
  icon,
  label,
  description,
  value,
  onValueChange,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  const palette = useRolePalette();

  return (
    <View className="flex-row items-center justify-between rounded-2xl border border-border bg-surface px-4 py-3.5">
      <View className="mr-3 flex-1 flex-row items-center gap-3">
        <Ionicons name={icon} size={18} color={palette.text} />
        <View className="flex-1">
          <Text className="text-sm font-medium text-text">{label}</Text>
          {description ? <Text className="text-xs text-muted">{description}</Text> : null}
        </View>
      </View>
      <Toggle value={value} onValueChange={onValueChange} />
    </View>
  );
}
