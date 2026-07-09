import { useRef, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ScreenHeader } from "../src/components/settings/ScreenHeader";
import { PrimaryButton } from "../src/components/PrimaryButton";
import { FinishProfileModal } from "../src/components/FinishProfileModal";
import { useAuth } from "../src/context/AuthContext";
import { useRolePalette } from "../src/theme/useRolePalette";
import { planById, priceFor, type BillingCycle, type PlanId } from "../src/data/plans";

type CardField = "name" | "number" | "expiry" | "cvc" | "zip";

function cardBrand(digits: string): string | null {
  if (digits.startsWith("4")) return "Visa";
  if (/^5[1-5]/.test(digits) || /^2[2-7]/.test(digits)) return "Mastercard";
  if (/^3[47]/.test(digits)) return "Amex";
  if (digits.startsWith("6")) return "Discover";
  return null;
}
function formatCardNumber(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
}
function formatExpiry(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 4);
  return d.length <= 2 ? d : `${d.slice(0, 2)}/${d.slice(2)}`;
}

export default function Checkout() {
  const router = useRouter();
  const palette = useRolePalette();
  const params = useLocalSearchParams<{ plan?: string; cycle?: string; onboarding?: string }>();
  const onboarding = params.onboarding === "1";
  const cycle: BillingCycle = params.cycle === "yearly" ? "yearly" : "monthly";
  const plan = planById((params.plan as PlanId) ?? null);
  const { updateAccount } = useAuth();

  const [cardType, setCardType] = useState<"credit" | "debit">("credit");
  const [name, setName] = useState("");
  const [number, setNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [zip, setZip] = useState("");
  const [errorField, setErrorField] = useState<CardField | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [paid, setPaid] = useState(false);
  const [showFinish, setShowFinish] = useState(false);

  const refs = useRef<Record<string, TextInput | null>>({});
  const clearErr = () => { if (errorField || errorMsg) { setErrorField(null); setErrorMsg(null); } };
  const borderFor = (f: CardField) => (errorField === f ? palette.danger : palette.border);

  if (!plan) {
    return (
      <View className="flex-1 items-center justify-center bg-bg">
        <Text className="text-sm text-muted">Plan not found.</Text>
      </View>
    );
  }

  const price = priceFor(plan, cycle);
  const digits = number.replace(/\D/g, "");
  const brand = cardBrand(digits);

  const fail = (field: CardField, message: string) => {
    setErrorField(field);
    setErrorMsg(message);
    refs.current[field]?.focus();
  };

  const pay = async () => {
    if (!name.trim()) return fail("name", "Name on card isn't filled out.");
    if (digits.length < 15) return fail("number", digits.length === 0 ? "Card number isn't filled out." : "That card number is too short.");
    if (!/^\d{2}\/\d{2}$/.test(expiry)) return fail("expiry", expiry ? "Enter the expiry as MM/YY." : "Expiry isn't filled out.");
    const mm = Number(expiry.slice(0, 2));
    if (mm < 1 || mm > 12) return fail("expiry", "That expiry month isn't valid.");
    if (cvc.length < 3) return fail("cvc", cvc ? "The security code is too short." : "Security code isn't filled out.");
    if (zip.length !== 5) return fail("zip", zip ? "Enter a 5-digit billing zip." : "Billing zip isn't filled out.");
    setErrorField(null);
    setErrorMsg(null);
    setProcessing(true);
    // Demo only: we do NOT store or transmit card details. Real charging happens via Stripe later.
    await updateAccount({ plan: plan.id, billingCycle: cycle });
    setProcessing(false);
    setPaid(true);
  };

  const fieldError = (f: CardField) =>
    errorField === f ? (
      <View className="mt-1.5 flex-row items-center gap-1.5">
        <Ionicons name="alert-circle" size={13} color={palette.danger} />
        <Text className="text-xs" style={{ color: palette.danger }}>{errorMsg}</Text>
      </View>
    ) : null;

  if (paid) {
    return (
      <View className="flex-1 bg-bg">
        <ScreenHeader title="Payment" />
        <View className="flex-1 items-center px-8 pt-24">
          <View className="h-20 w-20 items-center justify-center rounded-full" style={{ backgroundColor: palette.success + "22" }}>
            <Ionicons name="checkmark-circle" size={48} color={palette.success} />
          </View>
          <Text className="mt-5 text-2xl font-bold text-text">You're on {plan.name}!</Text>
          <Text className="mt-2 text-center text-sm leading-6 text-muted">
            Your {plan.name} plan is active ({cycle === "monthly" ? "monthly" : "yearly"}). You can
            change or cancel it anytime from your profile.
          </Text>
          <View className="mt-8 w-full">
            <PrimaryButton
              label={onboarding ? "Continue" : "Done"}
              onPress={() => {
                if (onboarding) setShowFinish(true);
                else router.replace("/worker/profile");
              }}
            />
          </View>
        </View>
        {showFinish ? (
          <FinishProfileModal
            onEdit={() => { setShowFinish(false); router.push("/settings/worker-edit-profile?onboarding=1"); }}
            onSkip={() => { setShowFinish(false); router.push("/onboarding/verify?onboarding=1"); }}
          />
        ) : null}
      </View>
    );
  }

  return (
    <View className="flex-1 bg-bg">
      <ScreenHeader title="Checkout" />
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View className="rounded-2xl border border-border bg-surface p-4">
          <View className="flex-row items-center justify-between">
            <Text className="text-sm text-muted">{plan.name} plan · {cycle === "monthly" ? "Monthly" : "Yearly"}</Text>
            <Text className="text-lg font-extrabold text-text">${price.toFixed(2)}</Text>
          </View>
          <Text className="mt-1 text-xs text-muted">Billed {cycle === "monthly" ? "every month" : "once a year"}. Cancel anytime.</Text>
        </View>

        <Text className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wider text-muted">Card type</Text>
        <View className="flex-row gap-2">
          {(["credit", "debit"] as const).map((t) => {
            const active = cardType === t;
            return (
              <Pressable key={t} onPress={() => setCardType(t)} className="flex-1 flex-row items-center justify-center gap-2 rounded-2xl border py-3 active:opacity-70" style={{ borderColor: active ? palette.primary : palette.border, backgroundColor: active ? palette.primarySoft : palette.surface }}>
                <Ionicons name="card-outline" size={16} color={active ? palette.primary : palette.muted} />
                <Text className="text-sm font-semibold" style={{ color: active ? palette.primary : palette.text }}>{t === "credit" ? "Credit" : "Debit"}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text className="mb-1.5 mt-5 text-xs font-semibold uppercase tracking-wider text-muted">Name on card</Text>
        <TextInput
          ref={(el) => { refs.current.name = el; }}
          value={name}
          onChangeText={(t) => { setName(t); clearErr(); }}
          placeholder="Jordan Rivera"
          placeholderTextColor={palette.muted}
          autoCapitalize="words"
          className="rounded-2xl border bg-surface px-4 py-3 text-base text-text"
          style={{ borderColor: borderFor("name") }}
        />
        {fieldError("name")}

        <Text className="mb-1.5 mt-4 text-xs font-semibold uppercase tracking-wider text-muted">Card number</Text>
        <View className="flex-row items-center rounded-2xl border bg-surface px-4" style={{ borderColor: borderFor("number") }}>
          <TextInput
            ref={(el) => { refs.current.number = el; }}
            value={number}
            onChangeText={(t) => { setNumber(formatCardNumber(t)); clearErr(); }}
            placeholder="1234 5678 9012 3456"
            placeholderTextColor={palette.muted}
            keyboardType="number-pad"
            className="flex-1 py-3 text-base text-text"
            style={{ minWidth: 0 }}
          />
          {brand ? <Text className="text-xs font-semibold" style={{ color: palette.primary }}>{brand}</Text> : <Ionicons name="card" size={18} color={palette.muted} />}
        </View>
        {fieldError("number")}

        <View className="mt-4 flex-row gap-3">
          <View className="flex-1">
            <Text className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted">Expiry</Text>
            <TextInput
              ref={(el) => { refs.current.expiry = el; }}
              value={expiry}
              onChangeText={(t) => { setExpiry(formatExpiry(t)); clearErr(); }}
              placeholder="MM/YY"
              placeholderTextColor={palette.muted}
              keyboardType="number-pad"
              className="rounded-2xl border bg-surface px-4 py-3 text-base text-text"
              style={{ borderColor: borderFor("expiry") }}
            />
          </View>
          <View className="flex-1">
            <Text className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted">CVC</Text>
            <TextInput
              ref={(el) => { refs.current.cvc = el; }}
              value={cvc}
              onChangeText={(t) => { setCvc(t.replace(/\D/g, "").slice(0, 4)); clearErr(); }}
              placeholder="123"
              placeholderTextColor={palette.muted}
              keyboardType="number-pad"
              secureTextEntry
              className="rounded-2xl border bg-surface px-4 py-3 text-base text-text"
              style={{ borderColor: borderFor("cvc") }}
            />
          </View>
        </View>
        {fieldError("expiry")}
        {fieldError("cvc")}

        <Text className="mb-1.5 mt-4 text-xs font-semibold uppercase tracking-wider text-muted">Billing zip</Text>
        <TextInput
          ref={(el) => { refs.current.zip = el; }}
          value={zip}
          onChangeText={(t) => { setZip(t.replace(/\D/g, "").slice(0, 5)); clearErr(); }}
          placeholder="10701"
          placeholderTextColor={palette.muted}
          keyboardType="number-pad"
          className="rounded-2xl border bg-surface px-4 py-3 text-base text-text"
          style={{ borderColor: borderFor("zip") }}
        />
        {fieldError("zip")}

        <View className="mt-6">
          <PrimaryButton label={`Pay $${price.toFixed(2)}`} onPress={pay} loading={processing} />
        </View>

        <View className="mt-4 flex-row items-start gap-2 px-1">
          <Ionicons name="lock-closed" size={13} color={palette.muted} />
          <Text className="flex-1 text-xs leading-5 text-muted">
            Demo checkout — no real charge and no card details are saved. Real, secure payments run
            through Stripe once it's connected.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
