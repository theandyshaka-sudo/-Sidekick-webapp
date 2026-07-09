import { Text, View } from "react-native";
import { useRolePalette } from "../theme/useRolePalette";

// A compact bar chart for a short series (e.g. last 6 weeks of earnings). The last bar is
// highlighted as "current".
export function BarChart({ values, labels }: { values: number[]; labels: string[] }) {
  const palette = useRolePalette();
  const max = Math.max(1, ...values);

  return (
    <View className="flex-row items-end justify-between gap-2" style={{ height: 96 }}>
      {values.map((v, i) => {
        const isLast = i === values.length - 1;
        const heightPct = Math.max(4, (v / max) * 100);
        return (
          <View key={i} className="flex-1 items-center justify-end" style={{ height: "100%" }}>
            {v > 0 ? (
              <Text className="mb-1 text-[9px] font-semibold" style={{ color: palette.muted }}>${v}</Text>
            ) : null}
            <View
              className="w-full rounded-md"
              style={{ height: `${heightPct}%`, backgroundColor: isLast ? palette.primary : palette.primarySoft }}
            />
            <Text className="mt-1.5 text-[10px]" style={{ color: palette.muted }}>{labels[i]}</Text>
          </View>
        );
      })}
    </View>
  );
}
