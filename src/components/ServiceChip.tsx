import { Image, Pressable, Text, View } from "react-native";
import { Toggle } from "./Toggle";

export function ServiceChip({
  title,
  priceLabel,
  photoUri,
  active,
  onToggleActive,
  onPress,
}: {
  title: string;
  priceLabel: string;
  photoUri: string;
  active: boolean;
  onToggleActive: (active: boolean) => void;
  onPress?: () => void;
}) {
  return (
    <View className="w-32 overflow-hidden rounded-2xl border border-border bg-surface" style={{ opacity: active ? 1 : 0.5 }}>
      <Pressable onPress={onPress} className="active:opacity-80">
        <Image source={{ uri: photoUri }} className="h-20 w-full" />
        <View className="px-2.5 pt-2.5">
          <Text className="text-sm font-semibold text-text" numberOfLines={1}>
            {title}
          </Text>
          <Text className="text-xs text-muted">{priceLabel}</Text>
        </View>
      </Pressable>
      <View className="px-2.5 pb-2.5 pt-2">
        <Toggle value={active} onValueChange={onToggleActive} />
      </View>
    </View>
  );
}
