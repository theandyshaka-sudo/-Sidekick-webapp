import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { PrimaryButton } from "../src/components/PrimaryButton";
import { useRolePalette } from "../src/theme/useRolePalette";

const ADMIN_PASSCODE = "Rocky1234Andy";

export default function AdminLogin() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const palette = useRolePalette();
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);

  const submit = () => {
    if (password === ADMIN_PASSCODE) {
      router.replace("/admin/reports");
    } else {
      setError(true);
    }
  };

  return (
    <View className="flex-1 bg-bg">
      <View className="flex-row items-center gap-3 px-4 pb-3" style={{ paddingTop: insets.top + 12 }}>
        <Pressable
          onPress={() => router.replace("/role-select")}
          hitSlop={8}
          className="h-9 w-9 items-center justify-center rounded-full border border-border bg-surface active:opacity-70"
        >
          <Ionicons name="chevron-back" size={18} color={palette.text} />
        </Pressable>
        <Text className="text-lg font-bold text-text">Admin login</Text>
      </View>

      <View className="flex-1 px-6 pt-10">
        <View className="mb-5 h-14 w-14 items-center justify-center rounded-2xl" style={{ backgroundColor: palette.primarySoft }}>
          <Ionicons name="shield-checkmark" size={26} color={palette.primary} />
        </View>
        <Text className="mb-1 text-2xl font-bold text-text">Admin console</Text>
        <Text className="mb-6 text-sm text-muted">Enter the admin passcode to review reports and ID verifications.</Text>

        <Text className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted">Passcode</Text>
        <TextInput
          value={password}
          onChangeText={(t) => { setPassword(t); setError(false); }}
          placeholder="Enter passcode"
          placeholderTextColor={palette.muted}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          onSubmitEditing={submit}
          style={{ color: palette.text, borderColor: error ? palette.danger : palette.border }}
          className="rounded-2xl border bg-surface px-4 py-3 text-base"
        />
        {error ? (
          <View className="mt-2 flex-row items-center gap-1.5">
            <Ionicons name="alert-circle" size={14} color={palette.danger} />
            <Text className="text-xs" style={{ color: palette.danger }}>Incorrect passcode. Try again.</Text>
          </View>
        ) : null}

        <View className="mt-6">
          <PrimaryButton label="Sign in" onPress={submit} disabled={!password} />
        </View>
      </View>
    </View>
  );
}
