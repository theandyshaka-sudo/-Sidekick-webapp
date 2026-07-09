import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PrimaryButton } from "../../src/components/PrimaryButton";
import { useAppState } from "../../src/context/AppStateContext";
import { useAuth } from "../../src/context/AuthContext";
import { useWorkerData, type DocumentType } from "../../src/context/WorkerDataContext";
import { useClientData } from "../../src/context/ClientDataContext";
import { useVerificationQueue } from "../../src/context/VerificationQueueContext";
import { useRolePalette } from "../../src/theme/useRolePalette";
import { MIN_PLATFORM_AGE, ageFromDob } from "../../src/data/categoriesConfig";

const DOC_TYPES: Array<{ value: DocumentType; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { value: "passport", label: "Passport", icon: "airplane-outline" },
  { value: "drivers_license", label: "Driver's license", icon: "car-outline" },
  { value: "state_id", label: "State ID", icon: "card-outline" },
];

function toIsoDob(month: string, day: string, year: string): string | null {
  const m = Number(month), d = Number(day), y = Number(year);
  if (!m || !d || !y || m < 1 || m > 12 || d < 1 || d > 31 || year.length !== 4) return null;
  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null;
  if (date.getTime() > Date.now()) return null;
  return date.toISOString();
}

function prefillDob(iso: string | undefined): { m: string; d: string; y: string } {
  if (!iso) return { m: "", d: "", y: "" };
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return { m: "", d: "", y: "" };
  return {
    m: String(date.getMonth() + 1).padStart(2, "0"),
    d: String(date.getDate()).padStart(2, "0"),
    y: String(date.getFullYear()),
  };
}

