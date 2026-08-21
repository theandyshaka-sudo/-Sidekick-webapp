import { useState } from "react";
import { Pressable, Text, TextInput, View, type TextInputProps } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRolePalette } from "../theme/useRolePalette";

export function FormField({
  label,
  error,
  inputRef,
  secureTextEntry,
  ...inputProps
}: {
  label: string;
  error?: string;
  inputRef?: React.Ref<TextInput>;
} & TextInputProps) {
  const palette = useRolePalette();
  const [revealed, setRevealed] = useState(false);

  return (
    <View className="mb-4">
      <Text className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted">{label}</Text>
      <View className="justify-center" style={{ position: "relative" }}>
        <TextInput
          ref={inputRef}
          placeholderTextColor={palette.muted}
          className={`rounded-2xl border bg-surface px-4 py-3 text-base text-text ${secureTextEntry ? "pr-12" : ""}`}
          style={{ borderColor: error ? palette.danger : palette.border }}
          secureTextEntry={secureTextEntry ? !revealed : undefined}
          {...inputProps}
        />
        {secureTextEntry ? (
          <Pressable
            onPress={() => setRevealed((v) => !v)}
            hitSlop={8}
            style={{ position: "absolute", right: 12, height: 24, width: 24 }}
            className="items-center justify-center"
          >
            <Ionicons name={revealed ? "eye-off-outline" : "eye-outline"} size={19} color={palette.muted} />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <View className="mt-1.5 flex-row items-center gap-1.5">
          <Ionicons name="alert-circle" size={13} color={palette.danger} />
          <Text className="flex-1 text-xs" style={{ color: palette.danger }}>{error}</Text>
        </View>
      ) : null}
    </View>
  );
}
