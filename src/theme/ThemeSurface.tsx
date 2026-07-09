import type { ReactNode } from "react";
import { View, type ViewStyle } from "react-native";
import { themes, type ThemeRole } from "./themes";
import type { ColorScheme } from "./palette";

export function ThemeSurface({
  role,
  colorScheme,
  children,
}: {
  role: ThemeRole;
  colorScheme: ColorScheme;
  children: ReactNode;
}) {
  return (
    <View style={themes[role][colorScheme] as ViewStyle} className="flex-1 bg-bg">
      {children}
    </View>
  );
}
