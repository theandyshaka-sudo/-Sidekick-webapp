import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ScreenHeader } from "../../src/components/settings/ScreenHeader";
import { Avatar } from "../../src/components/Avatar";
import { FormField } from "../../src/components/FormField";
import { PrimaryButton } from "../../src/components/PrimaryButton";
import { useAuth } from "../../src/context/AuthContext";
import { useGroups } from "../../src/context/GroupsContext";
import { useRolePalette } from "../../src/theme/useRolePalette";
import { planById } from "../../src/data/plans";

const PHOTO_OPTIONS = ["", ...[20, 33, 48, 56, 64].map((n) => `https://picsum.photos/seed/group-${n}/200/200`)];

export default function CreateGroup() {
  const router = useRouter();
  const palette = useRolePalette();
  const { currentUser } = useAuth();
  const { groups, me, createGroup } = useGroups();

  const plan = planById(currentUser?.plan);
  const createdCount = groups.filter((g) => g.ownerId === me.userId).length;
  const limit = plan?.createGroups ?? 0;
  const allowedByPlan = limit !== 0;
  const atLimit = typeof limit === "number" && createdCount >= limit;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    if (!name.trim()) return setError("Give your group a name.");
    const id = createGroup({
      name: name.trim(),
      description: description.trim(),
      isPrivate,
      avatarUri: PHOTO_OPTIONS[photoIndex],
    });
    router.replace(`/groups/${id}`);
  };

  // Gate: plan doesn't allow creating groups, or the limit is reached.
  if (!allowedByPlan || atLimit) {
    return (
      <View className="flex-1 bg-bg">
        <ScreenHeader title="Create a group" />
        <View className="items-center px-8 pt-20">
          <View className="h-16 w-16 items-center justify-center rounded-2xl" style={{ backgroundColor: palette.primarySoft }}>
            <Ionicons name="ribbon-outline" size={30} color={palette.primary} />
          </View>
          <Text className="mt-4 text-xl font-bold text-text">
            {!allowedByPlan ? "Upgrade to create groups" : "You've hit your group limit"}
          </Text>
          <Text className="mt-2 text-center text-sm leading-6 text-muted">
            {!allowedByPlan
              ? "Creating your own group is available on the Growth plan and up. You can still join groups on any plan."
              : `Your ${plan?.name} plan lets you create ${limit} group${limit === 1 ? "" : "s"}. Upgrade for more.`}
          </Text>
          <View className="mt-6 w-full">
            <PrimaryButton label="See plans" onPress={() => router.replace("/plans")} />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-bg">
      <ScreenHeader title="Create a group" />
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 40 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View className="mb-6 items-center">
          <View>
            <Avatar uri={PHOTO_OPTIONS[photoIndex]} name={name || "New group"} size={88} />
            <Pressable
              onPress={() => setPhotoIndex((i) => (i + 1) % PHOTO_OPTIONS.length)}
              className="absolute -bottom-1 -right-1 h-8 w-8 items-center justify-center rounded-full border-2 border-bg bg-primary"
            >
              <Ionicons name="camera" size={14} color={palette.primaryFg} />
            </Pressable>
          </View>
          <Text className="mt-2 text-xs text-muted">Tap the camera to change the group photo</Text>
        </View>

        <FormField label="Group name" value={name} onChangeText={(t) => { setName(t); setError(null); }} placeholder="Lawn Care Starters" error={error ?? undefined} />
        <FormField
          label="Description"
          value={description}
          onChangeText={setDescription}
          placeholder="What's this group about?"
          multiline
          numberOfLines={3}
          style={{ minHeight: 80, textAlignVertical: "top" }}
        />

        <Text className="mb-2 mt-1 text-xs font-semibold uppercase tracking-wider text-muted">Privacy</Text>
        <View className="gap-2.5">
          {([
            { v: false, icon: "earth", label: "Public", desc: "Anyone can find and join instantly." },
            { v: true, icon: "lock-closed", label: "Private", desc: "People must request to join and be accepted." },
          ] as const).map((opt) => {
            const active = isPrivate === opt.v;
            return (
              <Pressable
                key={opt.label}
                onPress={() => setIsPrivate(opt.v)}
                className="flex-row items-center gap-3 rounded-2xl border bg-surface px-4 py-3.5 active:opacity-70"
                style={{ borderColor: active ? palette.primary : palette.border }}
              >
                <Ionicons name={opt.icon} size={18} color={active ? palette.primary : palette.muted} />
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-text">{opt.label}</Text>
                  <Text className="text-xs text-muted">{opt.desc}</Text>
                </View>
                {active ? <Ionicons name="checkmark-circle" size={20} color={palette.primary} /> : null}
              </Pressable>
            );
          })}
        </View>

        <View className="mt-6">
          <PrimaryButton label="Create group" onPress={submit} />
        </View>
        <Text className="mt-3 text-center text-xs text-muted">You'll be the group's president.</Text>
      </ScrollView>
    </View>
  );
}
