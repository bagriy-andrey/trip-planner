import { StyleSheet, View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";

import { radii, spacing, useTheme } from "@/lib/theme";

import { AppText } from "./AppText";

export type PillTone = "accent" | "neutral" | "muted";

export interface PillProps {
  /** Visible text (already translated by the caller). */
  label: string;
  tone?: PillTone;
  /** Overrides the spoken label when the visible text alone is unclear. */
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function Pill({ label, tone = "neutral", accessibilityLabel, style, testID }: PillProps) {
  const { tokens } = useTheme();
  const background = tone === "accent" ? tokens.accent : tokens.pill;
  const textColor = tone === "accent" ? "onAccent" : tone === "muted" ? "textMuted" : "text";
  return (
    <View
      accessible
      accessibilityLabel={accessibilityLabel ?? label}
      testID={testID}
      style={[styles.pill, { backgroundColor: background }, style]}
    >
      <AppText variant="caption" color={textColor} numberOfLines={1}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: "flex-start",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
  },
});
