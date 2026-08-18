import { useEffect } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { AgeSelector } from "../../src/components/AgeSelector";
import { useAppState } from "../../src/context/AppStateContext";
import { useWorkerData } from "../../src/context/WorkerDataContext";
import { useRolePalette } from "../../src/theme/useRolePalette";

export default function OnboardingAge() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const palette = useRolePalette();
  const params = useLocalSearchParams<{ onboarding?: string }>();
  const onboarding = params.onboarding === "1";

  const { role } = useAppState();
  const worker = useWorkerData();
  const isWorker = role === "worker";

  const homeRoute = isWorker ? "/worker/home" : "/client/home";
  const leave = () => {
    if (onboarding) {
      // Finished onboarding — clear the whole signup stack so you can't go "back" into it.
      router.dismissAll();
      router.replace(homeRoute);
    } else {
      router.back();
    }
  };
  const goBack = () => (router.canGoBack() ? router.back() : router.replace("/role-select"));

  // Only business owners have an age gate on job categories — clients skip straight through.
  useEffect(() => {
    if (!isWorker) leave();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isWorker]);

  if (!isWorker) return null;

  return (
    <View className="flex-1 bg-bg">
      <View
        className="flex-row items-center justify-between border-b border-border bg-bg px-6 pb-4"
        style={{ paddingTop: insets.top + 12 }}
      >
        {onboarding ? (
          <View className="flex-row items-center gap-2">
            <Pressable onPress={goBack} hitSlop={8} className="h-9 w-9 items-center justify-center rounded-full border border-border bg-surface active:opacity-70">
              <Ionicons name="chevron-back" size={18} color={palette.text} />
            </Pressable>
            <View className="h-2 w-8 rounded-full" style={{ backgroundColor: palette.primary }} />
            <View className="h-2 w-2 rounded-full" style={{ backgroundColor: palette.primary }} />
            <Text className="ml-1 text-xs font-semibold uppercase tracking-wider text-muted">Last step</Text>
          </View>
        ) : (
          <View className="flex-row items-center gap-3">
            <Pressable onPress={() => router.back()} hitSlop={8} className="h-9 w-9 items-center justify-center rounded-full border border-border bg-surface active:opacity-70">
              <Ionicons name="chevron-back" size={18} color={palette.text} />
            </Pressable>
            <Text className="text-lg font-bold text-text">Your age</Text>
          </View>
        )}
        {onboarding ? (
          <Pressable onPress={leave} hitSlop={8} className="active:opacity-60">
            <Text className="text-sm font-semibold" style={{ color: palette.primary }}>Skip for now</Text>
          </Pressable>
        ) : null}
      </View>

      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <View className="mb-5 h-14 w-14 items-center justify-center rounded-2xl" style={{ backgroundColor: palette.primarySoft }}>
          <Ionicons name="happy-outline" size={26} color={palette.primary} />
        </View>
        <Text className="text-2xl font-bold text-text">How old are you?</Text>
        <Text className="mt-2 text-sm leading-6 text-muted">
          We use your age to show you the jobs you're allowed to take. You can start exploring
          right away — adding and scheduling jobs unlocks once you've chosen.
        </Text>

        <View className="mt-7">
          <AgeSelector submitLabel="Continue" onSubmit={(age) => { worker.setAge(age); leave(); }} />
        </View>
      </ScrollView>
    </View>
  );
}
