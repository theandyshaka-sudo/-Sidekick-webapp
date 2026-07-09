import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { Redirect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAppState } from "../src/context/AppStateContext";
import { recordLegalAcceptance } from "../src/lib/legal";
import { legalCopy } from "../src/data/legalCopy";
import { PrimaryButton } from "../src/components/PrimaryButton";
import { useRolePalette } from "../src/theme/useRolePalette";

export default function Legal() {
  const { role, setLegalAccepted } = useAppState();
  const router = useRouter();
  const palette = useRolePalette();
  const [submitting, setSubmitting] = useState(false);

  if (!role) return <Redirect href="/role-select" />;

  const copy = legalCopy[role];

  const agree = async () => {
    setSubmitting(true);
    await recordLegalAcceptance(copy.agreementKey);
    await setLegalAccepted(true);
    setSubmitting(false);
    router.replace(role === "worker" ? "/worker/home" : "/client/home");
  };

  return (
    <View className="flex-1 bg-bg">
      <ScrollView
        className="flex-1 px-6"
        contentContainerStyle={{ paddingTop: 72, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="mb-6 flex-row items-center gap-2">
          <View className="h-2 w-8 rounded-full bg-primary" />
          <View className="h-2 w-2 rounded-full bg-primary" />
          <Text className="ml-2 text-xs font-semibold uppercase tracking-wider text-muted">
            Step 2 of 2
          </Text>
        </View>

        <View
          className="mb-5 h-14 w-14 items-center justify-center rounded-2xl"
          style={{ backgroundColor: palette.primarySoft }}
        >
          <Ionicons name={copy.icon} size={26} color={palette.primary} />
        </View>

        <Text className="mb-5 text-2xl font-bold text-text">{copy.heading}</Text>

        <View className="rounded-2xl border border-border bg-surface p-5">
          <Text className="text-base leading-6 text-muted">{copy.body}</Text>
        </View>

        <View className="mt-4 flex-row items-start gap-2 px-1">
          <Ionicons name="information-circle-outline" size={16} color={palette.muted} />
          <Text className="flex-1 text-xs leading-5 text-muted">
            Draft copy — final agreement text must be provided by licensed counsel before launch
            (see HANDOFF.md §7).
          </Text>
        </View>
      </ScrollView>

      <View className="border-t border-border px-6 pb-10 pt-4">
        <PrimaryButton label="I Agree & Continue" onPress={agree} loading={submitting} />
      </View>
    </View>
  );
}
