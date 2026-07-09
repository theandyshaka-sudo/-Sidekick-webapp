import { Image, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRolePalette } from "../theme/useRolePalette";

function initialsOf(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function Avatar({ uri, name, size = 48 }: { uri?: string; name: string; size?: number }) {
  const palette = useRolePalette();
  const dimension = { width: size, height: size, borderRadius: size / 2 };

  if (uri) {
    return <Image source={{ uri }} style={dimension} />;
  }

  const initials = initialsOf(name);

  return (
    <View style={dimension} className="items-center justify-center bg-primary-soft">
      {initials ? (
        <Text className="font-semibold text-primary" style={{ fontSize: size * 0.38 }}>
          {initials}
        </Text>
      ) : (
        <Ionicons name="person" size={size * 0.5} color={palette.primary} />
      )}
    </View>
  );
}
