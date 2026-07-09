import { useAppState } from "../context/AppStateContext";
import { palettes } from "./palette";

export function useRolePalette() {
  const { role, colorScheme } = useAppState();
  return palettes[role ?? "client"][colorScheme];
}
