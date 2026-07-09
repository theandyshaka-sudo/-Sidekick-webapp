import { Modal, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { PrimaryButton } from "./PrimaryButton";
import { useRolePalette } from "../theme/useRolePalette";
import { useThemeVars } from "../theme/useThemeVars";

// Shown near the end of onboarding — the user can flesh out their profile now (photo, description)
// or jump straight to ID verification.
export function FinishProfileModal({ onEdit, onSkip }: { onEdit: () => void; onSkip: () => void }) {
  const palette = useRolePalette();
  const themeVars = useThemeVars();
  return (
    <Modal visible transparent animationType="fade">
      <View className="flex-1 justify-center bg-black/50 px-6" style={themeVars}>
        <View className="rounded-3xl p-6" style={{ backgroundColor: palette.surface }}>
          <View className="mb-4 h-14 w-14 items-center justify-center rounded-2xl" style={{ backgroundColor: palette.primarySoft }}>
            <Ionicons name="person-circle-outline" size={30} color={palette.primary} />
          </View>
          <Text className="text-xl font-bold text-text">You're all set!</Text>
          <Text className="mt-2 text-sm leading-6 text-muted">
            Want to finish setting up your profile now — add a photo and a short description — or do
            it later?
          </Text>
          <View className="mt-6 gap-3">
            <PrimaryButton label="Finish creating profile" onPress={onEdit} />
            <PrimaryButton label="Not now" variant="outline" onPress={onSkip} />
          </View>
        </View>
      </View>
    </Modal>
  );
}
