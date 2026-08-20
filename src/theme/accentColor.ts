import { vars } from "nativewind";
import { hexToRgb, rgbToCssTriple, rgbToHex, relativeLuminance, mix, type RGB } from "../lib/color";
import type { ColorScheme } from "./palette";

// A user-chosen accent replaces only the "primary" trio (button/link color, its readable text
// color, and a soft tint for badges/highlights) — every other theme value (bg, surface, danger,
// etc.) stays whatever the role's built-in theme already defines.
function derive(hex: string, colorScheme: ColorScheme): { primary: RGB; primaryFg: RGB; primarySoft: RGB } {
  const primary = hexToRgb(hex);
  const primaryFg: RGB = relativeLuminance(primary) > 0.55 ? [28, 25, 23] : [255, 255, 255];
  const primarySoft = colorScheme === "light" ? mix(primary, [255, 255, 255], 0.82) : mix(primary, [30, 27, 24], 0.55);
  return { primary, primaryFg, primarySoft };
}

// For ThemeSurface / useThemeVars — merge onto the role's base CSS vars so className-based
// colors (bg-primary, text-primary-fg, …) pick up the custom accent.
export function accentThemeVars(hex: string, colorScheme: ColorScheme) {
  const { primary, primaryFg, primarySoft } = derive(hex, colorScheme);
  return vars({
    "--color-primary": rgbToCssTriple(primary),
    "--color-primary-fg": rgbToCssTriple(primaryFg),
    "--color-primary-soft": rgbToCssTriple(primarySoft),
  });
}

// For useRolePalette() — literal hex values for places className can't reach (icon `color` props).
export function accentPaletteOverride(hex: string, colorScheme: ColorScheme) {
  const { primary, primaryFg, primarySoft } = derive(hex, colorScheme);
  return { primary: rgbToHex(primary), primaryFg: rgbToHex(primaryFg), primarySoft: rgbToHex(primarySoft) };
}
