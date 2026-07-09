import { ActivityIndicator, Pressable, Text, type GestureResponderEvent } from "react-native";
import { useRolePalette } from "../theme/useRolePalette";

export function PrimaryButton({
  label,
  onPress,
  loading,
  disabled,
  variant = "solid",
}: {
  label: string;
  onPress: (event: GestureResponderEvent) => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: "solid" | "outline";
}) {
  const palette = useRolePalette();
  const isSolid = variant === "solid";

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      className={`items-center rounded-2xl px-6 py-4 active:opacity-80 ${
        isSolid ? "bg-primary" : "border-2 border-primary bg-transparent"
      } ${disabled ? "opacity-50" : ""}`}
    >
      {loading ? (
        <ActivityIndicator color={isSolid ? palette.primaryFg : palette.primary} />
      ) : (
        <Text className={`text-base font-semibold ${isSolid ? "text-primary-fg" : "text-primary"}`}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}
