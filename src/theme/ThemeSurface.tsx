import type { ReactNode } from "react";
import { View, type ViewStyle } from "react-native";
import { themes, type ThemeRole } from "./themes";
import type { ColorScheme } from "./palette";
import type { TextSize } from "./textSize";
import { textSizeVars } from "./textSize";
import { accentThemeVars } from "./accentColor";

export function ThemeSurface({
  role,
  colorScheme,
  accentColor,
  textSize,
  children,
}: {
  role: ThemeRole;
  colorScheme: ColorScheme;
  accentColor?: string | null;
  textSize?: TextSize;
  children: ReactNode;
}) {
  const style: ViewStyle = {
    ...(themes[role][colorScheme] as ViewStyle),
    ...(textSizeVars[textSize ?? "default"] as ViewStyle),
    ...(accentColor ? (accentThemeVars(accentColor, colorScheme) as ViewStyle) : {}),
  };
  return (
    <View style={style} className="flex-1 bg-bg">
      {children}
    </View>
  );
}
