import { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { FormField } from "../src/components/FormField";
import { PrimaryButton } from "../src/components/PrimaryButton";
import { useRolePalette } from "../src/theme/useRolePalette";
import { supabase } from "../src/lib/supabase";

type Status = "checking" | "ready" | "invalid" | "done";

// Landing page for the "reset your password" email link. The Supabase client has
// detectSessionInUrl turned off (src/lib/supabase.ts), so the access/refresh tokens Supabase
// appends to the redirect URL's #hash aren't picked up automatically — this screen parses them
// itself and calls setSession before letting the user pick a new password.
export default function ResetPassword() {
  const router = useRouter();
  const palette = useRolePalette();
  const [status, setStatus] = useState<Status>("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      if (typeof window === "undefined") {
        setStatus("invalid");
        return;
      }
      const raw = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash;
      const params = new URLSearchParams(raw);
      const access_token = params.get("access_token");
      const refresh_token = params.get("refresh_token");
      if (!access_token || !refresh_token) {
        setStatus("invalid");
        return;
      }
      const { error: sessionError } = await supabase.auth.setSession({ access_token, refresh_token });
      setStatus(sessionError ? "invalid" : "ready");
    })();
  }, []);

  const save = async () => {
    setError(undefined);
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setSaving(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setSaving(false);
      setError(updateError.message);
      return;
    }
    // setSession above (to apply the password change) leaves a real signed-in session behind —
    // sign it out so finishing a password reset doesn't silently log the user straight into the
    // app; they should land back on the login screen instead.
    await supabase.auth.signOut();
    setSaving(false);
    setStatus("done");
  };

  if (status === "checking") {
    return (
      <View className="flex-1 items-center justify-center bg-bg">
        <ActivityIndicator color={palette.primary} />
      </View>
    );
  }

  if (status === "invalid") {
    return (
      <View className="flex-1 items-center justify-center gap-4 bg-bg px-8">
        <Ionicons name="alert-circle-outline" size={32} color={palette.danger} />
        <Text className="text-center text-base text-text">
          This reset link is invalid or has expired. Go back to the app and request a new one.
        </Text>
        <PrimaryButton label="Back to log in" onPress={() => router.replace("/")} />
      </View>
    );
  }

  if (status === "done") {
    return (
      <View className="flex-1 items-center justify-center gap-4 bg-bg px-8">
        <Ionicons name="checkmark-circle" size={40} color={palette.primary} />
        <Text className="text-center text-lg font-bold text-text">Password successfully changed</Text>
        <PrimaryButton label="Go back to log in" onPress={() => router.replace("/")} />
      </View>
    );
  }

  return (
    <View className="flex-1 justify-center bg-bg px-8">
      <Text className="mb-1 text-2xl font-bold text-text">Set a new password</Text>
      <Text className="mb-6 text-sm text-muted">Choose a new password for your account.</Text>
      <FormField
        label="New password"
        value={password}
        onChangeText={(t) => { setPassword(t); setError(undefined); }}
        secureTextEntry
        autoCapitalize="none"
      />
      <FormField
        label="Confirm new password"
        value={confirm}
        onChangeText={(t) => { setConfirm(t); setError(undefined); }}
        secureTextEntry
        autoCapitalize="none"
        error={error}
      />
      <PrimaryButton label="Save password" onPress={save} loading={saving} />
    </View>
  );
}
