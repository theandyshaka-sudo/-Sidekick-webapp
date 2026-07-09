import { Pressable, View } from "react-native";
import { useRolePalette } from "../theme/useRolePalette";

// A custom toggle rather than React Native's <Switch> — react-native-web renders Switch as a
// bare native <input type="checkbox" role="switch">, and some browsers apply their own native
// switch styling that ignores trackColor/thumbColor entirely. This keeps the look consistent
// and on-brand across web and native.
export function Toggle({ value, onValueChange }: { value: boolean; onValueChange: (value: boolean) => void }) {
  const palette = useRolePalette();

  return (
    <Pressable
      onPress={() => onValueChange(!value)}
      className="h-6 w-11 justify-center rounded-full p-0.5"
      style={{ backgroundColor: value ? palette.primary : palette.border }}
    >
      <View className="h-5 w-5 rounded-full bg-white" style={{ alignSelf: value ? "flex-end" : "flex-start" }} />
    </Pressable>
  );
}
