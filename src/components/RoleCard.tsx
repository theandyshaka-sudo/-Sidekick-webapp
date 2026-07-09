import { Image, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { palettes } from "../theme/palette";
import type { Role } from "../context/AppStateContext";

export function RoleCard({
  tone,
  title,
  subtitle,
  badge,
  bullets,
  photoUri,
  emphasized,
  onPress,
}: {
  tone: Role;
  title: string;
  subtitle: string;
  badge?: string;
  bullets?: string[];
  photoUri?: string;
  emphasized?: boolean;
  onPress: () => void;
}) {
  // Welcome/role-select is shown before a color scheme applies — always use the light variant.
  const palette = palettes[tone].light;

  return (
    <Pressable
      onPress={onPress}
      className="rounded-3xl border border-border bg-surface p-5 active:opacity-80"
      style={{
        shadowColor: "#0F172A",
        shadowOpacity: emphasized ? 0.12 : 0.06,
        shadowRadius: emphasized ? 16 : 10,
        shadowOffset: { width: 0, height: emphasized ? 8 : 4 },
        elevation: emphasized ? 4 : 2,
      }}
    >
      <View className="flex-row items-start gap-4">
        {photoUri ? <Image source={{ uri: photoUri }} className="h-16 w-16 rounded-2xl" /> : null}
        <View className="flex-1">
          {badge ? (
            <View
              className="mb-2 self-start rounded-full px-2.5 py-0.5"
              style={{ backgroundColor: palette.primarySoft }}
            >
              <Text className="text-xs font-semibold" style={{ color: palette.primary }}>
                {badge}
              </Text>
            </View>
          ) : null}
          <Text className="text-xl font-bold text-text">{title}</Text>
          <Text className="mt-1 text-sm text-muted">{subtitle}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={palette.muted} />
      </View>

      {bullets && bullets.length > 0 ? (
        <View className="mt-4 gap-2 border-t border-border pt-4">
          {bullets.map((bullet) => (
            <View key={bullet} className="flex-row items-center gap-2">
              <Ionicons name="checkmark-circle" size={16} color={palette.success} />
              <Text className="text-sm text-text">{bullet}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </Pressable>
  );
}
