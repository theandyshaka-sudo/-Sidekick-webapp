import { vars } from "nativewind";

export type TextSize = "small" | "default" | "large";

// Drives the fontSize entries in tailwind.config.js (--fs-xs … --fs-4xl), the same CSS-variable
// mechanism the theme colors already use to work at runtime on both web and native. "default"
// matches Tailwind's own built-in sizes exactly, so it's a true no-op.
export const textSizeVars: Record<TextSize, ReturnType<typeof vars>> = {
  small: vars({
    "--fs-xs": "11px",
    "--fs-sm": "13px",
    "--fs-base": "15px",
    "--fs-lg": "17px",
    "--fs-xl": "19px",
    "--fs-2xl": "22px",
    "--fs-3xl": "27px",
    "--fs-4xl": "32px",
  }),
  default: vars({
    "--fs-xs": "12px",
    "--fs-sm": "14px",
    "--fs-base": "16px",
    "--fs-lg": "18px",
    "--fs-xl": "20px",
    "--fs-2xl": "24px",
    "--fs-3xl": "30px",
    "--fs-4xl": "36px",
  }),
  large: vars({
    "--fs-xs": "14px",
    "--fs-sm": "16px",
    "--fs-base": "18px",
    "--fs-lg": "21px",
    "--fs-xl": "23px",
    "--fs-2xl": "28px",
    "--fs-3xl": "34px",
    "--fs-4xl": "41px",
  }),
};
