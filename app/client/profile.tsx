import { Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Avatar } from "../../src/components/Avatar";
import { Badge } from "../../src/components/Badge";
import { PrimaryButton } from "../../src/components/PrimaryButton";
import { SettingsRow } from "../../src/components/settings/SettingsRow";
import { useAppState } from "../../src/context/AppStateContext";
import { useAuth } from "../../src/context/AuthContext";
import { useClientData } from "../../src/context/ClientDataContext";
import { useRolePalette } from "../../src/theme/useRolePalette";
import { clientProfile as staticProfile } from "../../src/data/clientMock";

export default function ClientProfile() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const palette = useRolePalette();
  const { reset } = useAppState();
  const { logOut } = useAuth();
  const { profile, verification } = useClientData();

  const handleLogout = async () => {
    await logOut();
    await reset();
    router.replace("/");
  };

  const verified = verification.status === "verified";
  const pending = verification.status === "pending";

  return (
    <ScrollView
      className="flex-1 bg-bg"
      contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 24, paddingBottom: 32 }}
      showsVerticalScrollIndicator={false}
    >
      <Text className="mb-6 text-2xl font-bold text-text">Profile</Text>

      <View className="items-center rounded-3xl border border-border bg-surface p-6">
        <Avatar uri={profile.avatarUri} name={profile.fullName} size={72} />
        <Text className="mt-3 text-lg font-bold text-text">{profile.fullName || "Add your name in Edit profile"}</Text>
        <View className="mt-2 flex-row items-center gap-2">
          <Badge label={staticProfile.trustTier} tone="muted" />
          <View className="flex-row items-center gap-1">
            <Ionicons name="calendar-outline" size={12} color={palette.muted} />
            <Text className="text-xs text-muted">Member since {staticProfile.memberSince}</Text>
          </View>
        </View>
        <View className="mt-4 w-full">
          <PrimaryButton
            label="Edit profile"
            variant="outline"
            onPress={() => router.push("/settings/client-edit-profile")}
          />
        </View>
      </View>

      <Pressable
        onPress={() => router.push("/onboarding/verify")}
        className="mt-4 flex-row items-center gap-3 rounded-2xl border px-4 py-3.5 active:opacity-70"
        style={{
          borderColor: verified ? palette.success : palette.primary,
          backgroundColor: verified ? palette.success + "18" : palette.primarySoft,
        }}
      >
        <Ionicons
          name={verified ? "shield-checkmark" : pending ? "hourglass-outline" : "finger-print"}
          size={22}
          color={verified ? palette.success : palette.primary}
        />
        <View className="flex-1">
          <Text className="text-sm font-semibold text-text">
            {verified ? "Identity verified" : pending ? "Identity under review" : "Verify your identity"}
          </Text>
          <Text className="text-xs text-muted">
            {verified
              ? "Business owners can see you're a trusted, verified neighbor"
              : pending
                ? "An admin is reviewing your ID — this usually takes a little while"
                : "Confirm your identity with an ID to book with confidence"}
          </Text>
        </View>
        {verified ? null : <Ionicons name="chevron-forward" size={18} color={palette.muted} />}
      </Pressable>

      <Text className="mb-3 mt-7 text-sm font-semibold uppercase tracking-wider text-muted">
        Settings
      </Text>
      <View className="gap-2.5">
        <SettingsRow
          icon="notifications-outline"
          label="Notifications"
          onPress={() => router.push("/settings/client-notifications")}
        />
        <SettingsRow
          icon="contrast-outline"
          label="Appearance"
          onPress={() => router.push("/settings/appearance")}
        />
        <SettingsRow
          icon="shield-checkmark-outline"
          label="Security"
          onPress={() => router.push("/settings/security")}
        />
        <SettingsRow
          icon="document-text-outline"
          label="Legal documents"
          onPress={() => router.push("/settings/client-legal")}
        />
        <SettingsRow
          icon="help-circle-outline"
          label="Help & support"
          onPress={() => router.push("/settings/client-help")}
        />
        <SettingsRow icon="log-out-outline" label="Log out" danger onPress={handleLogout} />
      </View>
    </ScrollView>
  );
}
