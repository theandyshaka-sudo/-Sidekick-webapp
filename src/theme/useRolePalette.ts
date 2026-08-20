import { useAppState } from "../context/AppStateContext";
import { palettes } from "./palette";
import { accentPaletteOverride } from "./accentColor";

export function useRolePalette() {
  const { role, colorScheme, accentColor } = useAppState();
  const base = palettes[role ?? "client"][colorScheme];
  if (!accentColor) return base;
  return { ...base, ...accentPaletteOverride(accentColor, colorScheme) };
}
