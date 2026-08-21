import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ScreenHeader } from "../../src/components/settings/ScreenHeader";
import { AccentColorPicker } from "../../src/components/AccentColorPicker";
import { useAppState } from "../../src/context/AppStateContext";
import { useRolePalette } from "../../src/theme/useRolePalette";
import { palettes, type ColorScheme } from "../../src/theme/palette";
import type { TextSize } from "../../src/theme/textSize";

const SCHEME_OPTIONS: Array<{ value: ColorScheme; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { value: "light", label: "Light", icon: "sunny-outline" },
  { value: "dark", label: "Dark", icon: "moon-outline" },
];

const ACCENT_PRESETS = ["#DC2626", "#EA580C", "#D97706", "#65A30D", "#059669", "#0891B2", "#2563EB", "#7C3AED", "#DB2777"];

const TEXT_SIZE_OPTIONS: Array<{ value: TextSize; label: string; sub: string; sample: string; previewSize: number }> = [
  { value: "small", label: "Small", sub: "50%", sample: "Aa", previewSize: 13 },
  { value: "default", label: "Medium", sub: "100%", sample: "Aa", previewSize: 21 },
  { value: "large", label: "Large", sub: "150%", sample: "Aa", previewSize: 29 },
  { value: "xlarge", label: "Extra Large", sub: "200%", sample: "Aa", previewSize: 37 },
];

export default function Appearance() {
  const { role, colorScheme, setColorScheme, accentColor, setAccentColor, textSize, setTextSize } = useAppState();
  const palette = useRolePalette();
  const [customOpen, setCustomOpen] = useState(false);

  const defaultPrimary = palettes[role ?? "client"][colorScheme].primary;

  return (
    <View className="flex-1 bg-bg">
      <ScreenHeader title="Appearance" />
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <Text className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">Theme</Text>
        <View className="gap-3">
          {SCHEME_OPTIONS.map((option) => {
            const selected = colorScheme === option.value;
            return (
              <Pressable
                key={option.value}
                onPress={() => setColorScheme(option.value)}
                className="flex-row items-center justify-between rounded-2xl border bg-surface px-4 py-4 active:opacity-70"
                style={{ borderColor: selected ? palette.primary : palette.border }}
              >
                <View className="flex-row items-center gap-3">
                  <View className="h-9 w-9 items-center justify-center rounded-full" style={{ backgroundColor: palette.primarySoft }}>
                    <Ionicons name={option.icon} size={18} color={palette.primary} />
                  </View>
                  <Text className="text-base font-medium text-text">{option.label}</Text>
                </View>
                {selected ? <Ionicons name="checkmark-circle" size={22} color={palette.primary} /> : null}
              </Pressable>
            );
          })}
        </View>

        <Text className="mb-3 mt-7 text-sm font-semibold uppercase tracking-wider text-muted">Accent color</Text>
        <View className="flex-row flex-wrap gap-3">
          <Pressable onPress={() => setAccentColor(null)} className="items-center active:opacity-70">
            <View
              className="h-11 w-11 items-center justify-center rounded-full border-2"
              style={{ backgroundColor: defaultPrimary, borderColor: !accentColor ? palette.text : "transparent" }}
            >
              {!accentColor ? <Ionicons name="checkmark" size={18} color={palette.primaryFg} /> : null}
            </View>
          </Pressable>
          {ACCENT_PRESETS.map((hex) => {
            const selected = accentColor?.toLowerCase() === hex.toLowerCase();
            return (
              <Pressable key={hex} onPress={() => setAccentColor(hex)} className="items-center active:opacity-70">
                <View
                  className="h-11 w-11 items-center justify-center rounded-full border-2"
                  style={{ backgroundColor: hex, borderColor: selected ? palette.text : "transparent" }}
                >
                  {selected ? <Ionicons name="checkmark" size={18} color="#fff" /> : null}
                </View>
              </Pressable>
            );
          })}
          <Pressable
            onPress={() => setCustomOpen((v) => !v)}
            className="h-11 w-11 items-center justify-center rounded-full border-2 border-dashed"
            style={{ borderColor: palette.border }}
          >
            <Ionicons name="color-palette-outline" size={18} color={palette.muted} />
          </Pressable>
        </View>

        {customOpen ? (
          <View className="mt-5 items-center rounded-2xl border border-border bg-surface p-5">
            <AccentColorPicker value={accentColor ?? defaultPrimary} onChange={setAccentColor} />
          </View>
        ) : null}

        <Text className="mb-3 mt-7 text-sm font-semibold uppercase tracking-wider text-muted">Text size</Text>
        <View className="flex-row gap-2.5">
          {TEXT_SIZE_OPTIONS.map((option) => {
            const selected = textSize === option.value;
            return (
              <Pressable
                key={option.value}
                onPress={() => setTextSize(option.value)}
                className="flex-1 items-center gap-1.5 rounded-2xl border bg-surface py-4 active:opacity-70"
                style={{ borderColor: selected ? palette.primary : palette.border }}
              >
                <Text className="font-bold text-text" style={{ fontSize: option.previewSize }}>
                  {option.sample}
                </Text>
                <Text className="text-xs font-medium text-muted">{option.label}</Text>
                <Text className="text-[10px] text-muted">{option.sub}</Text>
                {selected ? <Ionicons name="checkmark-circle" size={16} color={palette.primary} /> : null}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}
