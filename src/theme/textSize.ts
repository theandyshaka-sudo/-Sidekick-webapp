import { vars } from "nativewind";

export type TextSize = "small" | "default" | "large" | "xlarge";

// The base (100%) column — "default" matches Tailwind's own built-in sizes exactly, so it's a
// true no-op. Every other tier is a literal percentage of this column (50% / 150% / 200%), per
// how the user wants the tiers to relate — deliberately a bigger spread than a typical a11y
// text-size setting so the four options are obviously, not subtly, different from each other.
const BASE: Record<string, number> = {
  "--fs-xs": 12, "--fs-sm": 14, "--fs-base": 16, "--fs-lg": 18,
  "--fs-xl": 20, "--fs-2xl": 24, "--fs-3xl": 30, "--fs-4xl": 36,
};

function scaled(factor: number) {
  return vars(
    Object.fromEntries(Object.entries(BASE).map(([key, px]) => [key, `${Math.round(px * factor)}px`]))
  );
}

// Drives the fontSize entries in tailwind.config.js (--fs-xs … --fs-4xl), the same CSS-variable
// mechanism the theme colors already use to work at runtime on both web and native.
export const textSizeVars: Record<TextSize, ReturnType<typeof vars>> = {
  small: scaled(0.5),
  default: scaled(1),
  large: scaled(1.5),
  xlarge: scaled(2),
};
