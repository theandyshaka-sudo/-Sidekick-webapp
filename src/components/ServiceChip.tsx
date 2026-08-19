import { Image, Text, View } from "react-native";
import { Toggle } from "./Toggle";

export function ServiceChip({
  title,
  priceLabel,
  photoUri,
  active,
  onToggleActive,
}: {
  title: string;
  priceLabel: string;
  photoUri: string;
  active: boolean;
  onToggleActive: (active: boolean) => void;
}) {
  return (
    <View className="w-32 overflow-hidden rounded-2xl border border-border bg-surface" style={{ opacity: active ? 1 : 0.5 }}>
      <Image source={{ uri: photoUri }} className="h-20 w-full" />
      <View className="p-2.5">
        <Text className="text-sm font-semibold text-text" numberOfLines={1}>
          {title}
        </Text>
        <Text className="text-xs text-muted">{priceLabel}</Text>
        <View className="mt-2">
          <Toggle value={active} onValueChange={onToggleActive} />
        </View>
      </View>
    </View>
  );
}
