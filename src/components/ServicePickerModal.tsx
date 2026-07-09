import { useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRolePalette } from "../theme/useRolePalette";
import { useThemeVars } from "../theme/useThemeVars";
import { CATALOG_CATEGORY_ORDER, eligibleServices } from "../data/serviceCatalog";

// Pick a service to advertise from the age-eligible catalog. Only services the worker's verified
// age allows are shown, so e.g. a 15-year-old never sees pressure washing.
export function ServicePickerModal({
  visible,
  age,
  existingNames,
  onClose,
  onSelect,
}: {
  visible: boolean;
  age: number;
  existingNames: string[];
  onClose: () => void;
  onSelect: (name: string) => void;
}) {
  const palette = useRolePalette();
  const themeVars = useThemeVars();
  const [query, setQuery] = useState("");

  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase();
    const eligible = eligibleServices(age).filter((s) => !q || s.name.toLowerCase().includes(q));
    return CATALOG_CATEGORY_ORDER.map((cat) => ({
      category: cat,
      items: eligible.filter((s) => s.category === cat),
    })).filter((g) => g.items.length > 0);
  }, [age, query]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 justify-end bg-black/40" style={themeVars} onPress={onClose}>
        <Pressable
          className="rounded-t-3xl px-5 pb-6 pt-4"
          style={{ backgroundColor: palette.surface, maxHeight: "88%" }}
          onPress={(e) => e.stopPropagation()}
        >
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-lg font-bold text-text">Choose a service</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={22} color={palette.muted} />
            </Pressable>
          </View>

          <View className="mb-3 flex-row items-center gap-2 rounded-2xl border border-border bg-bg px-4 py-2.5">
            <Ionicons name="search" size={16} color={palette.muted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search services"
              placeholderTextColor={palette.muted}
              style={{ color: palette.text }}
              className="flex-1 text-base"
            />
          </View>

          <Text className="mb-2 text-xs text-muted">
            Showing what you can offer at {age}. More services unlock as you get older.
          </Text>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 12 }}>
            {grouped.map((group) => (
              <View key={group.category} className="mb-4">
                <Text className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">{group.category}</Text>
                <View className="gap-2">
                  {group.items.map((service) => {
                    const added = existingNames.includes(service.name);
                    return (
                      <Pressable
                        key={service.name}
                        disabled={added}
                        onPress={() => onSelect(service.name)}
                        className="flex-row items-center justify-between rounded-2xl border border-border bg-bg px-4 py-3 active:opacity-70"
                        style={{ opacity: added ? 0.5 : 1 }}
                      >
                        <Text className="text-sm font-medium text-text">{service.name}</Text>
                        {added ? (
                          <Text className="text-xs text-muted">Added</Text>
                        ) : (
                          <Ionicons name="add-circle-outline" size={18} color={palette.primary} />
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ))}
            {grouped.length === 0 ? (
              <Text className="py-6 text-center text-sm text-muted">No services match "{query}".</Text>
            ) : null}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
