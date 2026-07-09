import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRolePalette } from "../theme/useRolePalette";
import {
  WEEKDAY_LABELS,
  buildMonthGrid,
  dateKey,
  dateKeyOf,
  formatMonthTitle,
  formatTimeCompact,
  isSameDay,
} from "../lib/datetime";

export type CalendarEvent = {
  id: string;
  iso: string; // datetime the event falls on
  title: string; // job/service name shown in the day cell
  past?: boolean;
};

export function Calendar({
  events,
  selectedKey,
  onSelectDay,
}: {
  events: CalendarEvent[];
  selectedKey: string | null;
  onSelectDay: (key: string, date: Date) => void;
}) {
  const palette = useRolePalette();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const event of events) {
      const key = dateKey(event.iso);
      const bucket = map.get(key);
      if (bucket) bucket.push(event);
      else map.set(key, [event]);
    }
    return map;
  }, [events]);

  const cells = useMemo(() => buildMonthGrid(year, month), [year, month]);

  const step = (delta: number) => {
    let m = month + delta;
    let y = year;
    if (m < 0) {
      m = 11;
      y -= 1;
    } else if (m > 11) {
      m = 0;
      y += 1;
    }
    setMonth(m);
    setYear(y);
  };

  return (
    <View className="rounded-2xl border border-border bg-surface p-3">
      <View className="mb-3 flex-row items-center justify-between px-1">
        <Pressable onPress={() => step(-1)} hitSlop={8} className="h-8 w-8 items-center justify-center rounded-full active:opacity-60">
          <Ionicons name="chevron-back" size={18} color={palette.text} />
        </Pressable>
        <Text className="text-base font-bold text-text">{formatMonthTitle(year, month)}</Text>
        <Pressable onPress={() => step(1)} hitSlop={8} className="h-8 w-8 items-center justify-center rounded-full active:opacity-60">
          <Ionicons name="chevron-forward" size={18} color={palette.text} />
        </Pressable>
      </View>

      <View className="mb-1 flex-row">
        {WEEKDAY_LABELS.map((label, i) => (
          <View key={i} className="flex-1 items-center py-1">
            <Text className="text-xs font-semibold text-muted">{label}</Text>
          </View>
        ))}
      </View>

      <View className="flex-row flex-wrap">
        {cells.map((date, i) => {
          if (!date) return <View key={`empty-${i}`} style={{ width: `${100 / 7}%`, minHeight: 62 }} />;
          const key = dateKeyOf(date);
          const dayEvents = eventsByDay.get(key) ?? [];
          const isToday = isSameDay(date, now);
          const isSelected = selectedKey === key;
          const first = dayEvents[0];
          return (
            <Pressable
              key={key}
              onPress={() => onSelectDay(key, date)}
              style={{ width: `${100 / 7}%`, minHeight: 62 }}
              className="items-center px-0.5 pb-1 active:opacity-70"
            >
              <View
                className="h-7 w-7 items-center justify-center rounded-full"
                style={{ backgroundColor: isSelected ? palette.primary : isToday ? palette.primarySoft : "transparent" }}
              >
                <Text
                  className="text-sm"
                  style={{ color: isSelected ? palette.primaryFg : palette.text, fontWeight: isToday || isSelected ? "700" : "400" }}
                >
                  {date.getDate()}
                </Text>
              </View>

              {first ? (
                <View className="mt-0.5 w-full rounded px-0.5 py-0.5" style={{ backgroundColor: palette.primarySoft }}>
                  {dayEvents.length > 1 ? (
                    <Text className="text-center" style={{ color: palette.primary, fontSize: 8, fontWeight: "700" }} numberOfLines={1}>
                      {dayEvents.length} jobs
                    </Text>
                  ) : (
                    <>
                      <Text className="text-center" style={{ color: palette.primary, fontSize: 8, fontWeight: "600" }} numberOfLines={1}>
                        {first.title}
                      </Text>
                      <Text className="text-center" style={{ color: palette.primary, fontSize: 8 }} numberOfLines={1}>
                        {formatTimeCompact(first.iso)}
                      </Text>
                    </>
                  )}
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
