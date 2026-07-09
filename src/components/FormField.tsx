import { Text, TextInput, View, type TextInputProps } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRolePalette } from "../theme/useRolePalette";

export function FormField({
  label,
  error,
  inputRef,
  ...inputProps
}: {
  label: string;
  error?: string;
  inputRef?: React.Ref<TextInput>;
} & TextInputProps) {
  const palette = useRolePalette();

  return (
    <View className="mb-4">
      <Text className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted">{label}</Text>
      <TextInput
        ref={inputRef}
        placeholderTextColor={palette.muted}
        className="rounded-2xl border bg-surface px-4 py-3 text-base text-text"
        style={{ borderColor: error ? palette.danger : palette.border }}
        {...inputProps}
      />
      {error ? (
        <View className="mt-1.5 flex-row items-center gap-1.5">
          <Ionicons name="alert-circle" size={13} color={palette.danger} />
          <Text className="flex-1 text-xs" style={{ color: palette.danger }}>{error}</Text>
        </View>
      ) : null}
    </View>
  );
}
