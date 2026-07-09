import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ScreenHeader } from "../../src/components/settings/ScreenHeader";
import { ToggleRow } from "../../src/components/ToggleRow";
import { useWorkerData } from "../../src/context/WorkerDataContext";
import { useRolePalette } from "../../src/theme/useRolePalette";
import { ALARM_LEAD_PRESETS, ALARM_SOUNDS } from "../../src/context/WorkerDataContext";

export default function WorkerAlarms() {
  const palette = useRolePalette();
  const { alarmPrefs, updateAlarmPrefs } = useWorkerData();
  const isPreset = ALARM_LEAD_PRESETS.includes(alarmPrefs.leadMinutes);

  return (
    <View className="flex-1 bg-bg">
      <ScreenHeader title="Alarms" />
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <ToggleRow
          icon="alarm-outline"
          label="Job reminders"
          description="Get an alarm before each scheduled job"
          value={alarmPrefs.enabled}
          onValueChange={(enabled) => updateAlarmPrefs({ enabled })}
        />

        {alarmPrefs.enabled ? (
          <>
            <Text className="mb-3 mt-7 text-sm font-semibold uppercase tracking-wider text-muted">
              Remind me before
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {ALARM_LEAD_PRESETS.map((minutes) => {
                const selected = alarmPrefs.leadMinutes === minutes;
                return (
                  <Pressable
                    key={minutes}
                    onPress={() => updateAlarmPrefs({ leadMinutes: minutes })}
                    className="rounded-2xl border px-4 py-2.5"
                    style={{ borderColor: selected ? palette.primary : palette.border, backgroundColor: selected ? palette.primarySoft : palette.surface }}
                  >
                    <Text className="text-sm font-semibold" style={{ color: selected ? palette.primary : palette.text }}>
                      {minutes} min
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View className="mt-3 flex-row items-center gap-2 rounded-2xl border border-border bg-surface px-4 py-3">
              <Ionicons name="create-outline" size={16} color={palette.muted} />
              <Text className="text-sm text-muted">Custom</Text>
              <TextInput
                value={isPreset ? "" : String(alarmPrefs.leadMinutes)}
                onChangeText={(t) => {
                  const n = Number(t.replace(/[^0-9]/g, ""));
                  if (n > 0) updateAlarmPrefs({ leadMinutes: n });
                }}
                keyboardType="number-pad"
                placeholder="e.g. 20"
                placeholderTextColor={palette.muted}
                className="flex-1 text-right text-base text-text"
              />
              <Text className="text-sm text-muted">min before</Text>
            </View>

            <Text className="mb-3 mt-7 text-sm font-semibold uppercase tracking-wider text-muted">Alarm sound</Text>
            <View className="gap-2.5">
              {ALARM_SOUNDS.map((sound) => {
                const selected = alarmPrefs.sound === sound;
                return (
                  <Pressable
                    key={sound}
                    onPress={() => updateAlarmPrefs({ sound })}
                    className="flex-row items-center justify-between rounded-2xl border bg-surface px-4 py-3.5 active:opacity-70"
                    style={{ borderColor: selected ? palette.primary : palette.border }}
                  >
                    <View className="flex-row items-center gap-3">
                      <Ionicons name="musical-note-outline" size={18} color={palette.text} />
                      <Text className="text-base font-medium text-text">{sound}</Text>
                    </View>
                    {selected ? <Ionicons name="checkmark-circle" size={22} color={palette.primary} /> : null}
                  </Pressable>
                );
              })}
            </View>

            <View className="mt-6 flex-row items-start gap-2 px-1">
              <Ionicons name="information-circle-outline" size={16} color={palette.muted} />
              <Text className="flex-1 text-xs leading-5 text-muted">
                You'll hear the {alarmPrefs.sound} sound {alarmPrefs.leadMinutes} minutes before each
                scheduled job. Reminders use your device's notifications.
              </Text>
            </View>
          </>
        ) : (
          <View className="mt-6 flex-row items-start gap-2 px-1">
            <Ionicons name="information-circle-outline" size={16} color={palette.muted} />
            <Text className="flex-1 text-xs leading-5 text-muted">
              Job reminders are off. Turn them on to get an alarm before each scheduled job.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
