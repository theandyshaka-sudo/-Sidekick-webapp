import { useMemo, useRef, useState } from "react";
import { PanResponder, Text, View, type GestureResponderEvent, type PanResponderGestureState } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRolePalette } from "../theme/useRolePalette";
import { hexToRgb, hsvToRgb, rgbToHex } from "../lib/color";

const SQUARE_SIZE = 220;
const HUE_HEIGHT = 28;
const THUMB_SIZE = 22;

// Standard 6-stop hue rainbow (0°..360° in 60° steps) — LinearGradient spaces `colors` evenly by
// default, which lines up exactly with these equal 60° steps.
const HUE_STOPS = ["#FF0000", "#FFFF00", "#00FF00", "#00FFFF", "#0000FF", "#FF00FF", "#FF0000"] as const;

function hexToHsv(hex: string): { h: number; s: number; v: number } {
  const [r, g, b] = hexToRgb(hex).map((c) => c / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = 60 * (((g - b) / d) % 6);
    else if (max === g) h = 60 * ((b - r) / d + 2);
    else h = 60 * ((r - g) / d + 4);
  }
  if (h < 0) h += 360;
  const s = max === 0 ? 0 : d / max;
  return { h, s, v: max };
}

// A classic saturation/value square + hue slider — the practical equivalent of a color wheel
// without needing canvas or SVG (this app has neither), built entirely from PanResponder (built
// into React Native) and expo-linear-gradient (already a dependency).
export function AccentColorPicker({ value, onChange }: { value: string; onChange: (hex: string) => void }) {
  const palette = useRolePalette();
  const initial = useMemo(() => hexToHsv(value), [value]);
  const [hue, setHue] = useState(initial.h);
  const [sat, setSat] = useState(initial.s);
  const [val, setVal] = useState(initial.v);

  const hex = useMemo(() => rgbToHex(hsvToRgb(hue, sat, val)), [hue, sat, val]);
  const hueColor = useMemo(() => rgbToHex(hsvToRgb(hue, 1, 1)), [hue]);

  // The PanResponders below are created once via useRef and never rebuilt, so their handlers close
  // over whatever hue/sat/val/onChange were current at mount time. Route through refs (mutated on
  // every render) instead of reading the closed-over values directly, or dragging the square after
  // moving the hue slider — or vice versa — snaps back to whatever was current on first mount.
  const latest = useRef({ hue, sat, val, onChange });
  latest.current = { hue, sat, val, onChange };

  const updateFromSquare = (evt: GestureResponderEvent) => {
    const { locationX, locationY } = evt.nativeEvent;
    const s = Math.max(0, Math.min(1, locationX / SQUARE_SIZE));
    const v = Math.max(0, Math.min(1, 1 - locationY / SQUARE_SIZE));
    setSat(s);
    setVal(v);
    latest.current.onChange(rgbToHex(hsvToRgb(latest.current.hue, s, v)));
  };

  const updateFromHue = (evt: GestureResponderEvent) => {
    const { locationX } = evt.nativeEvent;
    const h = Math.max(0, Math.min(1, locationX / SQUARE_SIZE)) * 360;
    setHue(h);
    latest.current.onChange(rgbToHex(hsvToRgb(h, latest.current.sat, latest.current.val)));
  };

  const squareResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: updateFromSquare,
      onPanResponderMove: updateFromSquare,
    })
  ).current;

  const hueResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: updateFromHue,
      onPanResponderMove: updateFromHue,
    })
  ).current;

  return (
    <View className="items-center">
      <View
        style={{ width: SQUARE_SIZE, height: SQUARE_SIZE, backgroundColor: hueColor, borderRadius: 16, overflow: "hidden" }}
        {...squareResponder.panHandlers}
      >
        <LinearGradient
          colors={["rgba(255,255,255,1)", "rgba(255,255,255,0)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}
        />
        <LinearGradient
          colors={["rgba(0,0,0,0)", "rgba(0,0,0,1)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}
        />
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: sat * SQUARE_SIZE - THUMB_SIZE / 2,
            top: (1 - val) * SQUARE_SIZE - THUMB_SIZE / 2,
            width: THUMB_SIZE,
            height: THUMB_SIZE,
            borderRadius: THUMB_SIZE / 2,
            borderWidth: 3,
            borderColor: "#FFFFFF",
            backgroundColor: hex,
            shadowColor: "#000",
            shadowOpacity: 0.3,
            shadowRadius: 3,
          }}
        />
      </View>

      <View
        style={{ width: SQUARE_SIZE, height: HUE_HEIGHT, marginTop: 14, borderRadius: HUE_HEIGHT / 2, overflow: "hidden" }}
        {...hueResponder.panHandlers}
      >
        <LinearGradient colors={HUE_STOPS} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ flex: 1 }} />
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: (hue / 360) * SQUARE_SIZE - HUE_HEIGHT / 2,
            top: 0,
            width: HUE_HEIGHT,
            height: HUE_HEIGHT,
            borderRadius: HUE_HEIGHT / 2,
            borderWidth: 3,
            borderColor: "#FFFFFF",
            backgroundColor: hueColor,
          }}
        />
      </View>

      <View className="mt-4 flex-row items-center gap-3">
        <View
          style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: hex, borderWidth: 1, borderColor: palette.border }}
        />
        <Text className="text-base font-semibold uppercase text-text">{hex}</Text>
      </View>
    </View>
  );
}
