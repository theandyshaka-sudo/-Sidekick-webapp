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
import { VerificationQueueProvider } from "../src/context/VerificationQueueContext";
import { GroupsProvider } from "../src/context/GroupsContext";
import { ThemeSurface } from "../src/theme/ThemeSurface";

function ThemedStack() {
  const { role, colorScheme } = useAppState();
  return (
    <ThemeSurface role={role ?? "client"} colorScheme={colorScheme}>
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
                  <VerificationQueueProvider>
                    <GroupsProvider>
                      <ThemedStack />
                    </GroupsProvider>
                  </VerificationQueueProvider>
                </JobsProvider>
              </MessagesProvider>
            </ClientDataProvider>
          </WorkerDataProvider>
        </AuthProvider>
      </AppStateProvider>
    </SafeAreaProvider>
  );
}
