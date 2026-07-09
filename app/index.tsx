import { ActivityIndicator, View } from "react-native";
import { Redirect } from "expo-router";
import { useAppState } from "../src/context/AppStateContext";
import { useAuth } from "../src/context/AuthContext";

export default function Index() {
  const { role, legalAccepted, isLoading } = useAppState();
  const { currentUser, isLoading: authLoading } = useAuth();

  if (isLoading || authLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-bg">
        <ActivityIndicator />
      </View>
    );
  }

  // 1. Pick who you are → 2. sign up or log in → 3. accept terms → 4. into the app.
  if (!role) return <Redirect href="/role-select" />;
  if (!currentUser) return <Redirect href="/auth" />;
  if (!legalAccepted) return <Redirect href="/legal" />;
  return <Redirect href={role === "worker" ? "/worker/home" : "/client/home"} />;
}
