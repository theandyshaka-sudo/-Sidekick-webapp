import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRolePalette } from "../theme/useRolePalette";

export function AdminHeader({ title }: { title: string }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const palette = useRolePalette();

  return (
    <View
      className="flex-row items-center justify-between border-b border-border bg-bg px-6 pb-4"
      style={{ paddingTop: insets.top + 12 }}
    >
      <View className="flex-row items-center gap-2">
        <Ionicons name="shield-checkmark" size={18} color={palette.primary} />
        <Text className="text-lg font-bold text-text">{title}</Text>
      </View>
      <Pressable
        onPress={() => router.replace("/role-select")}
        hitSlop={8}
        className="flex-row items-center gap-1 rounded-full border border-border bg-surface px-3 py-1.5 active:opacity-70"
      >
        <Ionicons name="exit-outline" size={14} color={palette.muted} />
        <Text className="text-xs font-semibold text-muted">Exit</Text>
      </Pressable>
    </View>
  );
}
