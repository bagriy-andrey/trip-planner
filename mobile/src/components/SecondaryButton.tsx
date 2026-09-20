import { Pressable, StyleSheet, View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";
import type { ReactNode } from "react";

import { layout, radius, spacing, useTheme } from "@/lib/theme";

import { AppText } from "./AppText";
import { MIN_HIT_SIZE } from "./a11y";
import type { AccessibleProps } from "./a11y";

export interface SecondaryButtonProps extends AccessibleProps {
  /** Visible text (already translated by the caller). */
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  /** Optional node before the label (e.g. a provider glyph). */
  leading?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function SecondaryButton({
  label,
  onPress,
  disabled = false,
  leading,
  style,
  accessibilityLabel,
  accessibilityHint,
  testID,
}: SecondaryButtonProps) {
  const { tokens } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: tokens.surface,
          borderColor: tokens.surfaceBorder,
          opacity: disabled ? 0.4 : pressed ? 0.8 : 1,
        },
        style,
      ]}
    >
      <View style={styles.content}>
        {leading}
        <AppText variant="button" style={styles.label}>
          {label}
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: MIN_HIT_SIZE,
    minWidth: MIN_HIT_SIZE,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.pill,
    borderWidth: layout.borderWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  content: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm },
  label: { flexShrink: 1, textAlign: "center" },
});
