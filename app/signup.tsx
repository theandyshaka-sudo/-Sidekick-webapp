import { useRef, useState } from "react";
import { Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ScreenHeader } from "../src/components/settings/ScreenHeader";
import { FormField } from "../src/components/FormField";
import { PrimaryButton } from "../src/components/PrimaryButton";
import { useAppState } from "../src/context/AppStateContext";
import { useAuth } from "../src/context/AuthContext";
import { useRolePalette } from "../src/theme/useRolePalette";
import { useThemeVars } from "../src/theme/useThemeVars";
import { MIN_PLATFORM_AGE, ageFromDob } from "../src/data/categoriesConfig";

type FieldKey =
  | "firstName" | "lastName" | "businessName" | "dob" | "email"
  | "username" | "password" | "confirm" | "zip" | "city" | "country" | "terms";

function toIsoDob(month: string, day: string, year: string): string | null {
  const m = Number(month), d = Number(day), y = Number(year);
  if (!m || !d || !y || m < 1 || m > 12 || d < 1 || d > 31 || year.length !== 4) return null;
  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null;
  if (date.getTime() > Date.now()) return null;
  return date.toISOString();
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function Checkbox({ checked, onToggle, label }: { checked: boolean; onToggle: () => void; label: React.ReactNode }) {
  const palette = useRolePalette();
  return (
    <Pressable onPress={onToggle} className="flex-row items-start gap-3 active:opacity-70">
      <View
        className="mt-0.5 h-5 w-5 items-center justify-center rounded-md border-2"
        style={{
          borderColor: checked ? palette.primary : palette.border,
          backgroundColor: checked ? palette.primary : "transparent",
        }}
      >
        {checked ? <Ionicons name="checkmark" size={14} color={palette.primaryFg} /> : null}
      </View>
      <View className="flex-1">{label}</View>
    </Pressable>
  );
}

// Shown after the account is created — the user can flesh out their profile now or jump straight
// to ID verification.
function FinishProfileModal({ onEdit, onSkip }: { onEdit: () => void; onSkip: () => void }) {
  const palette = useRolePalette();
  const themeVars = useThemeVars();
  return (
    <Modal visible transparent animationType="fade">
      <View className="flex-1 justify-center bg-black/50 px-6" style={themeVars}>
        <View className="rounded-3xl p-6" style={{ backgroundColor: palette.surface }}>
          <View className="mb-4 h-14 w-14 items-center justify-center rounded-2xl" style={{ backgroundColor: palette.primarySoft }}>
            <Ionicons name="person-circle-outline" size={30} color={palette.primary} />
          </View>
          <Text className="text-xl font-bold text-text">Account created!</Text>
          <Text className="mt-2 text-sm leading-6 text-muted">
            Want to finish setting up your profile now — add a photo and a short description — or do
            it later?
          </Text>
          <View className="mt-6 gap-3">
            <PrimaryButton label="Finish creating profile" onPress={onEdit} />
            <PrimaryButton label="Not now" variant="outline" onPress={onSkip} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function SignUp() {
  const router = useRouter();
  const palette = useRolePalette();
  const { role, setLegalAccepted } = useAppState();
  const { signUp } = useAuth();
  const isWorker = role === "worker";

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [month, setMonth] = useState("");
  const [day, setDay] = useState("");
  const [year, setYear] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [zip, setZip] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("United States");
  const [agreed, setAgreed] = useState(false);
  const [errorField, setErrorField] = useState<FieldKey | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [confirmFocused, setConfirmFocused] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showFinish, setShowFinish] = useState(false);

  const refs = useRef<Record<string, TextInput | null>>({});
  // Clear the current field error as soon as the user starts fixing anything.
  const clearErr = () => { if (errorField || errorMsg) { setErrorField(null); setErrorMsg(null); } };
  const errFor = (f: FieldKey) => (errorField === f ? errorMsg ?? undefined : undefined);

  const validate = ():
    | { ok: true; dobIso: string }
    | { ok: false; field: FieldKey; error: string } => {
    if (!firstName.trim()) return { ok: false, field: "firstName", error: "First name isn't filled out." };
    if (!isWorker && !lastName.trim()) return { ok: false, field: "lastName", error: "Last name isn't filled out." };
    if (isWorker && !businessName.trim()) return { ok: false, field: "businessName", error: "Business name isn't filled out." };
    let dobIso = "";
    if (isWorker) {
      const iso = toIsoDob(month, day, year);
      if (!iso) return { ok: false, field: "dob", error: "Enter a valid date of birth." };
      if (ageFromDob(iso) < MIN_PLATFORM_AGE) return { ok: false, field: "dob", error: `SideKick is for ages ${MIN_PLATFORM_AGE} and up.` };
      dobIso = iso;
    }
    if (!EMAIL_RE.test(email.trim())) return { ok: false, field: "email", error: email.trim() ? "That email doesn't look right." : "Email isn't filled out." };
    if (!username.trim()) return { ok: false, field: "username", error: "Username isn't filled out." };
    if (password.length < 6) return { ok: false, field: "password", error: "Password must be at least 6 characters." };
    if (password !== confirm) return { ok: false, field: "confirm", error: confirm.length ? "Passwords don't match." : "Re-enter your password to confirm." };
    if (zip.length !== 5) return { ok: false, field: "zip", error: "Enter a 5-digit zip code." };
    if (!city.trim()) return { ok: false, field: "city", error: "City isn't filled out." };
    if (!country.trim()) return { ok: false, field: "country", error: "Country isn't filled out." };
    if (!agreed) return { ok: false, field: "terms", error: "Please agree to the Terms of Service to continue." };
    return { ok: true, dobIso };
  };

  // Flag a field, show its message, and scroll/focus straight to it.
  const fail = (field: FieldKey, message: string) => {
    setErrorField(field);
    setErrorMsg(message);
    const focusKey = field === "dob" ? "dobMonth" : field;
    refs.current[focusKey]?.focus();
  };

  const submit = async () => {
    const v = validate();
    if (!v.ok) {
      fail(v.field, v.error);
      return;
    }
    setErrorField(null);
    setErrorMsg(null);
    setSubmitting(true);
    const result = await signUp({
      role: role ?? "client",
      firstName: firstName.trim(),
      lastName: isWorker ? "" : lastName.trim(),
      businessName: isWorker ? businessName.trim() : "",
      dobIso: v.dobIso,
      email: email.trim(),
      username: username.trim(),
      password,
      zip,
      city: city.trim(),
      country: country.trim(),
      acceptedTerms: true,
      avatarUri: "",
      bio: "",
    });
    setSubmitting(false);
    if (!result.ok) {
      // Point the duplicate-username / duplicate-email errors at the right box.
      const lower = result.error.toLowerCase();
      if (lower.includes("username")) fail("username", result.error);
      else if (lower.includes("email")) fail("email", result.error);
      else { setErrorField(null); setErrorMsg(result.error); }
      return;
    }
    // The role profile hydrates from the new account automatically (see Worker/ClientDataContext).
    await setLegalAccepted(true);
    setShowFinish(true);
  };

  const editRoute = isWorker ? "/settings/worker-edit-profile" : "/settings/client-edit-profile";
  // Live confirm-password feedback: show the check/X once they start re-typing.
  const passwordsMatch = password.length > 0 && password === confirm;
  const showMatch = confirm.length > 0;
  const confirmBorder = showMatch
    ? passwordsMatch ? palette.success : palette.danger
    : errorField === "confirm" ? palette.danger
    : confirmFocused ? palette.primary
    : palette.border;

  return (
    <View className="flex-1 bg-bg">
      <ScreenHeader title="Create account" />
      <ScrollView
        contentContainerStyle={{ padding: 24, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted">
          {isWorker ? "Business owner" : "Client"}
        </Text>
        <Text className="mb-6 text-2xl font-bold text-text">Tell us about you</Text>

        <FormField
          label="First name"
          inputRef={(el) => { refs.current.firstName = el; }}
          value={firstName}
          onChangeText={(t) => { setFirstName(t); clearErr(); }}
          placeholder="Jordan"
          autoCapitalize="words"
          error={errFor("firstName")}
        />

        {!isWorker ? (
          <FormField
            label="Last name"
            inputRef={(el) => { refs.current.lastName = el; }}
            value={lastName}
            onChangeText={(t) => { setLastName(t); clearErr(); }}
            placeholder="Rivera"
            autoCapitalize="words"
            error={errFor("lastName")}
          />
        ) : null}

        {isWorker ? (
          <>
            <Text className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted">Date of birth</Text>
            <View className="flex-row gap-2">
              {[
                { key: "dobMonth", v: month, set: setMonth, ph: "MM", max: 2 },
                { key: "dobDay", v: day, set: setDay, ph: "DD", max: 2 },
                { key: "dobYear", v: year, set: setYear, ph: "YYYY", max: 4, flex: true },
              ].map((f) => (
                <TextInput
                  key={f.key}
                  ref={(el) => { refs.current[f.key] = el; }}
                  value={f.v}
                  onChangeText={(t) => { f.set(t.replace(/[^0-9]/g, "").slice(0, f.max)); clearErr(); }}
                  placeholder={f.ph}
                  placeholderTextColor={palette.muted}
                  keyboardType="number-pad"
                  style={{ color: palette.text, flex: f.flex ? 1.4 : 1, minWidth: 0, borderColor: errorField === "dob" ? palette.danger : palette.border }}
                  className="rounded-2xl border bg-surface px-4 py-3 text-center text-base"
                />
              ))}
            </View>
            {errorField === "dob" ? (
              <View className="mt-1.5 flex-row items-center gap-1.5">
                <Ionicons name="alert-circle" size={13} color={palette.danger} />
                <Text className="text-xs" style={{ color: palette.danger }}>{errorMsg}</Text>
              </View>
            ) : null}
            <View className="mb-4" />
            <FormField
              label="Business name"
              inputRef={(el) => { refs.current.businessName = el; }}
              value={businessName}
              onChangeText={(t) => { setBusinessName(t); clearErr(); }}
              placeholder="Jordan's Yard Care"
              autoCapitalize="words"
              error={errFor("businessName")}
            />
          </>
        ) : null}

        <FormField
          label="Email"
          inputRef={(el) => { refs.current.email = el; }}
          value={email}
          onChangeText={(t) => { setEmail(t); clearErr(); }}
          placeholder="you@email.com"
          autoCapitalize="none"
          keyboardType="email-address"
          error={errFor("email")}
        />
        <FormField
          label="Username"
          inputRef={(el) => { refs.current.username = el; }}
          value={username}
          onChangeText={(t) => { setUsername(t); clearErr(); }}
          placeholder="jordan"
          autoCapitalize="none"
          autoCorrect={false}
          error={errFor("username")}
        />
        <FormField
          label="Password"
          inputRef={(el) => { refs.current.password = el; }}
          value={password}
          onChangeText={(t) => { setPassword(t); clearErr(); }}
          placeholder="At least 6 characters"
          secureTextEntry
          autoCapitalize="none"
          error={errFor("password")}
        />

        <View className="mb-4">
          <Text className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted">Confirm password</Text>
          <View className="flex-row items-center rounded-2xl border bg-surface px-4" style={{ borderColor: confirmBorder }}>
            <TextInput
              ref={(el) => { refs.current.confirm = el; }}
              value={confirm}
              onChangeText={(t) => { setConfirm(t); clearErr(); }}
              onFocus={() => setConfirmFocused(true)}
              onBlur={() => setConfirmFocused(false)}
              placeholder="Re-enter your password"
              placeholderTextColor={palette.muted}
              secureTextEntry
              autoCapitalize="none"
              className="flex-1 py-3 text-base text-text"
              style={{ minWidth: 0 }}
            />
            {showMatch ? (
              <Ionicons
                name={passwordsMatch ? "checkmark-circle" : "close-circle"}
                size={22}
                color={passwordsMatch ? palette.success : palette.danger}
              />
            ) : null}
          </View>
          {showMatch && !passwordsMatch ? (
            <Text className="mt-1.5 text-xs" style={{ color: palette.danger }}>Passwords don't match yet</Text>
          ) : errorField === "confirm" ? (
            <View className="mt-1.5 flex-row items-center gap-1.5">
              <Ionicons name="alert-circle" size={13} color={palette.danger} />
              <Text className="text-xs" style={{ color: palette.danger }}>{errorMsg}</Text>
            </View>
          ) : null}
        </View>

        <FormField
          label="Zip code"
          inputRef={(el) => { refs.current.zip = el; }}
          value={zip}
          onChangeText={(t) => { setZip(t.replace(/[^0-9]/g, "").slice(0, 5)); clearErr(); }}
          placeholder="10701"
          keyboardType="number-pad"
          error={errFor("zip")}
        />
        <FormField
          label="City"
          inputRef={(el) => { refs.current.city = el; }}
          value={city}
          onChangeText={(t) => { setCity(t); clearErr(); }}
          placeholder="Yonkers"
          autoCapitalize="words"
          error={errFor("city")}
        />
        <FormField
          label="Country"
          inputRef={(el) => { refs.current.country = el; }}
          value={country}
          onChangeText={(t) => { setCountry(t); clearErr(); }}
          placeholder="United States"
          autoCapitalize="words"
          error={errFor("country")}
        />

        <View className="mb-2 mt-1">
          <Checkbox
            checked={agreed}
            onToggle={() => { setAgreed((v) => !v); clearErr(); }}
            label={
              <Text className="text-sm leading-5 text-muted">
                I agree to the{" "}
                <Text className="font-semibold" style={{ color: palette.primary }}>Terms of Service</Text>
                {" "}and{" "}
                <Text className="font-semibold" style={{ color: palette.primary }}>Privacy Policy</Text>.
              </Text>
            }
          />
          {errorField === "terms" ? (
            <View className="ml-8 mt-1.5 flex-row items-center gap-1.5">
              <Ionicons name="alert-circle" size={13} color={palette.danger} />
              <Text className="text-xs" style={{ color: palette.danger }}>{errorMsg}</Text>
            </View>
          ) : null}
        </View>

        {errorMsg && !errorField ? (
          <View className="mb-3 mt-2 flex-row items-center gap-1.5">
            <Ionicons name="alert-circle" size={14} color={palette.danger} />
            <Text className="flex-1 text-xs" style={{ color: palette.danger }}>{errorMsg}</Text>
          </View>
        ) : null}

        <View className="mt-4">
          <PrimaryButton label="Create account" onPress={submit} loading={submitting} />
        </View>

        <Pressable onPress={() => router.replace("/login")} className="mt-4 flex-row justify-center py-2 active:opacity-60">
          <Text className="text-sm text-muted">Already have an account? </Text>
          <Text className="text-sm font-semibold" style={{ color: palette.primary }}>Log in</Text>
        </Pressable>
      </ScrollView>

      {showFinish ? (
        <FinishProfileModal
          onEdit={() => router.replace(`${editRoute}?onboarding=1`)}
          onSkip={() => router.replace("/onboarding/verify?onboarding=1")}
        />
      ) : null}
    </View>
  );
}
