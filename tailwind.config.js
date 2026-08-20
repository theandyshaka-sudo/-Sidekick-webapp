/** @type {import('tailwindcss').Config} */

// Each theme color is a CSS var holding an "R G B" triple (see src/theme/themes.ts),
// so both solid and alpha-blended utilities (e.g. bg-primary/20) work at runtime.
function withOpacity(variable) {
  return ({ opacityValue }) =>
    opacityValue !== undefined
      ? `rgb(var(${variable}) / ${opacityValue})`
      : `rgb(var(${variable}))`;
}

module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  // We drive theming ourselves (per-role, not per-OS-appearance) and never toggle a "dark"
  // class, so this just avoids a NativeWind web bug: its dark-mode auto-detection throws
  // ("Cannot manually set color scheme...") when Tailwind's default "media" strategy is active.
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: withOpacity("--color-primary"),
        "primary-fg": withOpacity("--color-primary-fg"),
        "primary-soft": withOpacity("--color-primary-soft"),
        bg: withOpacity("--color-bg"),
        surface: withOpacity("--color-surface"),
        text: withOpacity("--color-text"),
        muted: withOpacity("--color-muted"),
        accent: withOpacity("--color-accent"),
        success: withOpacity("--color-success"),
        danger: withOpacity("--color-danger"),
        border: withOpacity("--color-border"),
      },
      // Backed by CSS vars set in src/theme/textSize.ts, same runtime mechanism the colors above
      // use — lets the Appearance tab's text-size preference resize every text-* utility at once.
      // "default" values match Tailwind's own built-ins, used as the fallback.
      fontSize: {
        xs: "var(--fs-xs, 0.75rem)",
        sm: "var(--fs-sm, 0.875rem)",
        base: "var(--fs-base, 1rem)",
        lg: "var(--fs-lg, 1.125rem)",
        xl: "var(--fs-xl, 1.25rem)",
        "2xl": "var(--fs-2xl, 1.5rem)",
        "3xl": "var(--fs-3xl, 1.875rem)",
        "4xl": "var(--fs-4xl, 2.25rem)",
      },
    },
  },
  plugins: [],
};
