import { Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Avatar } from "../../src/components/Avatar";
import { PrimaryButton } from "../../src/components/PrimaryButton";
import { ReviewCard } from "../../src/components/ReviewCard";
import { SettingsRow } from "../../src/components/settings/SettingsRow";
import { useAppState } from "../../src/context/AppStateContext";
import { useAuth } from "../../src/context/AuthContext";
import { useWorkerData } from "../../src/context/WorkerDataContext";
import { useJobs } from "../../src/context/JobsContext";
import { useRolePalette } from "../../src/theme/useRolePalette";
import { workerProfile as staticProfile } from "../../src/data/workerMock";
import { ageFromDob, isCategoryUnlocked, serviceCategories } from "../../src/data/categoriesConfig";

export default function WorkerProfile() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const palette = useRolePalette();
  const { reset } = useAppState();
  const { logOut } = useAuth();
  const { profile, verification } = useWorkerData();
  const { rating, reviews } = useJobs();

  const handleLogout = async () => {
    await logOut();
    await reset();
    router.replace("/");
  };

  const verifiedAge = verification.verifiedDob ? ageFromDob(verification.verifiedDob) : null;
  const unlockedCount = verifiedAge != null
    ? serviceCategories.filter((c) => isCategoryUnlocked(c, verifiedAge)).length
    : 0;

  return (
    <ScrollView
      className="flex-1 bg-bg"
      contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 24, paddingBottom: 32 }}
      showsVerticalScrollIndicator={false}
    >
      <Text className="mb-6 text-2xl font-bold text-text">Profile</Text>

      <View className="items-center rounded-3xl border border-border bg-surface p-6">
        <Avatar uri={profile.avatarUri} name={profile.displayName} size={72} />
        <Text className="mt-3 text-lg font-bold text-text">{profile.businessName || "Your business"}</Text>
        <Text className="text-sm text-muted">{profile.displayName || "Add your name in Edit profile"}</Text>
        <View className="mt-2 flex-row items-center gap-1">
          <Ionicons name="star" size={14} color={palette.primary} />
          <Text className="text-sm text-muted">
            {rating.count ? `${rating.average.toFixed(1)} (${rating.count} ${rating.count === 1 ? "review" : "reviews"})` : "No reviews yet"}
            {" · "}Member since {staticProfile.memberSince}
          </Text>
        </View>
        <View className="mt-4 w-full">
          <PrimaryButton
            label="Edit profile"
            variant="outline"
            onPress={() => router.push("/settings/worker-edit-profile")}
          />
        </View>
      </View>

      <Pressable
        onPress={() => router.push("/settings/worker-verify")}
        className="mt-4 flex-row items-center gap-3 rounded-2xl border px-4 py-3.5 active:opacity-70"
        style={{
          borderColor: verification.status === "verified" ? palette.success : palette.primary,
          backgroundColor: verification.status === "verified" ? palette.success + "18" : palette.primarySoft,
        }}
      >
        <Ionicons
          name={verification.status === "verified" ? "shield-checkmark" : "finger-print"}
          size={22}
          color={verification.status === "verified" ? palette.success : palette.primary}
        />
        <View className="flex-1">
          <Text className="text-sm font-semibold text-text">
            {verification.status === "verified" ? "Age verified" : "Verify your age"}
          </Text>
          <Text className="text-xs text-muted">
            {verification.status === "verified"
              ? `You're ${verifiedAge} · ${unlockedCount} job ${unlockedCount === 1 ? "category" : "categories"} unlocked`
              : "Confirm your age with an ID to unlock jobs you can do"}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={palette.muted} />
      </Pressable>

      {reviews.length > 0 ? (
        <>
          <Text className="mb-3 mt-7 text-sm font-semibold uppercase tracking-wider text-muted">
            Recent reviews
          </Text>
          <View className="gap-3">
            {reviews.slice(0, 3).map((review) => (
              <ReviewCard
                key={review.id}
                author={review.author}
                avatar={review.avatar}
                rating={review.rating}
                text={review.text}
                date={review.date}
              />
            ))}
          </View>
        </>
      ) : null}

      <Text className="mb-3 mt-7 text-sm font-semibold uppercase tracking-wider text-muted">
        Settings
      </Text>
      <View className="gap-2.5">
        <SettingsRow
          icon="pricetag-outline"
          label="My services & pricing"
          onPress={() => router.push("/settings/worker-services")}
        />
        <SettingsRow
          icon="notifications-outline"
          label="Notifications"
          onPress={() => router.push("/settings/worker-notifications")}
        />
        <SettingsRow
          icon="alarm-outline"
          label="Alarms"
          onPress={() => router.push("/settings/worker-alarms")}
        />
        <SettingsRow
          icon="contrast-outline"
          label="Appearance"
          onPress={() => router.push("/settings/appearance")}
        />
        <SettingsRow
          icon="shield-checkmark-outline"
          label="Security"
          onPress={() => router.push("/settings/security")}
        />
        <SettingsRow
          icon="document-text-outline"
          label="Legal documents"
          onPress={() => router.push("/settings/worker-legal")}
        />
        <SettingsRow
          icon="help-circle-outline"
          label="Help & support"
          onPress={() => router.push("/settings/worker-help")}
        />
        <SettingsRow icon="log-out-outline" label="Log out" danger onPress={handleLogout} />
      </View>
    </ScrollView>
  );
}
