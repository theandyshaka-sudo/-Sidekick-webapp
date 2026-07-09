import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ScreenHeader } from "../../../src/components/settings/ScreenHeader";
import { Avatar } from "../../../src/components/Avatar";
import { FormField } from "../../../src/components/FormField";
import { PrimaryButton } from "../../../src/components/PrimaryButton";
import { useGroups } from "../../../src/context/GroupsContext";
import { useRolePalette } from "../../../src/theme/useRolePalette";

const PHOTO_OPTIONS = ["", ...[20, 33, 48, 56, 64].map((n) => `https://picsum.photos/seed/group-${n}/200/200`)];

export default function EditGroup() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const palette = useRolePalette();
  const g = useGroups();
  const group = g.getGroup(id);

  const [name, setName] = useState(group?.name ?? "");
  const [description, setDescription] = useState(group?.description ?? "");
  const [isPrivate, setIsPrivate] = useState(group?.isPrivate ?? false);
  const [photoIndex, setPhotoIndex] = useState(Math.max(0, PHOTO_OPTIONS.indexOf(group?.avatarUri ?? "")));
  const [error, setError] = useState<string | null>(null);

  if (!group) {
    return (
      <View className="flex-1 bg-bg"><ScreenHeader title="Edit group" /><View className="flex-1 items-center justify-center"><Text className="text-sm text-muted">Group not found.</Text></View></View>
    );
  }

  const save = () => {
    if (!name.trim()) return setError("Give your group a name.");
    g.updateGroup(group.id, { name: name.trim(), description: description.trim(), avatarUri: PHOTO_OPTIONS[photoIndex], isPrivate });
    router.back();
  };

  return (
    <View className="flex-1 bg-bg">
      <ScreenHeader title="Edit group" />
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 40 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View className="mb-6 items-center">
          <View>
            <Avatar uri={PHOTO_OPTIONS[photoIndex]} name={name || "Group"} size={88} />
            <Pressable onPress={() => setPhotoIndex((i) => (i + 1) % PHOTO_OPTIONS.length)} className="absolute -bottom-1 -right-1 h-8 w-8 items-center justify-center rounded-full border-2 border-bg bg-primary">
              <Ionicons name="camera" size={14} color={palette.primaryFg} />
            </Pressable>
          </View>
          <Text className="mt-2 text-xs text-muted">Tap the camera to change the group photo</Text>
        </View>

        <FormField label="Group name" value={name} onChangeText={(t) => { setName(t); setError(null); }} placeholder="Group name" error={error ?? undefined} />
        <FormField label="Description" value={description} onChangeText={setDescription} placeholder="What's this group about?" multiline numberOfLines={3} style={{ minHeight: 80, textAlignVertical: "top" }} />

        <Text className="mb-2 mt-1 text-xs font-semibold uppercase tracking-wider text-muted">Privacy</Text>
        <View className="gap-2.5">
          {([
            { v: false, icon: "earth", label: "Public", desc: "Anyone can find and join instantly." },
            { v: true, icon: "lock-closed", label: "Private", desc: "People must request to join and be accepted." },
          ] as const).map((opt) => {
            const active = isPrivate === opt.v;
            return (
              <Pressable key={opt.label} onPress={() => setIsPrivate(opt.v)} className="flex-row items-center gap-3 rounded-2xl border bg-surface px-4 py-3.5 active:opacity-70" style={{ borderColor: active ? palette.primary : palette.border }}>
                <Ionicons name={opt.icon} size={18} color={active ? palette.primary : palette.muted} />
                <View className="flex-1"><Text className="text-sm font-semibold text-text">{opt.label}</Text><Text className="text-xs text-muted">{opt.desc}</Text></View>
                {active ? <Ionicons name="checkmark-circle" size={20} color={palette.primary} /> : null}
              </Pressable>
            );
          })}
        </View>

        <View className="mt-6"><PrimaryButton label="Save changes" onPress={save} /></View>
      </ScrollView>
    </View>
  );
}
