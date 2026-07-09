import type { ViewStyle } from "react-native";
import { useAppState } from "../context/AppStateContext";
import { themes } from "./themes";

// React Native <Modal> renders its content in a separate portal that sits OUTSIDE the themed
// root View, so the CSS variables set there (via vars() in ThemeSurface) don't cascade in and
// className-based colors (bg-primary, text-text, …) silently fail. Spread this onto a modal's
// outermost element to re-establish the variables for everything inside it.
export function useThemeVars(): ViewStyle {
  const { role, colorScheme } = useAppState();
  return themes[role ?? "client"][colorScheme] as ViewStyle;
}
