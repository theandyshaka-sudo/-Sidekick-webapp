import "../global.css";
import { StatusBar } from "expo-status-bar";
import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppStateProvider, useAppState } from "../src/context/AppStateContext";
import { AuthProvider } from "../src/context/AuthContext";
import { WorkerDataProvider } from "../src/context/WorkerDataContext";
import { ClientDataProvider } from "../src/context/ClientDataContext";
import { MessagesProvider } from "../src/context/MessagesContext";
import { JobsProvider } from "../src/context/JobsContext";
import { GroupsProvider } from "../src/context/GroupsContext";
import { ThemeSurface } from "../src/theme/ThemeSurface";

function ThemedStack() {
  const { role, colorScheme, accentColor, textSize } = useAppState();
  return (
    <ThemeSurface role={role ?? "client"} colorScheme={colorScheme} accentColor={accentColor} textSize={textSize}>
      <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
      <Stack screenOptions={{ headerShown: false }} />
    </ThemeSurface>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppStateProvider>
        <AuthProvider>
          <WorkerDataProvider>
            <ClientDataProvider>
              <MessagesProvider>
                <JobsProvider>
                  <GroupsProvider>
                    <ThemedStack />
                  </GroupsProvider>
                </JobsProvider>
              </MessagesProvider>
            </ClientDataProvider>
          </WorkerDataProvider>
        </AuthProvider>
      </AppStateProvider>
    </SafeAreaProvider>
  );
}
