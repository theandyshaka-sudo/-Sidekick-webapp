import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAppState, type Role } from "../src/context/AppStateContext";
import { RoleCard } from "../src/components/RoleCard";

export default function RoleSelect() {
  const { setRole } = useAppState();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const choose = async (role: Role) => {
    await setRole(role);
    router.replace("/auth");
  };

  return (
    <View className="flex-1 bg-bg">
      <StatusBar style="light" />
      <LinearGradient
        colors={["#D97706", "#2563EB"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ paddingTop: insets.top + 16, paddingBottom: 64, paddingHorizontal: 24 }}
      >
        <View className="flex-row items-center gap-2">
          <View className="h-8 w-8 items-center justify-center rounded-lg bg-white/20">
            <Ionicons name="flash" size={18} color="white" />
          </View>
          <Text className="text-base font-bold text-white">SideKick</Text>
        </View>

        <Text className="mt-8 text-3xl font-extrabold leading-tight text-white">
          Local services, run by{"\n"}young entrepreneurs.
        </Text>
        <Text className="mt-3 text-base leading-6 text-white/85">
          SideKick connects verified local business owners with neighbors who need a
          hand — yard work, cleaning, moving, and more.
        </Text>
      </LinearGradient>

      <ScrollView
        className="-mt-6 flex-1 rounded-t-3xl bg-bg"
        contentContainerStyle={{ padding: 24, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <Text className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted">
          Get started
        </Text>
        <Text className="mb-5 text-xl font-bold text-text">Which are you?</Text>

        <View className="gap-4">
          <RoleCard
            tone="worker"
            emphasized
            badge="Ages 14–21"
            title="I run a service business"
            subtitle="Advertise your services and get hired locally."
            photoUri="https://picsum.photos/seed/sidekick-worker-hero/160/160"
            bullets={["You set your own prices", "Accept or decline any job", "Get paid securely after each job"]}
            onPress={() => choose("worker")}
          />
          <RoleCard
            tone="client"
            badge="Ages 21+"
            title="I need to hire help"
            subtitle="Find and book trusted local young business owners."
            onPress={() => choose("client")}
          />
        </View>

        <Pressable
          onPress={() => router.replace("/admin-login")}
          className="mt-6 flex-row items-center justify-center gap-1.5 py-2 active:opacity-60"
        >
          <Ionicons name="shield-checkmark-outline" size={14} color="#94A3B8" />
          <Text className="text-sm font-semibold" style={{ color: "#94A3B8" }}>Admin login</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
