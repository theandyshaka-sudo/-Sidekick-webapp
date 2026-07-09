import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRolePalette } from "../../theme/useRolePalette";

export function SettingsRow({
  icon,
  label,
  danger,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  danger?: boolean;
  onPress?: () => void;
}) {
  const palette = useRolePalette();

  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center justify-between rounded-2xl border border-border bg-surface px-4 py-3.5 active:opacity-70"
    >
      <View className="flex-row items-center gap-3">
        <Ionicons name={icon} size={18} color={danger ? palette.danger : palette.text} />
        <Text className={`text-sm font-medium ${danger ? "text-danger" : "text-text"}`}>{label}</Text>
      </View>
      {!danger && <Ionicons name="chevron-forward" size={16} color={palette.muted} />}
    </Pressable>
  );
}
