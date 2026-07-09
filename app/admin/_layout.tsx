import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useVerificationQueue } from "../../src/context/VerificationQueueContext";
import { useRolePalette } from "../../src/theme/useRolePalette";

export default function AdminLayout() {
  const palette = useRolePalette();
  const { pendingCount } = useVerificationQueue();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: palette.primary,
        tabBarInactiveTintColor: palette.muted,
        tabBarStyle: { backgroundColor: palette.surface, borderTopColor: palette.border },
      }}
    >
      <Tabs.Screen
        name="reports"
        options={{
          title: "Reports",
          tabBarIcon: ({ color, size }) => <Ionicons name="flag" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="verifications"
        options={{
          title: "ID review",
          tabBarBadge: pendingCount > 0 ? pendingCount : undefined,
          tabBarBadgeStyle: { backgroundColor: palette.primary, color: palette.primaryFg },
          tabBarIcon: ({ color, size }) => <Ionicons name="card" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
