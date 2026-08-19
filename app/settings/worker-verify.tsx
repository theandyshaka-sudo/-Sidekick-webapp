import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ScreenHeader } from "../../src/components/settings/ScreenHeader";
import { PrimaryButton } from "../../src/components/PrimaryButton";
import { Badge } from "../../src/components/Badge";
import { AgeSelector } from "../../src/components/AgeSelector";
import { useWorkerData } from "../../src/context/WorkerDataContext";
import { useRolePalette } from "../../src/theme/useRolePalette";
import { isCategoryUnlocked, serviceCategories } from "../../src/data/categoriesConfig";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
}

export default function WorkerVerify() {
  const palette = useRolePalette();
  const { ageInfo, setAge } = useWorkerData();
  const [changing, setChanging] = useState(false);
  const [cooldownUntil, setCooldownUntil] = useState<string | null>(null);

  if (ageInfo.age == null || changing) {
    const handleSubmit = async (age: number) => {
      const result = await setAge(age);
      if (!result.ok) {
        setCooldownUntil(result.availableOn);
        return;
      }
      setCooldownUntil(null);
      setChanging(false);
    };

    return (
      <View className="flex-1 bg-bg">
        <ScreenHeader title={ageInfo.age == null ? "Choose your age" : "Change your age"} />
        <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          {cooldownUntil ? (
            <View className="mb-5 flex-row items-center gap-2 rounded-2xl border border-border bg-surface p-3">
              <Ionicons name="time-outline" size={16} color={palette.muted} />
              <Text className="flex-1 text-xs text-muted">
                You can only change your age once a month. You can change it again on {formatDate(cooldownUntil)}.
              </Text>
            </View>
          ) : null}
          <AgeSelector
            initialAge={ageInfo.age}
            submitLabel={ageInfo.age == null ? "Continue" : "Save"}
            onSubmit={handleSubmit}
          />
          {ageInfo.age != null ? (
            <View className="mt-3">
              <PrimaryButton label="Cancel" variant="outline" onPress={() => { setChanging(false); setCooldownUntil(null); }} />
            </View>
          ) : null}
        </ScrollView>
      </View>
    );
  }

  const age = ageInfo.age;
  const unlocked = serviceCategories.filter((c) => isCategoryUnlocked(c, age));
  const locked = serviceCategories.filter((c) => !isCategoryUnlocked(c, age));

  return (
    <View className="flex-1 bg-bg">
      <ScreenHeader title="Your age" />
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <View className="items-center rounded-3xl border border-border bg-surface p-6">
          <View className="h-14 w-14 items-center justify-center rounded-full" style={{ backgroundColor: palette.primarySoft }}>
            <Ionicons name="happy-outline" size={28} color={palette.primary} />
          </View>
          <Text className="mt-3 text-lg font-bold text-text">You're {age}</Text>
          <Text className="mt-0.5 text-center text-xs text-muted">Self-reported — not checked against an ID</Text>
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
          <PrimaryButton label="Change age" variant="outline" onPress={() => setChanging(true)} />
        </View>
      </ScrollView>
    </View>
  );
}
