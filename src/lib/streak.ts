import { Ionicons } from "@expo/vector-icons";

// Work-streak tiers. A streak = consecutive weeks (ending this week) with at least one completed
// job; it resets the moment a week is skipped. As it grows, the flame changes color and name so
// the reward feels like it's leveling up.
export type StreakTier = {
  color: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
};

export function streakTier(weeks: number): StreakTier {
  if (weeks >= 12) return { color: "#A855F7", label: "Legendary streak", icon: "flame" }; // purple — 3 months+
  if (weeks >= 8) return { color: "#3B82F6", label: "Blazing streak", icon: "flame" }; //  blue  — 2 months+
  if (weeks >= 4) return { color: "#EF4444", label: "Hot streak", icon: "flame" }; //       red   — 1 month+
  return { color: "#F97316", label: "On a roll", icon: "flame" }; //                        orange — 2–3 weeks
}
