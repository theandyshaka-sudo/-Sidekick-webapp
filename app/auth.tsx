import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppState } from "../src/context/AppStateContext";
import { PrimaryButton } from "../src/components/PrimaryButton";
import { useRolePalette } from "../src/theme/useRolePalette";

export default function Auth() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const palette = useRolePalette();
  const { role } = useAppState();

  const isWorker = role === "worker";
  const roleLabel = isWorker ? "Business owner" : "Client";

  return (
    <View className="flex-1 bg-bg">
      <StatusBar style="light" />
      <LinearGradient
        colors={[palette.primary, palette.accent]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ paddingTop: insets.top + 16, paddingBottom: 72, paddingHorizontal: 24 }}
      >
        <Pressable
          onPress={() => router.replace("/role-select")}
          hitSlop={8}
          className="mb-8 h-9 w-9 items-center justify-center rounded-full bg-white/20 active:opacity-70"
        >
          <Ionicons name="chevron-back" size={18} color="white" />
        </Pressable>

        <View className="flex-row items-center gap-2">
          <View className="h-8 w-8 items-center justify-center rounded-lg bg-white/20">
            <Ionicons name="flash" size={18} color="white" />
          </View>
          <Text className="text-base font-bold text-white">SideKick</Text>
        </View>

        <Text className="mt-8 text-3xl font-extrabold leading-tight text-white">
          Welcome{"\n"}{isWorker ? "business owner." : "back."}
        </Text>
        <Text className="mt-3 text-base leading-6 text-white/85">
          {isWorker
            ? "Create your account to advertise your services and get hired locally."
            : "Create your account to find and book trusted local business owners."}
        </Text>
      </LinearGradient>

      <View className="-mt-6 flex-1 rounded-t-3xl bg-bg px-6 pt-8">
        <View className="mb-6 self-start rounded-full border border-border bg-surface px-3 py-1">
          <Text className="text-xs font-semibold" style={{ color: palette.primary }}>{roleLabel}</Text>
        </View>

        <View className="gap-3">
          <PrimaryButton label="Sign up" onPress={() => router.push("/signup")} />
          <PrimaryButton label="Log in" variant="outline" onPress={() => router.push("/login")} />
        </View>

        <View className="mt-6 flex-row items-start gap-2 px-1">
          <Ionicons name="lock-closed-outline" size={14} color={palette.muted} />
          <Text className="flex-1 text-xs leading-5 text-muted">
            Accounts are stored on this device for now. A secure cloud backend (with email
            verification) connects before launch.
          </Text>
        </View>
      </View>
    </View>
  );
}
