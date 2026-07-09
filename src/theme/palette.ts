import type { Role } from "../context/AppStateContext";

export type ColorScheme = "light" | "dark";

// Literal color values for places NativeWind's className can't reach — vector-icon `color`
// props, expo-linear-gradient `colors`, etc. Keep numerically in sync with the CSS-variable
// triples in themes.ts (each hex here has a matching "R G B" entry there).
export type Palette = {
  primary: string;
  primaryFg: string;
  primarySoft: string;
  bg: string;
  surface: string;
  text: string;
  muted: string;
  accent: string;
  success: string;
  danger: string;
  border: string;
};

export const palettes: Record<Role, Record<ColorScheme, Palette>> = {
  worker: {
    light: {
      primary: "#D97706",
      primaryFg: "#FFFFFF",
      primarySoft: "#FEF3C7",
      bg: "#FAF8F5",
      surface: "#FFFFFF",
      text: "#1C1917",
      muted: "#78716C",
      accent: "#0D9488",
      success: "#16A34A",
      danger: "#DC2626",
      border: "#E7E5E4",
    },
    dark: {
      primary: "#F59E0B",
      primaryFg: "#1C1917",
      primarySoft: "#3B2F1A",
      bg: "#1C1917",
      surface: "#292524",
      text: "#FAFAF9",
      muted: "#A8A29E",
      accent: "#2DD4BF",
      success: "#4ADE80",
      danger: "#F87171",
      border: "#44403C",
    },
  },
  client: {
    light: {
      primary: "#2563EB",
      primaryFg: "#FFFFFF",
      primarySoft: "#DBEAFE",
      bg: "#F9FAFB",
      surface: "#FFFFFF",
      text: "#0F172A",
      muted: "#64748B",
      accent: "#059669",
      success: "#059669",
      danger: "#DC2626",
      border: "#E2E8F0",
    },
    dark: {
      primary: "#3B82F6",
      primaryFg: "#FFFFFF",
      primarySoft: "#1E293B",
      bg: "#0F172A",
      surface: "#1E293B",
      text: "#F1F5F9",
      muted: "#94A3B8",
      accent: "#34D399",
      success: "#34D399",
      danger: "#F87171",
      border: "#334155",
    },
  },
};