export default function OnboardingVerify() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const palette = useRolePalette();
  const params = useLocalSearchParams<{ onboarding?: string }>();
  const onboarding = params.onboarding === "1";

  const { role } = useAppState();
  const { currentUser } = useAuth();
  const worker = useWorkerData();
  const client = useClientData();
  const { submitId } = useVerificationQueue();
  const isWorker = role === "worker";

  const seedDob = prefillDob(isWorker ? currentUser?.dobIso : undefined);
  const [docType, setDocType] = useState<DocumentType | null>(null);
  const [scanned, setScanned] = useState(false);
  const [month, setMonth] = useState(seedDob.m);
  const [day, setDay] = useState(seedDob.d);
  const [year, setYear] = useState(seedDob.y);
  const [error, setError] = useState<string | null>(null);

  const homeRoute = isWorker ? "/worker/home" : "/client/home";
  const leave = () => {
    if (onboarding) {
      // Finished onboarding — clear the whole signup stack so you can't go "back" into it.
      router.dismissAll();
      router.replace(homeRoute);
    } else {
      router.back();
    }
  };
  const goBack = () => (router.canGoBack() ? router.back() : router.replace("/role-select"));

  const name = isWorker
    ? worker.profile.displayName
    : client.profile.fullName;
  const avatar = isWorker ? worker.profile.avatarUri : client.profile.avatarUri;

  const submit = () => {
    if (!docType) return;
    const iso = toIsoDob(month, day, year);
    if (!iso) {
      setError("Enter a valid date of birth as shown on your document.");
      return;
    }
    const age = ageFromDob(iso);
    if (isWorker && age < MIN_PLATFORM_AGE) {
      setError(`SideKick is for ages ${MIN_PLATFORM_AGE} and up.`);
      return;
    }
    if (!isWorker && age < 18) {
      setError("Clients must be 18 or older.");
      return;
    }
    if (isWorker) worker.submitForVerification(docType, iso);
    else client.submitForVerification(iso);
    submitId({
      name,
      submitterRole: isWorker ? "worker" : "client",
      documentType: docType,
      dobIso: iso,
      photoUri: avatar,
    });
    leave();
  };

  return (
    <View className="flex-1 bg-bg">
      <View
        className="flex-row items-center justify-between border-b border-border bg-bg px-6 pb-4"
        style={{ paddingTop: insets.top + 12 }}
      >
        {onboarding ? (
          <View className="flex-row items-center gap-2">
            <Pressable onPress={goBack} hitSlop={8} className="h-9 w-9 items-center justify-center rounded-full border border-border bg-surface active:opacity-70">
              <Ionicons name="chevron-back" size={18} color={palette.text} />
            </Pressable>
            <View className="h-2 w-8 rounded-full" style={{ backgroundColor: palette.primary }} />
            <View className="h-2 w-2 rounded-full" style={{ backgroundColor: palette.primary }} />
            <Text className="ml-1 text-xs font-semibold uppercase tracking-wider text-muted">Last step</Text>
          </View>
        ) : (
          <View className="flex-row items-center gap-3">
            <Pressable onPress={() => router.back()} hitSlop={8} className="h-9 w-9 items-center justify-center rounded-full border border-border bg-surface active:opacity-70">
              <Ionicons name="chevron-back" size={18} color={palette.text} />
            </Pressable>
            <Text className="text-lg font-bold text-text">{isWorker ? "Verify your age" : "Verify your identity"}</Text>
          </View>
        )}
        {onboarding ? (
          <Pressable onPress={leave} hitSlop={8} className="active:opacity-60">
            <Text className="text-sm font-semibold" style={{ color: palette.primary }}>Skip for now</Text>
          </Pressable>
        ) : null}
      </View>

      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <View className="mb-5 h-14 w-14 items-center justify-center rounded-2xl" style={{ backgroundColor: palette.primarySoft }}>
          <Ionicons name="finger-print" size={26} color={palette.primary} />
        </View>
        <Text className="text-2xl font-bold text-text">
          {isWorker ? "Verify your age with an ID" : "Verify your identity with an ID"}
        </Text>
        <Text className="mt-2 text-sm leading-6 text-muted">
          {isWorker
            ? "We confirm your age with a government ID or passport to unlock the jobs you're eligible for. Your document is used only to confirm your date of birth and is never shown to clients."
            : "We confirm your identity with a government ID or passport so business owners know they're dealing with a real, trusted neighbor. Your document is never shown to business owners."}
        </Text>

        <Text className="mb-3 mt-7 text-sm font-semibold uppercase tracking-wider text-muted">1. Choose a document</Text>
        <View className="gap-2.5">
          {DOC_TYPES.map((doc) => {
            const selected = docType === doc.value;
            return (
              <Pressable
                key={doc.value}
                onPress={() => { setDocType(doc.value); setError(null); }}
                className="flex-row items-center justify-between rounded-2xl border bg-surface px-4 py-3.5 active:opacity-70"
                style={{ borderColor: selected ? palette.primary : palette.border }}
              >
                <View className="flex-row items-center gap-3">
                  <Ionicons name={doc.icon} size={18} color={palette.text} />
                  <Text className="text-base font-medium text-text">{doc.label}</Text>
                </View>
                {selected ? <Ionicons name="checkmark-circle" size={22} color={palette.primary} /> : null}
              </Pressable>
            );
          })}
        </View>

        {docType ? (
          <>
            <Text className="mb-3 mt-7 text-sm font-semibold uppercase tracking-wider text-muted">2. Scan your document</Text>
            <Pressable
              onPress={() => setScanned(true)}
              className="items-center justify-center rounded-2xl border border-dashed py-8 active:opacity-70"
              style={{ borderColor: scanned ? palette.success : palette.border }}
            >
              <Ionicons name={scanned ? "checkmark-circle" : "scan-outline"} size={30} color={scanned ? palette.success : palette.muted} />
              <Text className="mt-2 text-sm font-medium" style={{ color: scanned ? palette.success : palette.muted }}>
                {scanned ? "Document captured" : "Tap to scan your ID"}
              </Text>
            </Pressable>
            <Text className="mt-2 text-xs text-muted">
              Demo: real capture uses your camera + an ID-verification provider. Enter the date of
              birth on your document below to simulate the scan.
            </Text>
          </>
        ) : null}

        {docType && scanned ? (
          <>
            <Text className="mb-3 mt-7 text-sm font-semibold uppercase tracking-wider text-muted">3. Date of birth</Text>
            <View className="flex-row gap-2">
              {[
                { v: month, set: setMonth, ph: "MM", max: 2 },
                { v: day, set: setDay, ph: "DD", max: 2 },
                { v: year, set: setYear, ph: "YYYY", max: 4, flex: true },
              ].map((f, i) => (
                <TextInput
                  key={i}
                  value={f.v}
                  onChangeText={(t) => { f.set(t.replace(/[^0-9]/g, "").slice(0, f.max)); setError(null); }}
                  placeholder={f.ph}
                  placeholderTextColor={palette.muted}
                  keyboardType="number-pad"
                  style={{ color: palette.text, flex: f.flex ? 1.4 : 1, minWidth: 0 }}
                  className="rounded-2xl border border-border bg-surface px-4 py-3 text-center text-base"
                />
              ))}
            </View>
            {error ? (
              <View className="mt-2 flex-row items-center gap-1.5">
                <Ionicons name="alert-circle" size={14} color={palette.danger} />
                <Text className="text-xs" style={{ color: palette.danger }}>{error}</Text>
              </View>
            ) : null}

            <View className="mt-6">
              <PrimaryButton label="Submit for review" onPress={submit} disabled={!month || !day || year.length !== 4} />
            </View>
          </>
        ) : null}

        <View className="mt-6 flex-row items-start gap-2 px-1">
          <Ionicons name="lock-closed-outline" size={14} color={palette.muted} />
          <Text className="flex-1 text-xs leading-5 text-muted">
            An admin reviews your ID to confirm your {isWorker ? "age" : "identity"}. You can start
            exploring right away — {isWorker ? "adding and scheduling jobs" : "booking"} unlocks once
            you're approved.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
