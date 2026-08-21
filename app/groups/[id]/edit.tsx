import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ScreenHeader } from "../../../src/components/settings/ScreenHeader";
import { Avatar } from "../../../src/components/Avatar";
import { ActionSheet, type ActionSheetOption } from "../../../src/components/ActionSheet";
import { FormField } from "../../../src/components/FormField";
import { PrimaryButton } from "../../../src/components/PrimaryButton";
import { useAuth } from "../../../src/context/AuthContext";
import { useGroups } from "../../../src/context/GroupsContext";
import { useRolePalette } from "../../../src/theme/useRolePalette";
import { pickAndUploadPhoto } from "../../../src/lib/uploadPhoto";

export default function EditGroup() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const palette = useRolePalette();
  const { currentUser } = useAuth();
  const g = useGroups();
  const group = g.getGroup(id);

  const [name, setName] = useState(group?.name ?? "");
  const [description, setDescription] = useState(group?.description ?? "");
  const [rules, setRules] = useState(group?.rules ?? "");
  const [isPrivate, setIsPrivate] = useState(group?.isPrivate ?? false);
  const [avatarUri, setAvatarUri] = useState(group?.avatarUri ?? "");
  const [photoOpen, setPhotoOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!group) {
    return (
      <View className="flex-1 bg-bg"><ScreenHeader title="Edit group" /><View className="flex-1 items-center justify-center"><Text className="text-sm text-muted">Group not found.</Text></View></View>
    );
  }

  const pickPhoto = async (source: "camera" | "library") => {
    if (!currentUser) return;
    setUploading(true);
    const url = await pickAndUploadPhoto(source, currentUser.id, "group");
    setUploading(false);
    if (url) setAvatarUri(url);
  };

  const photoOptions: ActionSheetOption[] = [
    { label: "Take photo", icon: "camera-outline", onPress: () => pickPhoto("camera") },
    { label: "Choose from library", icon: "image-outline", onPress: () => pickPhoto("library") },
  ];

  const save = () => {
    if (!name.trim()) return setError("Give your group a name.");
    g.updateGroup(group.id, { name: name.trim(), description: description.trim(), avatarUri, isPrivate, rules: rules.trim() });
    router.back();
  };

  return (
    <View className="flex-1 bg-bg">
      <ScreenHeader title="Edit group" />
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 40 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View className="mb-6 items-center">
          <View>
            <Avatar uri={avatarUri} name={name || "Group"} size={88} />
            <Pressable
              onPress={() => setPhotoOpen(true)}
              disabled={uploading}
              className="absolute -bottom-1 -right-1 h-8 w-8 items-center justify-center rounded-full border-2 border-bg bg-primary"
              style={{ opacity: uploading ? 0.6 : 1 }}
            >
              <Ionicons name="camera" size={14} color={palette.primaryFg} />
            </Pressable>
          </View>
          <Text className="mt-2 text-xs text-muted">{uploading ? "Uploading…" : "Tap the camera to change the group photo"}</Text>
        </View>

        <FormField label="Group name" value={name} onChangeText={(t) => { setName(t); setError(null); }} placeholder="Group name" error={error ?? undefined} />
        <FormField label="Description" value={description} onChangeText={setDescription} placeholder="What's this group about?" multiline numberOfLines={3} style={{ minHeight: 80, textAlignVertical: "top" }} />
        <FormField
          label="Rules"
          value={rules}
          onChangeText={setRules}
          placeholder="Be kind. No spam. Stay on topic…"
          multiline
          numberOfLines={4}
          style={{ minHeight: 100, textAlignVertical: "top" }}
        />

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

      <ActionSheet visible={photoOpen} title="Group photo" options={photoOptions} onClose={() => setPhotoOpen(false)} />
    </View>
  );
}
