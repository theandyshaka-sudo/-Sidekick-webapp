import { ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ScreenHeader } from "../../src/components/settings/ScreenHeader";
import { ToggleRow } from "../../src/components/ToggleRow";
import { useAuth } from "../../src/context/AuthContext";
import { useRolePalette } from "../../src/theme/useRolePalette";

export default function Security() {
  const palette = useRolePalette();
  const { currentUser, setTwoFactor } = useAuth();
  const enabled = currentUser?.twoFactorEnabled ?? false;

  return (
    <View className="flex-1 bg-bg">
      <ScreenHeader title="Security" />
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <Text className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">
          Two-step verification
        </Text>
        <ToggleRow
          icon="shield-checkmark-outline"
          label="Two-step verification"
          description={enabled ? "On — we'll email a code at login" : "Off"}
          value={enabled}
          onValueChange={(v) => setTwoFactor(v)}
        />

        <View className="mt-4 flex-row items-start gap-2 rounded-2xl border border-border bg-surface p-4">
          <Ionicons name="mail-outline" size={16} color={palette.primary} />
          <Text className="flex-1 text-xs leading-5 text-muted">
            When enabled, each login asks for a one-time code sent to{" "}
            <Text className="font-semibold text-text">{currentUser?.email || "your email"}</Text>. Code
            delivery goes live once the email provider is connected — until then this just saves your
            preference.
          </Text>
        </View>

        {currentUser ? (
          <>
            <Text className="mb-3 mt-7 text-sm font-semibold uppercase tracking-wider text-muted">Account</Text>
            <View className="gap-2.5">
              <View className="flex-row items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3.5">
                <Ionicons name="person-outline" size={18} color={palette.text} />
                <View className="flex-1">
                  <Text className="text-xs text-muted">Username</Text>
                  <Text className="text-sm font-medium text-text">{currentUser.username}</Text>
                </View>
              </View>
              <View className="flex-row items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3.5">
                <Ionicons name="mail-outline" size={18} color={palette.text} />
                <View className="flex-1">
                  <Text className="text-xs text-muted">Email</Text>
                  <Text className="text-sm font-medium text-text">{currentUser.email}</Text>
                </View>
              </View>
            </View>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}
