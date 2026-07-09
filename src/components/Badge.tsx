import { Text, View } from "react-native";

type Tone = "primary" | "success" | "muted" | "danger";

const backgroundByTone: Record<Tone, string> = {
  primary: "bg-primary-soft",
  success: "bg-success/15",
  muted: "bg-muted/15",
  danger: "bg-danger/15",
};

const textByTone: Record<Tone, string> = {
  primary: "text-primary",
  success: "text-success",
  muted: "text-muted",
  danger: "text-danger",
};

export function Badge({ label, tone = "primary" }: { label: string; tone?: Tone }) {
  return (
    <View className={`self-start rounded-full px-3 py-1 ${backgroundByTone[tone]}`}>
      <Text className={`text-xs font-semibold ${textByTone[tone]}`}>{label}</Text>
    </View>
  );
}
