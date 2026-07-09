import { ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ScreenHeader } from "../../src/components/settings/ScreenHeader";
import { Badge } from "../../src/components/Badge";
import { legalCopy } from "../../src/data/legalCopy";
import { useRolePalette } from "../../src/theme/useRolePalette";

export default function ClientLegal() {
  const palette = useRolePalette();
  const copy = legalCopy.client;

  return (
    <View className="flex-1 bg-bg">
      <ScreenHeader title="Legal documents" />
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <View className="rounded-2xl border border-border bg-surface p-5">
          <View className="mb-3 flex-row items-start justify-between gap-3">
            <View className="flex-1 flex-row items-center gap-2">
              <Ionicons name={copy.icon} size={18} color={palette.primary} />
              <Text className="flex-1 text-base font-bold text-text">{copy.heading}</Text>
            </View>
            <Badge label="Accepted" tone="success" />
          </View>
          <Text className="text-sm leading-6 text-muted">{copy.body}</Text>
        </View>

        <View className="mt-4 flex-row items-start gap-2 px-1">
          <Ionicons name="information-circle-outline" size={16} color={palette.muted} />
          <Text className="flex-1 text-xs leading-5 text-muted">
            Draft copy — final agreement text will be provided by licensed counsel before launch
            (see HANDOFF.md §7).
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
