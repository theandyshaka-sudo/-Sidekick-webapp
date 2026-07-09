import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRolePalette } from "../../theme/useRolePalette";

export function ScreenHeader({ title }: { title: string }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const palette = useRolePalette();

  return (
    <View
      className="flex-row items-center gap-3 border-b border-border bg-bg px-6 pb-4"
      style={{ paddingTop: insets.top + 12 }}
    >
      <Pressable
        onPress={() => router.back()}
        hitSlop={8}
        className="h-9 w-9 items-center justify-center rounded-full border border-border bg-surface active:opacity-70"
      >
        <Ionicons name="chevron-back" size={18} color={palette.text} />
      </Pressable>
      <Text className="text-lg font-bold text-text">{title}</Text>
    </View>
  );
}
