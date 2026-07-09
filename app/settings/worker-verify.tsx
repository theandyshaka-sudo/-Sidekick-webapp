import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ScreenHeader } from "../../src/components/settings/ScreenHeader";
import { PrimaryButton } from "../../src/components/PrimaryButton";
import { Badge } from "../../src/components/Badge";
import { useWorkerData, type DocumentType } from "../../src/context/WorkerDataContext";
import { useVerificationQueue } from "../../src/context/VerificationQueueContext";
import { useRolePalette } from "../../src/theme/useRolePalette";
import {
  MIN_PLATFORM_AGE,
  ageFromDob,
  isCategoryUnlocked,
  serviceCategories,
} from "../../src/data/categoriesConfig";

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

function VerifiedView({ dobIso, onReverify }: { dobIso: string; onReverify: () => void }) {
  const palette = useRolePalette();
  const age = ageFromDob(dobIso);
  const unlocked = serviceCategories.filter((c) => isCategoryUnlocked(c, age));
  const locked = serviceCategories.filter((c) => !isCategoryUnlocked(c, age));

  return (
    <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
      <View className="items-center rounded-3xl border border-border bg-surface p-6">
        <View className="h-14 w-14 items-center justify-center rounded-full" style={{ backgroundColor: palette.success + "22" }}>
          <Ionicons name="shield-checkmark" size={28} color={palette.success} />
        </View>
        <Text className="mt-3 text-lg font-bold text-text">Age verified</Text>
        <Text className="mt-0.5 text-sm text-muted">You're {age} years old</Text>
        {age < 18 ? (
          <View className="mt-3">
            <Badge label="Minor — guardian layer applies" tone="muted" />
          </View>
        ) : null}
      </View>

      <Text className="mb-3 mt-7 text-sm font-semibold uppercase tracking-wider text-muted">
        Jobs you can offer ({unlocked.length})
      </Text>
      <View className="gap-2.5">
        {unlocked.map((c) => (
          <View key={c.slug} className="flex-row items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3">
            <Ionicons name="checkmark-circle" size={18} color={palette.success} />
            <Text className="flex-1 text-sm font-medium text-text">{c.name}</Text>
          </View>
        ))}
      </View>

      {locked.length > 0 ? (
        <>
          <Text className="mb-3 mt-7 text-sm font-semibold uppercase tracking-wider text-muted">
            Locked for your age ({locked.length})
          </Text>
          <View className="gap-2.5">
            {locked.map((c) => (
              <View key={c.slug} className="flex-row items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3 opacity-70">
                <Ionicons name="lock-closed" size={16} color={palette.muted} />
                <View className="flex-1">
                  <Text className="text-sm font-medium text-text">{c.name}</Text>
                  <Text className="text-xs text-muted">{c.note ?? `Available at ${c.minAge}.`}</Text>
                </View>
              </View>
            ))}
          </View>
        </>
      ) : null}

      {age < 18 ? (
        <View className="mt-6 flex-row items-start gap-2 px-1">
          <Ionicons name="people-outline" size={16} color={palette.muted} />
          <Text className="flex-1 text-xs leading-5 text-muted">
            Because you're under 18, a linked guardian must approve your account and bookings, and
            hazardous 18+ categories stay locked (HANDOFF.md §6).
          </Text>
        </View>
      ) : null}

      <View className="mt-6">
        <PrimaryButton label="Re-verify" variant="outline" onPress={onReverify} />
      </View>
    </ScrollView>
  );
}

export default function WorkerVerify() {
  const palette = useRolePalette();
  const { profile, verification, submitForVerification, clearVerification } = useWorkerData();
  const { submitId } = useVerificationQueue();
  const [docType, setDocType] = useState<DocumentType | null>(null);
  const [scanned, setScanned] = useState(false);
  const [month, setMonth] = useState("");
  const [day, setDay] = useState("");
  const [year, setYear] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (verification.status === "verified" && verification.verifiedDob) {
    return (
      <View className="flex-1 bg-bg">
        <ScreenHeader title="Age verification" />
        <VerifiedView dobIso={verification.verifiedDob} onReverify={clearVerification} />
      </View>
    );
  }

  if (verification.status === "pending") {
    return (
      <View className="flex-1 bg-bg">
        <ScreenHeader title="Age verification" />
        <View className="items-center px-6 pt-16">
          <View className="h-16 w-16 items-center justify-center rounded-full" style={{ backgroundColor: palette.primarySoft }}>
            <Ionicons name="hourglass-outline" size={30} color={palette.primary} />
          </View>
          <Text className="mt-4 text-xl font-bold text-text">ID submitted for review</Text>
          <Text className="mt-2 text-center text-sm leading-6 text-muted">
            An admin is reviewing your ID to confirm your age. This usually takes a little while —
            you'll be able to add and schedule jobs as soon as it's approved.
          </Text>
          <View className="mt-6 w-full">
            <PrimaryButton label="Cancel submission" variant="outline" onPress={clearVerification} />
          </View>
        </View>
      </View>
    );
  }

  const submit = () => {
    if (!docType) return;
    const iso = toIsoDob(month, day, year);
    if (!iso) {
      setError("Enter a valid date of birth as shown on your document.");
      return;
    }
    if (ageFromDob(iso) < MIN_PLATFORM_AGE) {
      setError(`SideKick is for ages ${MIN_PLATFORM_AGE} and up.`);
      return;
    }
    submitForVerification(docType, iso);
    submitId({ name: profile.displayName, submitterRole: "worker", documentType: docType, dobIso: iso, photoUri: profile.avatarUri });
  };

  return (
    <View className="flex-1 bg-bg">
      <ScreenHeader title="Verify your age" />
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <View className="mb-5 h-14 w-14 items-center justify-center rounded-2xl" style={{ backgroundColor: palette.primarySoft }}>
          <Ionicons name="finger-print" size={26} color={palette.primary} />
        </View>
        <Text className="text-2xl font-bold text-text">Verify your age with an ID</Text>
        <Text className="mt-2 text-sm leading-6 text-muted">
          We confirm your age with a government ID or passport to unlock the jobs you're eligible
          for. Your document is encrypted, used only to confirm your date of birth, and is never
          shown to clients.
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
            ID documents are sensitive. At launch they're handled by a verification provider
            (Stripe Identity/Persona), encrypted, access-restricted, and purged per policy — never
            exposed across the marketplace (HANDOFF.md §0.3).
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
