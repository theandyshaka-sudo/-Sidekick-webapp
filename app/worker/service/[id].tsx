import { useState } from "react";
import { Image, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ScreenHeader } from "../../../src/components/settings/ScreenHeader";
import { Toggle } from "../../../src/components/Toggle";
import { ActionSheet, type ActionSheetOption } from "../../../src/components/ActionSheet";
import { useWorkerData } from "../../../src/context/WorkerDataContext";
import { useRolePalette } from "../../../src/theme/useRolePalette";
import { ALL_DAYS, DAY_LETTERS, formatDays, formatHour, formatServicePrice, type PriceType } from "../../../src/data/workerMock";

const HOUR_OPTIONS = Array.from({ length: 17 }, (_, i) => i + 6); // 6 AM – 10 PM

function PriceTypeSelector({ value, onChange }: { value: PriceType; onChange: (value: PriceType) => void }) {
  const palette = useRolePalette();
  const options: Array<{ value: PriceType; label: string }> = [
    { value: "job", label: "Per job" },
    { value: "hour", label: "Per hour" },
  ];
  return (
    <View className="flex-row rounded-xl border border-border bg-bg p-0.5">
      {options.map((option) => {
        const selected = value === option.value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            className="rounded-lg px-3 py-1.5"
            style={{ backgroundColor: selected ? palette.primary : "transparent" }}
          >
            <Text className="text-xs font-semibold" style={{ color: selected ? palette.primaryFg : palette.muted }}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function ServiceDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const palette = useRolePalette();
  const { services, updateService, removeService } = useWorkerData();
  const [hourPicker, setHourPicker] = useState<"from" | "to" | null>(null);

  const service = services.find((s) => s.id === id);

  if (!service) {
    return (
      <View className="flex-1 bg-bg">
        <ScreenHeader title="Service" />
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-sm text-muted">This service couldn't be found.</Text>
        </View>
      </View>
    );
  }

  const hourOptions: ActionSheetOption[] = HOUR_OPTIONS.map((h) => ({
    label: formatHour(h),
    onPress: () => updateService(service.id, { [hourPicker === "from" ? "availFrom" : "availTo"]: h }),
  }));

  const del = () => {
    removeService(service.id);
    router.back();
  };

  return (
    <View className="flex-1 bg-bg">
      <ScreenHeader title={service.title} />
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <View className="items-center">
          <Image source={{ uri: service.photoUri }} className="h-40 w-full rounded-2xl" />
        </View>

        <View className="mt-5 flex-row items-center justify-between rounded-2xl border border-border bg-surface px-4 py-3.5">
          <View>
            <Text className="text-xs text-muted">Visible in Discover</Text>
            <Text className="text-sm font-medium text-text">{service.active ? "Active" : "Inactive"}</Text>
          </View>
          <Toggle value={service.active} onValueChange={(active) => updateService(service.id, { active })} />
        </View>

        <Text className="mb-2 mt-6 text-sm font-semibold uppercase tracking-wider text-muted">Pricing</Text>
        <View className="flex-row items-center justify-between rounded-2xl border border-border bg-surface px-4 py-3.5">
          <View className="flex-row items-center gap-2">
            <Text className="text-base text-muted">$</Text>
            <TextInput
              value={String(service.priceAmount)}
              onChangeText={(text) => updateService(service.id, { priceAmount: Number(text.replace(/[^0-9]/g, "")) || 0 })}
              keyboardType="number-pad"
              style={{ color: palette.text }}
              className="min-w-16 rounded-lg border border-border bg-bg px-3 py-1.5 text-base"
            />
          </View>
          <PriceTypeSelector value={service.priceType} onChange={(priceType) => updateService(service.id, { priceType })} />
        </View>
        <Text className="mt-2 text-xs text-muted">
          Preview: {formatServicePrice(service.priceType, service.priceAmount)}
        </Text>

        <Text className="mb-2 mt-6 text-sm font-semibold uppercase tracking-wider text-muted">Available hours</Text>
        <View className="flex-row items-center gap-2">
          <Pressable
            onPress={() => setHourPicker("from")}
            className="flex-1 items-center rounded-2xl border border-border bg-surface py-3 active:opacity-70"
          >
            <Text className="text-sm font-semibold text-text">{formatHour(service.availFrom)}</Text>
          </Pressable>
          <Text className="text-sm text-muted">to</Text>
          <Pressable
            onPress={() => setHourPicker("to")}
            className="flex-1 items-center rounded-2xl border border-border bg-surface py-3 active:opacity-70"
          >
            <Text className="text-sm font-semibold text-text">{formatHour(service.availTo)}</Text>
          </Pressable>
        </View>

        <View className="mb-2 mt-6 flex-row items-center justify-between">
          <Text className="text-sm font-semibold uppercase tracking-wider text-muted">Available days</Text>
          <Text className="text-xs text-muted">{formatDays(service.days)}</Text>
        </View>
        <View className="flex-row gap-1.5">
          {ALL_DAYS.map((d) => {
            const on = service.days.includes(d);
            const toggle = () => {
              const next = on ? service.days.filter((x) => x !== d) : [...service.days, d];
              updateService(service.id, { days: next });
            };
            return (
              <Pressable
                key={d}
                onPress={toggle}
                className="h-10 flex-1 items-center justify-center rounded-lg border active:opacity-70"
                style={{
                  borderColor: on ? palette.primary : palette.border,
                  backgroundColor: on ? palette.primary : "transparent",
                }}
              >
                <Text className="text-xs font-bold" style={{ color: on ? palette.primaryFg : palette.muted }}>
                  {DAY_LETTERS[d]}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable
          onPress={del}
          className="mt-8 flex-row items-center justify-center gap-2 rounded-2xl border px-6 py-4 active:opacity-70"
          style={{ borderColor: palette.danger }}
        >
          <Ionicons name="trash-outline" size={18} color={palette.danger} />
          <Text className="text-base font-semibold" style={{ color: palette.danger }}>
            Delete this service
          </Text>
        </Pressable>
      </ScrollView>

      <ActionSheet
        visible={hourPicker != null}
        title={hourPicker === "from" ? "Start no earlier than" : "Finish no later than"}
        options={hourOptions}
        onClose={() => setHourPicker(null)}
      />
    </View>
  );
}
