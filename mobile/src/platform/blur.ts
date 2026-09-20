// Neutral blur surface: the only place platform differences for blur may live
// (AC-27). Default + iOS: the native `expo-blur` view. Android: blur.android.ts.
import { BlurView } from "expo-blur";
import { createElement } from "react";
import type { ReactElement, ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";

import { blurIntensity } from "@/lib/theme";

export type BlurTint = "light" | "dark" | "default";

export interface BlurProps {
  /** 1–100. */
  intensity?: number;
  tint?: BlurTint;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}

export function Blur({ intensity = blurIntensity.panel, tint = "default", style, children }: BlurProps): ReactElement {
  return createElement(BlurView, { intensity, tint, style }, children);
}
