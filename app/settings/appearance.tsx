import { Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ScreenHeader } from "../../src/components/settings/ScreenHeader";
import { useAppState } from "../../src/context/AppStateContext";
import { useRolePalette } from "../../src/theme/useRolePalette";
import type { ColorScheme } from "../../src/theme/palette";

const OPTIONS: Array<{ value: ColorScheme; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { value: "light", label: "Light", icon: "sunny-outline" },
  { value: "dark", label: "Dark", icon: "moon-outline" },
];

export default function Appearance() {
  const { colorScheme, setColorScheme } = useAppState();
  const palette = useRolePalette();

  return (
    <View className="flex-1 bg-bg">
      <ScreenHeader title="Appearance" />
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 40, gap: 12 }} showsVerticalScrollIndicator={false}>
        <Text className="mb-1 text-sm text-muted">Choose how SideKick looks on this device.</Text>
        {OPTIONS.map((option) => {
          const selected = colorScheme === option.value;
          return (
            <Pressable
              key={option.value}
              onPress={() => setColorScheme(option.value)}
              className="flex-row items-center justify-between rounded-2xl border bg-surface px-4 py-4 active:opacity-70"
              style={{ borderColor: selected ? palette.primary : palette.border }}
            >
              <View className="flex-row items-center gap-3">
                <View
                  className="h-9 w-9 items-center justify-center rounded-full"
                  style={{ backgroundColor: palette.primarySoft }}
                >
                  <Ionicons name={option.icon} size={18} color={palette.primary} />
                </View>
                <Text className="text-base font-medium text-text">{option.label}</Text>
              </View>
              {selected ? <Ionicons name="checkmark-circle" size={22} color={palette.primary} /> : null}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
