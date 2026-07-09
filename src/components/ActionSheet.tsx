import { Modal, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRolePalette } from "../theme/useRolePalette";
import { useThemeVars } from "../theme/useThemeVars";

export type ActionSheetOption = {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  destructive?: boolean;
  onPress: () => void;
};

// A themed bottom-sheet menu. Used for message edit/delete, report reasons, and block/unblock —
// React Native's Alert can't render custom button rows reliably on web, so we roll our own.
export function ActionSheet({
  visible,
  title,
  options,
  onClose,
}: {
  visible: boolean;
  title?: string;
  options: ActionSheetOption[];
  onClose: () => void;
}) {
  const palette = useRolePalette();
  const themeVars = useThemeVars();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 justify-end bg-black/40" style={themeVars} onPress={onClose}>
        <Pressable
          className="rounded-t-3xl bg-surface px-4 pb-8 pt-3"
          style={{ backgroundColor: palette.surface }}
          onPress={(e) => e.stopPropagation()}
        >
          <View className="mb-3 items-center">
            <View className="h-1 w-10 rounded-full" style={{ backgroundColor: palette.border }} />
          </View>
          {title ? (
            <Text className="mb-2 px-2 text-center text-sm font-semibold text-muted">{title}</Text>
          ) : null}
          <View className="gap-1">
            {options.map((option) => (
              <Pressable
                key={option.label}
                onPress={() => {
                  onClose();
                  option.onPress();
                }}
                className="flex-row items-center gap-3 rounded-2xl px-4 py-3.5 active:opacity-70"
              >
                {option.icon ? (
                  <Ionicons
                    name={option.icon}
                    size={20}
                    color={option.destructive ? palette.danger : palette.text}
                  />
                ) : null}
                <Text
                  className="text-base font-medium"
                  style={{ color: option.destructive ? palette.danger : palette.text }}
                >
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>
          <Pressable
            onPress={onClose}
            className="mt-2 items-center rounded-2xl border border-border py-3.5 active:opacity-70"
          >
            <Text className="text-base font-semibold text-muted">Cancel</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
