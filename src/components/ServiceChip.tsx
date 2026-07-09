import { Image, Text, View } from "react-native";

export function ServiceChip({ title, priceLabel, photoUri }: { title: string; priceLabel: string; photoUri: string }) {
  return (
    <View className="w-32 overflow-hidden rounded-2xl border border-border bg-surface">
      <Image source={{ uri: photoUri }} className="h-20 w-full" />
      <View className="p-2.5">
        <Text className="text-sm font-semibold text-text" numberOfLines={1}>
          {title}
        </Text>
        <Text className="text-xs text-muted">{priceLabel}</Text>
      </View>
    </View>
  );
}
