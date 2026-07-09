import { useState } from "react";
import { useRouter } from "expo-router";
import { Image, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ScreenHeader } from "../../src/components/settings/ScreenHeader";
import { PrimaryButton } from "../../src/components/PrimaryButton";
import { Toggle } from "../../src/components/Toggle";
import { ActionSheet, type ActionSheetOption } from "../../src/components/ActionSheet";
import { ServicePickerModal } from "../../src/components/ServicePickerModal";
import { useWorkerData } from "../../src/context/WorkerDataContext";
import { useRolePalette } from "../../src/theme/useRolePalette";
import { ALL_DAYS, DAY_LETTERS, formatDays, formatHour, formatServicePrice, type PriceType } from "../../src/data/workerMock";
import { ageFromDob } from "../../src/data/categoriesConfig";

const HOUR_OPTIONS = Array.from({ length: 17 }, (_, i) => i + 6); // 6 AM – 10 PM

function PriceTypeSelector({
  value,
  onChange,
}: {
  value: PriceType;
  onChange: (value: PriceType) => void;
}) {
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
            <Text
              className="text-xs font-semibold"
              style={{ color: selected ? palette.primaryFg : palette.muted }}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function WorkerServices() {
  const palette = useRolePalette();
  const router = useRouter();
  const { services, addService, updateService, removeService, verification } = useWorkerData();
  const verifiedAge = verification.verifiedDob ? ageFromDob(verification.verifiedDob) : null;
  const canAdd = verification.status === "verified" && verifiedAge != null;

  const [newTitle, setNewTitle] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newType, setNewType] = useState<PriceType>("job");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [hourPicker, setHourPicker] = useState<{ serviceId: string; end: "from" | "to" } | null>(null);

  const submitNewService = () => {
    const amount = Number(newAmount.replace(/[^0-9]/g, ""));
    if (!newTitle.trim() || !amount || !canAdd) return;
    addService({
      title: newTitle.trim(),
      priceType: newType,
      priceAmount: amount,
      availFrom: 9,
      availTo: 17,
      days: [...ALL_DAYS],
      photoUri: `https://picsum.photos/seed/sidekick-${Date.now()}/200/200`,
      active: true,
    });
    setNewTitle("");
    setNewAmount("");
    setNewType("job");
  };

  const hourOptions: ActionSheetOption[] = hourPicker
    ? HOUR_OPTIONS.map((h) => ({
        label: formatHour(h),
        onPress: () => updateService(hourPicker.serviceId, { [hourPicker.end === "from" ? "availFrom" : "availTo"]: h }),
      }))
    : [];

  return (
    <View className="flex-1 bg-bg">
      <ScreenHeader title="My services & pricing" />
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <Text className="mb-4 text-sm text-muted">
          You set your own prices — charge per job or per hour. Toggle a service off to hide it
          without deleting it.
        </Text>
        <View className="gap-3">
          {services.map((service) => (
            <View key={service.id} className="rounded-2xl border border-border bg-surface p-3">
              <View className="flex-row items-center gap-3">
                <Image source={{ uri: service.photoUri }} className="h-14 w-14 rounded-xl" />
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-text" numberOfLines={1}>
                    {service.title}
                  </Text>
                  <Text className="mt-0.5 text-sm font-medium" style={{ color: palette.primary }}>
                    {formatServicePrice(service.priceType, service.priceAmount)}
                  </Text>
                </View>
                <Toggle value={service.active} onValueChange={(active) => updateService(service.id, { active })} />
                <Pressable onPress={() => removeService(service.id)} hitSlop={8} className="ml-1">
                  <Ionicons name="trash-outline" size={18} color={palette.danger} />
                </Pressable>
              </View>
              <View className="mt-3 flex-row items-center justify-between border-t border-border pt-3">
                <View className="flex-row items-center gap-2">
                  <Text className="text-sm text-muted">$</Text>
                  <TextInput
                    value={String(service.priceAmount)}
                    onChangeText={(text) =>
                      updateService(service.id, { priceAmount: Number(text.replace(/[^0-9]/g, "")) || 0 })
                    }
                    keyboardType="number-pad"
                    style={{ color: palette.text }}
                    className="min-w-16 rounded-lg border border-border bg-bg px-3 py-1.5 text-sm"
                  />
                </View>
                <PriceTypeSelector
                  value={service.priceType}
                  onChange={(priceType) => updateService(service.id, { priceType })}
                />
              </View>

              <View className="mt-3 border-t border-border pt-3">
                <View className="mb-2 flex-row items-center gap-1.5">
                  <Ionicons name="time-outline" size={14} color={palette.muted} />
                  <Text className="text-xs font-semibold uppercase tracking-wider text-muted">Available hours</Text>
                </View>
                <View className="flex-row items-center gap-2">
                  <Pressable
                    onPress={() => setHourPicker({ serviceId: service.id, end: "from" })}
                    className="flex-1 items-center rounded-xl border border-border bg-bg py-2 active:opacity-70"
                  >
                    <Text className="text-sm font-semibold text-text">{formatHour(service.availFrom)}</Text>
                  </Pressable>
                  <Text className="text-sm text-muted">to</Text>
                  <Pressable
                    onPress={() => setHourPicker({ serviceId: service.id, end: "to" })}
                    className="flex-1 items-center rounded-xl border border-border bg-bg py-2 active:opacity-70"
                  >
                    <Text className="text-sm font-semibold text-text">{formatHour(service.availTo)}</Text>
                  </Pressable>
                </View>
              </View>

              <View className="mt-3 border-t border-border pt-3">
                <View className="mb-2 flex-row items-center justify-between">
                  <View className="flex-row items-center gap-1.5">
                    <Ionicons name="calendar-outline" size={14} color={palette.muted} />
                    <Text className="text-xs font-semibold uppercase tracking-wider text-muted">Available days</Text>
                  </View>
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
                        className="h-9 flex-1 items-center justify-center rounded-lg border active:opacity-70"
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
              </View>
            </View>
          ))}
        </View>

        <Text className="mb-3 mt-7 text-sm font-semibold uppercase tracking-wider text-muted">
          Add a new service
        </Text>

        {!canAdd ? (
          <Pressable
            onPress={() => router.push("/settings/worker-verify")}
            className="flex-row items-center gap-3 rounded-2xl border px-4 py-4 active:opacity-80"
            style={{ borderColor: palette.primary, backgroundColor: palette.primarySoft }}
          >
            <Ionicons name="finger-print" size={22} color={palette.primary} />
            <View className="flex-1">
              <Text className="text-sm font-semibold text-text">Verify your age to add services</Text>
              <Text className="text-xs text-muted">We only show services you're allowed to offer at your age.</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={palette.primary} />
          </Pressable>
        ) : (
          <View className="gap-3 rounded-2xl border border-dashed border-border p-4">
            <Pressable
              onPress={() => setPickerOpen(true)}
              className="flex-row items-center justify-between rounded-2xl border border-border bg-surface px-4 py-3 active:opacity-70"
            >
              <Text className="text-base" style={{ color: newTitle ? palette.text : palette.muted }}>
                {newTitle || "Choose a service"}
              </Text>
              <Ionicons name="chevron-down" size={18} color={palette.muted} />
            </Pressable>
            <View className="flex-row items-center gap-2">
              <View className="flex-1 flex-row items-center gap-2 rounded-2xl border border-border bg-surface px-4 py-3">
                <Text className="text-base text-muted">$</Text>
                <TextInput
                  value={newAmount}
                  onChangeText={setNewAmount}
                  placeholder="Amount"
                  placeholderTextColor={palette.muted}
                  keyboardType="number-pad"
                  style={{ color: palette.text }}
                  className="flex-1 text-base"
                />
              </View>
              <PriceTypeSelector value={newType} onChange={setNewType} />
            </View>
            <Text className="text-xs text-muted">
              Preview: {newTitle && newAmount ? `${newTitle} · ${formatServicePrice(newType, Number(newAmount.replace(/[^0-9]/g, "")) || 0)}` : "—"}
            </Text>
            <PrimaryButton label="Add service" variant="outline" onPress={submitNewService} />
          </View>
        )}
      </ScrollView>

      <ActionSheet
        visible={hourPicker != null}
        title={hourPicker?.end === "from" ? "Start no earlier than" : "Finish no later than"}
        options={hourOptions}
        onClose={() => setHourPicker(null)}
      />

      {verifiedAge != null ? (
        <ServicePickerModal
          visible={pickerOpen}
          age={verifiedAge}
          existingNames={services.map((s) => s.title)}
          onClose={() => setPickerOpen(false)}
          onSelect={(name) => {
            setNewTitle(name);
            setPickerOpen(false);
          }}
        />
      ) : null}
    </View>
  );
}
