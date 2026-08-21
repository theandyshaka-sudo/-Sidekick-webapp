import { useState } from "react";
import { Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ScreenHeader } from "../src/components/settings/ScreenHeader";
import { FormField } from "../src/components/FormField";
import { PrimaryButton } from "../src/components/PrimaryButton";
import { useAppState } from "../src/context/AppStateContext";
import { useAuth, type StoredAccount } from "../src/context/AuthContext";
import { useRolePalette } from "../src/theme/useRolePalette";
import { useThemeVars } from "../src/theme/useThemeVars";
import { supabase } from "../src/lib/supabase";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Enters when 2-step verification is already ON for this account: password already checked out,
// this asks for the one-time code Supabase just emailed via signInWithOtp (see submit()) and
// confirms it with verifyOtp before letting the login through.
function TwoFactorCodeModal({
  email,
  onVerified,
  onBack,
}: {
  email: string;
  onVerified: () => void;
  onBack: () => void;
}) {
  const palette = useRolePalette();
  const themeVars = useThemeVars();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [resent, setResent] = useState(false);

  const verify = async () => {
    setError(null);
    setVerifying(true);
    const { error } = await supabase.auth.verifyOtp({ email, token: code.trim(), type: "email" });
    setVerifying(false);
    if (error) {
      setError("That code is incorrect or expired.");
      return;
    }
    onVerified();
  };

  const resend = async () => {
    setError(null);
    setResent(false);
    await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
    setResent(true);
  };

  return (
    <Modal visible transparent animationType="fade">
      <View className="flex-1 justify-center bg-black/50 px-6" style={themeVars}>
        <View className="rounded-3xl p-6" style={{ backgroundColor: palette.surface }}>
          <View className="mb-4 h-14 w-14 items-center justify-center rounded-2xl" style={{ backgroundColor: palette.primarySoft }}>
            <Ionicons name="mail-open-outline" size={26} color={palette.primary} />
          </View>
          <View className="flex-row items-center justify-between">
            <Text className="text-xl font-bold text-text">Enter your code</Text>
            <Pressable onPress={onBack} hitSlop={8} className="active:opacity-60">
              <Ionicons name="close" size={22} color={palette.muted} />
            </Pressable>
          </View>
          <Text className="mt-2 text-sm leading-6 text-muted">
            We emailed a one-time code to <Text className="font-semibold text-text">{email}</Text>.
          </Text>
          <TextInput
            value={code}
            onChangeText={(t) => { setCode(t.replace(/[^0-9]/g, "").slice(0, 6)); setError(null); }}
            placeholder="123456"
            placeholderTextColor={palette.muted}
            keyboardType="number-pad"
            style={{ color: palette.text, borderColor: error ? palette.danger : palette.border }}
            className="mt-5 rounded-2xl border bg-bg px-4 py-3 text-center text-2xl tracking-widest"
          />
          {error ? (
            <View className="mt-2 flex-row items-center gap-1.5">
              <Ionicons name="alert-circle" size={14} color={palette.danger} />
              <Text className="flex-1 text-xs" style={{ color: palette.danger }}>{error}</Text>
            </View>
          ) : null}
          <View className="mt-6">
            <PrimaryButton label="Verify" onPress={verify} loading={verifying} disabled={code.length < 6} />
          </View>
          <View className="mt-4 flex-row items-center justify-center gap-6">
            <Pressable onPress={onBack} className="items-center py-1 active:opacity-60">
              <Text className="text-sm font-semibold text-muted">Back</Text>
            </Pressable>
            <Pressable onPress={resend} className="items-center py-1 active:opacity-60">
              <Text className="text-sm font-semibold" style={{ color: palette.primary }}>
                {resent ? "Code resent" : "Resend code"}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// Post-login nudge to turn on email 2-step verification for an account that doesn't have it yet.
function TwoFactorModal({ onEnable, onSkip }: { onEnable: () => void; onSkip: () => void }) {
  const palette = useRolePalette();
  const themeVars = useThemeVars();
  return (
    <Modal visible transparent animationType="fade">
      <View className="flex-1 justify-center bg-black/50 px-6" style={themeVars}>
        <View className="rounded-3xl p-6" style={{ backgroundColor: palette.surface }}>
          <View className="mb-4 h-14 w-14 items-center justify-center rounded-2xl" style={{ backgroundColor: palette.primarySoft }}>
            <Ionicons name="shield-checkmark-outline" size={30} color={palette.primary} />
          </View>
          <Text className="text-xl font-bold text-text">Turn on two-step verification?</Text>
          <Text className="mt-2 text-sm leading-6 text-muted">
            Add an extra layer of security — we'll email you a one-time code each time you log in. You
            can change this anytime in Settings → Security.
          </Text>
          <View className="mt-6 gap-3">
            <PrimaryButton label="Enable two-step verification" onPress={onEnable} />
            <PrimaryButton label="Not now" variant="outline" onPress={onSkip} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

function ForgotPasswordModal({ onClose }: { onClose: () => void }) {
  const palette = useRolePalette();
  const themeVars = useThemeVars();
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  const send = async () => {
    await requestPasswordReset(email.trim());
    setSent(true);
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 justify-center bg-black/50 px-6" style={themeVars}>
        <View className="rounded-3xl p-6" style={{ backgroundColor: palette.surface }}>
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="text-lg font-bold text-text">Reset your password</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={22} color={palette.muted} />
            </Pressable>
          </View>
          {sent ? (
            <>
              <View className="mb-3 h-12 w-12 items-center justify-center rounded-full" style={{ backgroundColor: palette.primarySoft }}>
                <Ionicons name="mail-outline" size={24} color={palette.primary} />
              </View>
              <Text className="text-sm leading-6 text-muted">
                If an account exists for that email, we've sent a link to reset your password.
              </Text>
              <View className="mt-6">
                <PrimaryButton label="Done" onPress={onClose} />
              </View>
            </>
          ) : (
            <>
              <Text className="mb-4 text-sm leading-6 text-muted">
                Enter the email on your account and we'll send you a reset link.
              </Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="you@email.com"
                placeholderTextColor={palette.muted}
                autoCapitalize="none"
                keyboardType="email-address"
                style={{ color: palette.text }}
                className="mb-5 rounded-2xl border border-border bg-bg px-4 py-3 text-base"
              />
              <PrimaryButton label="Send reset link" onPress={send} disabled={!EMAIL_RE.test(email.trim())} />
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

export default function Login() {
  const router = useRouter();
  const palette = useRolePalette();
  const { role, setLegalAccepted } = useAppState();
  const { logIn, setTwoFactor, completeTwoFactorLogin, cancelTwoFactorLogin } = useAuth();
  const isWorker = role === "worker";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [usernameError, setUsernameError] = useState<string | undefined>();
  const [passwordError, setPasswordError] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [showTwoFactor, setShowTwoFactor] = useState(false);
  const [pendingTwoFactorAccount, setPendingTwoFactorAccount] = useState<StoredAccount | null>(null);

  const homeRoute = isWorker ? "/worker/home" : "/client/home";

  const submit = async () => {
    setUsernameError(undefined);
    setPasswordError(undefined);
    if (!username.trim() || !password) {
      setError("Enter your username and password.");
      return;
    }
    setError(null);
    setSubmitting(true);
    const result = await logIn(role ?? "client", username.trim(), password);
    setSubmitting(false);
    if (!result.ok) {
      if (result.error === "Username incorrect.") setUsernameError(result.error);
      else if (result.error === "Password incorrect.") setPasswordError(result.error);
      else setError(result.error);
      return;
    }
    const account = result.account;
    // The role profile hydrates from the account automatically (see Worker/ClientDataContext).
    await setLegalAccepted(account.acceptedTerms);
    if (result.twoFactorPending) {
      // Password already checked out — email a one-time code and gate the rest of login on it.
      // currentUser stays null (AuthContext.logIn withheld it) until completeTwoFactorLogin runs.
      await supabase.auth.signInWithOtp({ email: account.email, options: { shouldCreateUser: false } });
      setPendingTwoFactorAccount(account);
    } else {
      // Offer to turn 2FA on for next time; this login itself already proved password ownership.
      setShowTwoFactor(true);
    }
  };

  return (
    <View className="flex-1 bg-bg">
      <ScreenHeader title="Log in" />
      <ScrollView
        contentContainerStyle={{ padding: 24, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View className="mb-5 h-14 w-14 items-center justify-center rounded-2xl" style={{ backgroundColor: palette.primarySoft }}>
          <Ionicons name="log-in-outline" size={26} color={palette.primary} />
        </View>
        <Text className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted">
          {isWorker ? "Business owner" : "Client"}
        </Text>
        <Text className="mb-6 text-2xl font-bold text-text">Welcome back</Text>

        <FormField
          label="Username"
          value={username}
          onChangeText={(t) => { setUsername(t); setUsernameError(undefined); }}
          placeholder="jordan"
          autoCapitalize="none"
          autoCorrect={false}
          error={usernameError}
        />
        <FormField
          label="Password"
          value={password}
          onChangeText={(t) => { setPassword(t); setPasswordError(undefined); }}
          placeholder="Your password"
          secureTextEntry
          autoCapitalize="none"
          error={passwordError}
        />

        {error ? (
          <View className="mb-3 flex-row items-center gap-1.5">
            <Ionicons name="alert-circle" size={14} color={palette.danger} />
            <Text className="flex-1 text-xs" style={{ color: palette.danger }}>{error}</Text>
          </View>
        ) : null}

        <PrimaryButton label="Log in" onPress={submit} loading={submitting} />

        <Pressable onPress={() => setShowForgot(true)} className="mt-4 items-center py-1 active:opacity-60">
          <Text className="text-sm font-semibold" style={{ color: palette.primary }}>Forgot password?</Text>
        </Pressable>

        <Pressable onPress={() => router.replace("/signup")} className="mt-2 flex-row justify-center py-2 active:opacity-60">
          <Text className="text-sm text-muted">New to SideKick? </Text>
          <Text className="text-sm font-semibold" style={{ color: palette.primary }}>Sign up</Text>
        </Pressable>
      </ScrollView>

      {showForgot ? <ForgotPasswordModal onClose={() => setShowForgot(false)} /> : null}
      {showTwoFactor ? (
        <TwoFactorModal
          onEnable={async () => { await setTwoFactor(true); router.replace(homeRoute); }}
          onSkip={() => router.replace(homeRoute)}
        />
      ) : null}
      {pendingTwoFactorAccount ? (
        <TwoFactorCodeModal
          email={pendingTwoFactorAccount.email}
          onVerified={() => {
            completeTwoFactorLogin(pendingTwoFactorAccount);
            router.replace(homeRoute);
          }}
          onBack={async () => {
            await cancelTwoFactorLogin();
            setPendingTwoFactorAccount(null);
          }}
        />
      ) : null}
    </View>
  );
}
