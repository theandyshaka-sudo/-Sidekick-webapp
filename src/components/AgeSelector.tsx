import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { PrimaryButton } from "./PrimaryButton";
import { useRolePalette } from "../theme/useRolePalette";
import { MIN_PLATFORM_AGE } from "../data/categoriesConfig";

// SideKick's worker population is 14–20 (README) — pick from that range, not a free-text field.
const AGE_OPTIONS = Array.from({ length: 7 }, (_, i) => MIN_PLATFORM_AGE + i);

// Self-reported age picker — no ID, no review. Picking a number isn't enough on its own; the
// person also has to actively confirm it before the submit button unlocks.
export function AgeSelector({
  initialAge,
  submitLabel,
  onSubmit,
}: {
  initialAge?: number | null;
  submitLabel: string;
  onSubmit: (age: number) => void;
}) {
  const palette = useRolePalette();
  const [age, setAge] = useState<number | null>(initialAge ?? null);
  const [confirmed, setConfirmed] = useState(false);

  return (
    <View>
      <Text className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">Choose your age</Text>
      <View className="flex-row flex-wrap gap-2.5">
        {AGE_OPTIONS.map((a) => {
          const selected = age === a;
          return (
            <Pressable
              key={a}
              onPress={() => { setAge(a); setConfirmed(false); }}
              className="h-14 w-14 items-center justify-center rounded-2xl border"
              style={{ borderColor: selected ? palette.primary : palette.border, backgroundColor: selected ? palette.primarySoft : palette.surface }}
            >
              <Text className="text-base font-bold" style={{ color: selected ? palette.primary : palette.text }}>{a}</Text>
            </Pressable>
          );
        })}
      </View>

      {age != null ? (
        <Pressable
          onPress={() => setConfirmed((c) => !c)}
          className="mt-6 flex-row items-start gap-3 rounded-2xl border border-border bg-surface p-4 active:opacity-80"
        >
          <Ionicons name={confirmed ? "checkbox" : "square-outline"} size={20} color={confirmed ? palette.primary : palette.muted} />
          <Text className="flex-1 text-sm leading-5 text-text">Yes, I'm sure I'm {age} years old.</Text>
        </Pressable>
      ) : null}

      <Text className="mt-4 text-xs leading-5 text-muted">
        This isn't checked against an ID — we're trusting you to enter your real age. The jobs you
        can take depend on it, so please be honest.
      </Text>

      <View className="mt-6">
        <PrimaryButton
          label={submitLabel}
          onPress={() => { if (age != null) onSubmit(age); }}
          disabled={age == null || !confirmed}
        />
      </View>
    </View>
  );
}
