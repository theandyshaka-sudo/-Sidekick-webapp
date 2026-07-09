import { vars } from "nativewind";
import type { ColorScheme } from "./palette";
import type { Role } from "../context/AppStateContext";

// Worker side: energetic but not childish (pool includes 18-20 year olds) — "run your business".
// Client side: calmer, trust-forward — "find trusted local help". See HANDOFF.md §8.
// Numeric triples must stay in sync with the hex values in palette.ts.
export const themes: Record<Role, Record<ColorScheme, ReturnType<typeof vars>>> = {
  worker: {
    light: vars({
      "--color-primary": "217 119 6",
      "--color-primary-fg": "255 255 255",
      "--color-primary-soft": "254 243 199",
      "--color-bg": "250 248 245",
      "--color-surface": "255 255 255",
      "--color-text": "28 25 23",
      "--color-muted": "120 113 108",
      "--color-accent": "13 148 136",
      "--color-success": "22 163 74",
      "--color-danger": "220 38 38",
      "--color-border": "231 229 228",
    }),
    dark: vars({
      "--color-primary": "245 158 11",
      "--color-primary-fg": "28 25 23",
      "--color-primary-soft": "59 47 26",
      "--color-bg": "28 25 23",
      "--color-surface": "41 37 36",
      "--color-text": "250 250 249",
      "--color-muted": "168 162 158",
      "--color-accent": "45 212 191",
      "--color-success": "74 222 128",
      "--color-danger": "248 113 113",
      "--color-border": "68 64 60",
    }),
  },
  client: {
    light: vars({
      "--color-primary": "37 99 235",
      "--color-primary-fg": "255 255 255",
      "--color-primary-soft": "219 234 254",
      "--color-bg": "249 250 251",
      "--color-surface": "255 255 255",
      "--color-text": "15 23 42",
      "--color-muted": "100 116 139",
      "--color-accent": "5 150 105",
      "--color-success": "5 150 105",
      "--color-danger": "220 38 38",
      "--color-border": "226 232 240",
    }),
    dark: vars({
      "--color-primary": "59 130 246",
      "--color-primary-fg": "255 255 255",
      "--color-primary-soft": "30 41 59",
      "--color-bg": "15 23 42",
      "--color-surface": "30 41 59",
      "--color-text": "241 245 249",
      "--color-muted": "148 163 184",
      "--color-accent": "52 211 153",
      "--color-success": "52 211 153",
      "--color-danger": "248 113 113",
      "--color-border": "51 65 85",
    }),
  },
};

export type ThemeRole = keyof typeof themes;
