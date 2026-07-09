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
    },
  },
  plugins: [],
};
