import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { ColorScheme } from "../theme/palette";

export type Role = "worker" | "client";

type AppState = {
  role: Role | null;
  legalAccepted: boolean;
  colorScheme: ColorScheme;
  isLoading: boolean;
  setRole: (role: Role) => Promise<void>;
  setLegalAccepted: (accepted: boolean) => Promise<void>;
  setColorScheme: (scheme: ColorScheme) => Promise<void>;
  toggleColorScheme: () => Promise<void>;
  reset: () => Promise<void>;
};

const ROLE_KEY = "sidekick.role";
const LEGAL_KEY = "sidekick.legalAccepted";
const SCHEME_KEY = "sidekick.colorScheme";

const AppStateContext = createContext<AppState | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<Role | null>(null);
  const [legalAccepted, setLegalAcceptedState] = useState(false);
  const [colorScheme, setColorSchemeState] = useState<ColorScheme>("light");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [storedRole, storedLegal, storedScheme] = await Promise.all([
        AsyncStorage.getItem(ROLE_KEY),
        AsyncStorage.getItem(LEGAL_KEY),
        AsyncStorage.getItem(SCHEME_KEY),
      ]);
      if (storedRole === "worker" || storedRole === "client") setRoleState(storedRole);
      setLegalAcceptedState(storedLegal === "true");
      if (storedScheme === "light" || storedScheme === "dark") setColorSchemeState(storedScheme);
      setIsLoading(false);
    })();
  }, []);

  const setRole = async (next: Role) => {
    await AsyncStorage.setItem(ROLE_KEY, next);
    setRoleState(next);
  };

  const setLegalAccepted = async (accepted: boolean) => {
    await AsyncStorage.setItem(LEGAL_KEY, String(accepted));
    setLegalAcceptedState(accepted);
  };

  const setColorScheme = async (scheme: ColorScheme) => {
    await AsyncStorage.setItem(SCHEME_KEY, scheme);
    setColorSchemeState(scheme);
  };

  const toggleColorScheme = async () => {
    await setColorScheme(colorScheme === "light" ? "dark" : "light");
  };

  const reset = async () => {
    // Keep the color-scheme preference across logout — it's a device setting, not account data.
    await AsyncStorage.multiRemove([ROLE_KEY, LEGAL_KEY]);
    setRoleState(null);
    setLegalAcceptedState(false);
  };

  return (
    <AppStateContext.Provider
      value={{
        role,
        legalAccepted,
        colorScheme,
        isLoading,
        setRole,
        setLegalAccepted,
        setColorScheme,
        toggleColorScheme,
        reset,
      }}
    >
      {children}
    </AppStateContext.Provider>
  );
}

export function useAppState() {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error("useAppState must be used within AppStateProvider");
  return ctx;
}
