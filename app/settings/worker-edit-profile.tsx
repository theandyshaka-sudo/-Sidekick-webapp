import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ScreenHeader } from "../../src/components/settings/ScreenHeader";
import { Avatar } from "../../src/components/Avatar";
import { FormField } from "../../src/components/FormField";
import { PrimaryButton } from "../../src/components/PrimaryButton";
import { useWorkerData } from "../../src/context/WorkerDataContext";
import { useAuth } from "../../src/context/AuthContext";
import { useRolePalette } from "../../src/theme/useRolePalette";
import { geocodeLocation } from "../../src/lib/geocode";

const AVATAR_OPTIONS = [68, 15, 22, 8, 51].map((img) => `https://i.pravatar.cc/150?img=${img}`);

export default function WorkerEditProfile() {
  const router = useRouter();
  const palette = useRolePalette();
  const { profile, updateProfile } = useWorkerData();
  const { currentUser, updateAccount } = useAuth();
  const params = useLocalSearchParams<{ onboarding?: string }>();
  const onboarding = params.onboarding === "1";
  const [form, setForm] = useState(profile);
  const [zip, setZip] = useState(currentUser?.zip ?? "");
  const [city, setCity] = useState(currentUser?.city ?? "");
  const [radius, setRadius] = useState(
    currentUser?.travelRadiusMiles != null ? String(currentUser.travelRadiusMiles) : ""
  );

  const save = async () => {
    updateProfile(form);
    // Persist to the stored account so edits survive a reload / re-login. Re-geocode when the
    // location text changed, or when it's set but was never geocoded yet (e.g. an account whose
    // zip/city predates the geocoding feature) — but not on every save, so an unrelated
    // bio/name edit doesn't fire a Mapbox call and clobber known-good coordinates for no reason.
    const locationChanged =
      zip !== (currentUser?.zip ?? "") ||
      city !== (currentUser?.city ?? "") ||
      (!!zip.trim() && (currentUser?.lat == null || currentUser?.lng == null));
    const coords = locationChanged ? await geocodeLocation(zip, city) : null;
    await updateAccount({
      firstName: form.displayName,
      businessName: form.businessName,
      bio: form.bio,
      avatarUri: form.avatarUri,
      zip,
      city,
      travelRadiusMiles: radius.trim() ? Number(radius) : null,
      ...(locationChanged ? { lat: coords?.lat ?? null, lng: coords?.lng ?? null } : {}),
    });
    if (onboarding) router.push("/onboarding/verify?onboarding=1");
    else router.back();
  };

  const nextAvatar = () => {
    const currentIndex = AVATAR_OPTIONS.indexOf(form.avatarUri);
    const next = AVATAR_OPTIONS[(currentIndex + 1) % AVATAR_OPTIONS.length];
    setForm((prev) => ({ ...prev, avatarUri: next }));
  };

  return (
    <View className="flex-1 bg-bg">
      <ScreenHeader title="Edit profile" />
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <View className="mb-6 items-center">
          <View>
            <Avatar uri={form.avatarUri} name={form.displayName} size={88} />
            <Pressable
              onPress={nextAvatar}
              className="absolute -bottom-1 -right-1 h-8 w-8 items-center justify-center rounded-full border-2 border-bg bg-primary"
            >
              <Ionicons name="camera" size={14} color={palette.primaryFg} />
            </Pressable>
          </View>
          <Text className="mt-2 text-xs text-muted">Tap the camera to preview a new photo</Text>
        </View>

        <FormField
          label="Business name"
          value={form.businessName}
          onChangeText={(businessName) => setForm((prev) => ({ ...prev, businessName }))}
          placeholder="Your business name"
        />
        <FormField
          label="Your name"
          value={form.displayName}
          onChangeText={(displayName) => setForm((prev) => ({ ...prev, displayName }))}
          placeholder="Your name"
        />
        <FormField
          label="Bio"
          value={form.bio}
          onChangeText={(bio) => setForm((prev) => ({ ...prev, bio }))}
          placeholder="Tell clients what makes your business great"
          multiline
          numberOfLines={4}
          style={{ minHeight: 96, textAlignVertical: "top" }}
        />
        <FormField
          label="Zip code"
          value={zip}
          onChangeText={(t) => setZip(t.replace(/[^0-9]/g, "").slice(0, 5))}
          placeholder="10701"
          keyboardType="number-pad"
        />
        <FormField
          label="City / neighborhood"
          value={city}
          onChangeText={setCity}
          placeholder="Yonkers"
        />
        <Text className="mb-4 -mt-2 text-xs text-muted">
          Used to show clients real distance to your listings.
        </Text>
        <FormField
          label="Travel radius (miles)"
          value={radius}
          onChangeText={(t) => setRadius(t.replace(/[^0-9]/g, "").slice(0, 3))}
          placeholder="Leave blank for no limit"
          keyboardType="number-pad"
        />
        <Text className="mb-4 -mt-2 text-xs text-muted">
          Clients past this range won't see you in Discover. Clients just past it will see a note
          that you prefer not to travel that far, but can still reach out.
        </Text>

        <View className="mt-2">
          <PrimaryButton label={onboarding ? "Save & continue" : "Save changes"} onPress={save} />
        </View>
      </ScrollView>
    </View>
  );
}
