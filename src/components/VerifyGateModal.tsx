import { Modal, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { PrimaryButton } from "./PrimaryButton";
import { useRolePalette } from "../theme/useRolePalette";
import { useThemeVars } from "../theme/useThemeVars";
import type { Role } from "../context/AppStateContext";

// Blocks an action until the user is verified. Business owners verify their age; clients verify
// their identity. `action` completes the sentence "…before you can ___".
export function VerifyGateModal({
  visible,
  role,
  action,
  onVerify,
  onClose,
}: {
  visible: boolean;
  role: Role;
  action: string;
  onVerify: () => void;
  onClose: () => void;
}) {
  const palette = useRolePalette();
  const themeVars = useThemeVars();
  const isWorker = role === "worker";

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 justify-center bg-black/50 px-6" style={themeVars}>
        <View className="rounded-3xl p-6" style={{ backgroundColor: palette.surface }}>
          <View className="mb-4 h-14 w-14 items-center justify-center rounded-2xl" style={{ backgroundColor: palette.primarySoft }}>
            <Ionicons name="shield-checkmark-outline" size={30} color={palette.primary} />
          </View>
          <Text className="text-xl font-bold text-text">
            {isWorker ? "Verify your age first" : "Verify your identity first"}
          </Text>
          <Text className="mt-2 text-sm leading-6 text-muted">
            You need to {isWorker ? "verify your age" : "verify your identity"} before you can {action}.
            It only takes a minute — an admin reviews your ID.
          </Text>
          <View className="mt-6 gap-3">
            <PrimaryButton label="Verify now" onPress={onVerify} />
            <PrimaryButton label="Not now" variant="outline" onPress={onClose} />
          </View>
        </View>
      </View>
    </Modal>
  );
}
