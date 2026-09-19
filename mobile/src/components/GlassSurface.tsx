import { StyleSheet, View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";
import type { ReactNode } from "react";

import { Blur } from "@/platform/blur";
import { radii, useTheme } from "@/lib/theme";

export interface GlassSurfaceProps {
  children?: ReactNode;
  /** Blur strength, 1–100. */
  intensity?: number;
  /**
   * Adds a scrim under the content (token `coverOverlay`) for text sitting on
   * a busy/colourful cover, when the plain glass gives too little contrast (AC-22).
   */
  strengthen?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function GlassSurface({ children, intensity = 30, strengthen = false, style }: GlassSurfaceProps) {
  const { tokens, scheme } = useTheme();
  return (
    <Blur
      intensity={intensity}
      tint={scheme}
      style={[
        styles.surface,
        { backgroundColor: tokens.glass, borderColor: tokens.glassBorder },
        style,
      ]}
    >
      {strengthen ? (
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: tokens.coverOverlay }]} />
      ) : null}
      {children}
    </Blur>
  );
}

const styles = StyleSheet.create({
  surface: {
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
});
