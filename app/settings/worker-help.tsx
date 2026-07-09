import { Alert, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ScreenHeader } from "../../src/components/settings/ScreenHeader";
import { PrimaryButton } from "../../src/components/PrimaryButton";
import { useRolePalette } from "../../src/theme/useRolePalette";

const FAQS = [
  {
    question: "How and when do I get paid?",
    answer:
      "Clients pay you directly in cash when the job is done. SideKick doesn't process payments — after you check out, ask the client to confirm \"I paid\" in their app so it's logged for your records.",
  },
  {
    question: "Can I set my own prices?",
    answer: "Yes. You always set your own prices for every service you list — SideKick never sets or caps them.",
  },
  {
    question: "What if a client cancels or doesn't pay?",
    answer:
      "Report it from the job's detail screen. Since there's no held payment to release, disputes are reviewed using your messages and check-in/out log.",
  },
  {
    question: "I'm under 18 — what changes for me?",
    answer:
      "A guardian is linked to your account and can see your upcoming jobs, job location, and check-in/out status. Some categories are 18+ only for safety reasons.",
  },
];

export default function WorkerHelp() {
  const palette = useRolePalette();

  return (
    <View className="flex-1 bg-bg">
      <ScreenHeader title="Help & support" />
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <View className="gap-3">
          {FAQS.map((faq) => (
            <View key={faq.question} className="rounded-2xl border border-border bg-surface p-4">
              <View className="mb-1.5 flex-row items-start gap-2">
                <Ionicons name="help-circle" size={18} color={palette.primary} />
                <Text className="flex-1 text-sm font-semibold text-text">{faq.question}</Text>
              </View>
              <Text className="text-sm leading-5 text-muted">{faq.answer}</Text>
            </View>
          ))}
        </View>

        <View className="mt-6">
          <PrimaryButton
            label="Contact support"
            variant="outline"
            onPress={() => Alert.alert("Contact support", "Email us anytime at support@sidekick.app")}
          />
        </View>
      </ScrollView>
    </View>
  );
}
