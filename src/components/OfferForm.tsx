import { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRolePalette } from "../theme/useRolePalette";
import { useThemeVars } from "../theme/useThemeVars";
import type { PriceType } from "../data/workerMock";

export type OfferDraft = {
  service: string;
  price: number;
  priceType: PriceType;
  scheduledAt: string;
};

const TIME_SLOTS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function slotLabel(hour: number): string {
  const ampm = hour >= 12 ? "PM" : "AM";
  const h = hour % 12 || 12;
  return `${h} ${ampm}`;
}

export function OfferForm({
  visible,
  title,
  initialService,
  initialDayOffset = 0,
  submitLabel = "Send offer",
  onClose,
  onSubmit,
}: {
  visible: boolean;
  title: string;
  initialService?: string;
  initialDayOffset?: number;
  submitLabel?: string;
  onClose: () => void;
  onSubmit: (draft: OfferDraft) => void;
}) {
  const palette = useRolePalette();
  const themeVars = useThemeVars();
  const [service, setService] = useState(initialService ?? "");
  const [amount, setAmount] = useState("");
  const [priceType, setPriceType] = useState<PriceType>("job");
  const [dayOffset, setDayOffset] = useState(initialDayOffset);
  const [hour, setHour] = useState(15);

  // Re-sync the preselected day whenever the sheet is (re)opened for a specific day.
  useEffect(() => {
    if (visible) setDayOffset(initialDayOffset);
  }, [visible, initialDayOffset]);

  const days = useMemo(() => {
    const base = new Date();
    return Array.from({ length: 14 }, (_, i) => {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      return d;
    });
  }, [visible]);

  const submit = () => {
    const price = Number(amount.replace(/[^0-9]/g, ""));
    if (!service.trim() || !price) return;
    const d = new Date();
    d.setDate(d.getDate() + dayOffset);
    d.setHours(hour, 0, 0, 0);
    onSubmit({ service: service.trim(), price, priceType, scheduledAt: d.toISOString() });
    setService(initialService ?? "");
    setAmount("");
    setPriceType("job");
    setDayOffset(0);
    setHour(15);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 justify-end bg-black/40" style={themeVars} onPress={onClose}>
        <Pressable
          className="rounded-t-3xl px-5 pb-8 pt-4"
          style={{ backgroundColor: palette.surface, maxHeight: "88%" }}
          onPress={(e) => e.stopPropagation()}
        >
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="text-lg font-bold text-text">{title}</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={22} color={palette.muted} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted">Service</Text>
            <TextInput
              value={service}
              onChangeText={setService}
              placeholder="e.g. Lawn mowing"
              placeholderTextColor={palette.muted}
              className="mb-4 rounded-2xl border border-border bg-bg px-4 py-3 text-base text-text"
            />

            <Text className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted">Price</Text>
            <View className="mb-4 flex-row items-center gap-2">
              <View className="flex-1 flex-row items-center gap-2 rounded-2xl border border-border bg-bg px-4 py-3">
                <Text className="text-base text-muted">$</Text>
                <TextInput
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="Amount"
                  placeholderTextColor={palette.muted}
                  keyboardType="number-pad"
                  className="flex-1 text-base text-text"
                />
              </View>
              <View className="flex-row rounded-xl border border-border bg-bg p-0.5">
                {(["job", "hour"] as PriceType[]).map((t) => {
                  const selected = priceType === t;
                  return (
                    <Pressable
                      key={t}
                      onPress={() => setPriceType(t)}
                      className="rounded-lg px-3 py-1.5"
                      style={{ backgroundColor: selected ? palette.primary : "transparent" }}
                    >
                      <Text className="text-xs font-semibold" style={{ color: selected ? palette.primaryFg : palette.muted }}>
                        {t === "job" ? "Per job" : "Per hour"}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <Text className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted">Date</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4" contentContainerStyle={{ gap: 8 }}>
              {days.map((d, i) => {
                const selected = dayOffset === i;
                return (
                  <Pressable
                    key={i}
                    onPress={() => setDayOffset(i)}
                    className="items-center rounded-2xl border px-3 py-2"
                    style={{ borderColor: selected ? palette.primary : palette.border, backgroundColor: selected ? palette.primarySoft : palette.bg }}
                  >
                    <Text className="text-xs text-muted">{DAY_LABELS[d.getDay()]}</Text>
                    <Text className="text-sm font-semibold" style={{ color: selected ? palette.primary : palette.text }}>
                      {MONTHS[d.getMonth()]} {d.getDate()}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <Text className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted">Time</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-5" contentContainerStyle={{ gap: 8 }}>
              {TIME_SLOTS.map((h) => {
                const selected = hour === h;
                return (
                  <Pressable
                    key={h}
                    onPress={() => setHour(h)}
                    className="rounded-2xl border px-3.5 py-2"
                    style={{ borderColor: selected ? palette.primary : palette.border, backgroundColor: selected ? palette.primarySoft : palette.bg }}
                  >
                    <Text className="text-sm font-semibold" style={{ color: selected ? palette.primary : palette.text }}>
                      {slotLabel(h)}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <Pressable onPress={submit} className="items-center rounded-2xl bg-primary py-4 active:opacity-80">
              <Text className="text-base font-semibold text-primary-fg">{submitLabel}</Text>
            </Pressable>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
