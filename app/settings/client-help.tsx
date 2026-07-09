import { Alert, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ScreenHeader } from "../../src/components/settings/ScreenHeader";
import { PrimaryButton } from "../../src/components/PrimaryButton";
import { useRolePalette } from "../../src/theme/useRolePalette";

const FAQS = [
  {
    question: "How do I pay for a job?",
    answer:
      "You pay the business owner directly in cash when the job is done. SideKick doesn't process payments — once you've paid, confirm \"I paid in cash\" on the booking so it's logged.",
  },
  {
    question: "Are business owners background checked?",
    answer:
      "Business owners verify their age with a document. You verify your identity and pass a background check before your first booking, since you're inviting someone into your space.",
  },
  {
    question: "What if something goes wrong during a job?",
    answer:
      "Use the in-app SOS and messaging tools, and report any issue from the booking's detail screen. Since no payment is held by SideKick, disputes are reviewed using messages and check-in/out logs.",
  },
  {
    question: "Can I request a specific business owner again?",
    answer: "Yes — search their business name from Discover, or book them again from your booking history.",
  },
];

export default function ClientHelp() {
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
