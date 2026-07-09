import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PrimaryButton } from "../src/components/PrimaryButton";
import { useAuth } from "../src/context/AuthContext";
import { useRolePalette } from "../src/theme/useRolePalette";
import { PLANS, planFeatures, priceFor, yearlySavings, type BillingCycle, type Plan } from "../src/data/plans";

function PlanCard({
  plan,
  cycle,
  current,
  onChoose,
}: {
  plan: Plan;
  cycle: BillingCycle;
  current: boolean;
  onChoose: () => void;
}) {
  const palette = useRolePalette();
  const price = priceFor(plan, cycle);
  const perMonth = cycle === "yearly" ? (plan.yearly / 12).toFixed(2) : null;
  const savings = yearlySavings(plan);

  return (
    <View
      className="rounded-3xl border-2 p-5"
      style={{
        borderColor: plan.popular ? palette.primary : palette.border,
        backgroundColor: plan.popular ? palette.primarySoft : palette.surface,
      }}
    >
      <View className="flex-row items-center justify-between">
        <Text className="text-lg font-extrabold text-text">{plan.name}</Text>
        {plan.popular ? (
          <View className="rounded-full px-2.5 py-1" style={{ backgroundColor: palette.primary }}>
            <Text className="text-[10px] font-bold uppercase tracking-wider" style={{ color: palette.primaryFg }}>Most popular</Text>
          </View>
        ) : null}
      </View>
      <Text className="mt-0.5 text-sm text-muted">{plan.blurb}</Text>

      <View className="mt-3 flex-row items-end gap-1">
        <Text className="text-3xl font-extrabold text-text">${price.toFixed(2)}</Text>
        <Text className="mb-1 text-sm text-muted">/{cycle === "monthly" ? "mo" : "yr"}</Text>
      </View>
      {cycle === "yearly" ? (
        <Text className="text-xs text-muted">${perMonth}/mo billed yearly · save ${savings.toFixed(2)}</Text>
      ) : null}

      <View className="mt-4">
        <PrimaryButton
          label={current ? "Current plan" : "Choose"}
          variant={plan.popular ? "solid" : "outline"}
          disabled={current}
          onPress={onChoose}
        />
      </View>

      <View className="mt-4 gap-2">
        {planFeatures(plan).map((f, i) => (
          <View key={i} className="flex-row items-center gap-2">
            <Ionicons
              name={f.included ? "checkmark-circle" : "close-circle"}
              size={16}
              color={f.included ? palette.success : palette.muted}
            />
            <Text
              className="flex-1 text-sm"
              style={{ color: f.included ? palette.text : palette.muted, fontWeight: f.highlight ? "700" : "400" }}
            >
              {f.text}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export default function Plans() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const palette = useRolePalette();
  const params = useLocalSearchParams<{ onboarding?: string }>();
  const onboarding = params.onboarding === "1";
  const { currentUser } = useAuth();

  const [cycle, setCycle] = useState<BillingCycle>("monthly");

  const choose = (plan: Plan) => {
    router.push(`/checkout?plan=${plan.id}&cycle=${cycle}${onboarding ? "&onboarding=1" : ""}`);
  };

  return (
    <View className="flex-1 bg-bg">
      <View
        className="flex-row items-center justify-between border-b border-border bg-bg px-5 pb-4"
        style={{ paddingTop: insets.top + 12 }}
      >
        {onboarding ? (
          <Text className="text-lg font-bold text-text">Pick a plan</Text>
        ) : (
          <View className="flex-row items-center gap-3">
            <Pressable onPress={() => router.back()} hitSlop={8} className="h-9 w-9 items-center justify-center rounded-full border border-border bg-surface active:opacity-70">
              <Ionicons name="chevron-back" size={18} color={palette.text} />
            </Pressable>
            <Text className="text-lg font-bold text-text">Your plan</Text>
          </View>
        )}
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <Text className="text-2xl font-bold text-text">Choose your plan</Text>
        <Text className="mt-1 text-sm leading-6 text-muted">
          {onboarding
            ? "A plan is required to run your business on SideKick. Pick one to finish setting up — you can change or cancel anytime."
            : "Unlock advertising, business tools, and groups. You can change or cancel anytime."}
        </Text>

        {/* Monthly / yearly toggle */}
        <View className="mt-5 flex-row rounded-2xl border border-border bg-surface p-1">
          {(["monthly", "yearly"] as const).map((c) => {
            const active = cycle === c;
            return (
              <Pressable
                key={c}
                onPress={() => setCycle(c)}
                className="flex-1 flex-row items-center justify-center gap-1.5 rounded-xl py-2.5"
                style={{ backgroundColor: active ? palette.primary : "transparent" }}
              >
                <Text className="text-sm font-semibold" style={{ color: active ? palette.primaryFg : palette.muted }}>
                  {c === "monthly" ? "Monthly" : "Yearly"}
                </Text>
                {c === "yearly" ? (
                  <View className="rounded-full px-1.5 py-0.5" style={{ backgroundColor: active ? palette.primaryFg : palette.primarySoft }}>
                    <Text className="text-[9px] font-bold" style={{ color: active ? palette.primary : palette.primary }}>SAVE</Text>
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>

        <View className="mt-5 gap-4">
          {PLANS.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              cycle={cycle}
              current={currentUser?.plan === plan.id}
              onChoose={() => choose(plan)}
            />
          ))}
        </View>

        <View className="mt-6 flex-row items-start gap-2 px-1">
          <Ionicons name="lock-closed-outline" size={14} color={palette.muted} />
          <Text className="flex-1 text-xs leading-5 text-muted">
            Prices shown for demo. Real billing runs through Stripe once connected — job payments are
            always cash and separate from this.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
