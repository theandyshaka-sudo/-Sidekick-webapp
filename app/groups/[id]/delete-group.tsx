import { useState } from "react";
import { Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ScreenHeader } from "../../../src/components/settings/ScreenHeader";
import { FormField } from "../../../src/components/FormField";
import { PrimaryButton } from "../../../src/components/PrimaryButton";
import { useGroups } from "../../../src/context/GroupsContext";
import { useAuth } from "../../../src/context/AuthContext";
import { useRolePalette } from "../../../src/theme/useRolePalette";

export default function DeleteGroup() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const palette = useRolePalette();
  const g = useGroups();
  const { verifyPassword } = useAuth();
  const group = g.getGroup(id);

  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  if (!group) {
    return (
      <View className="flex-1 bg-bg"><ScreenHeader title="Delete group" /><View className="flex-1 items-center justify-center"><Text className="text-sm text-muted">Group not found.</Text></View></View>
    );
  }

  if (group.ownerId !== g.me.userId) {
    return (
      <View className="flex-1 bg-bg"><ScreenHeader title="Delete group" /><View className="flex-1 items-center justify-center px-8"><Text className="text-center text-sm text-muted">You're not this group's owner.</Text></View></View>
    );
  }

  const confirm = async () => {
    if (!password) return setError("Enter your password to confirm.");
    setDeleting(true);
    setError(null);
    const ok = await verifyPassword(password);
    if (!ok) {
      setDeleting(false);
      return setError("That password is incorrect.");
    }
    try {
      await g.deleteGroup(group.id);
      router.replace("/worker/groups");
    } catch {
      setDeleting(false);
      setError("Something went wrong deleting the group. Try again.");
    }
  };

  return (
    <View className="flex-1 bg-bg">
      <ScreenHeader title="Delete group" />
      <View className="flex-1 items-center px-8 pt-12">
        <View className="h-16 w-16 items-center justify-center rounded-2xl" style={{ backgroundColor: palette.danger + "22" }}>
          <Ionicons name="warning-outline" size={30} color={palette.danger} />
        </View>
        <Text className="mt-4 text-center text-xl font-bold text-text">Delete {group.name}?</Text>
        <Text className="mt-3 text-center text-sm leading-6 text-muted">
          Every member is removed, and everything in this group — messages, announcements, rules,
          FAQs, roles, and the moderation log — is permanently deleted. There's no going back.
        </Text>
        <View className="mt-8 w-full">
          <FormField
            label="Confirm your password"
            value={password}
            onChangeText={(t) => { setPassword(t); setError(null); }}
            placeholder="Password"
            secureTextEntry
            error={error ?? undefined}
          />
        </View>
        <View className="mt-2 w-full gap-3">
          <PrimaryButton label={`Yes, delete ${group.name}`} onPress={confirm} loading={deleting} />
          <PrimaryButton label="Cancel" variant="outline" onPress={() => router.back()} />
        </View>
      </View>
    </View>
  );
}
