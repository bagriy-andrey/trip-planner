import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";
import type { ReactNode } from "react";

import { radius, spacing, useTheme } from "@/lib/theme";

import { AppText } from "./AppText";
import { MIN_HIT_SIZE } from "./a11y";
import type { AccessibleProps } from "./a11y";

export interface PrimaryButtonProps extends AccessibleProps {
  /** Visible text (already translated by the caller). */
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  /**
   * Request in flight: a spinner replaces `leading` inside the button and presses are blocked
   * (no modal spinner, no double submit). The button keeps its active look: it is busy, not
   * unavailable.
   */
  loading?: boolean;
  /** Optional node before the label (e.g. a provider glyph). */
  leading?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function PrimaryButton({
  label,
  onPress,
  disabled = false,
  loading = false,
  leading,
  style,
  accessibilityLabel,
  accessibilityHint,
  testID,
}: PrimaryButtonProps) {
  const { tokens } = useTheme();
  const blocked = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: blocked, busy: loading }}
      disabled={blocked}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [
        styles.base,
        // Disabled is a colour state (`divider` + `textTertiary`), never opacity on the active
        // style: opacity drags the text down with it and breaks contrast (design/tokens.md).
        disabled
          ? { backgroundColor: tokens.divider }
          : { backgroundColor: tokens.accent, opacity: pressed ? 0.8 : 1 },
        style,
      ]}
    >
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator
            color={tokens.onAccent}
            testID={testID ? `${testID}-spinner` : undefined}
          />
        ) : (
          leading
        )}
        <AppText
          variant="button"
          color={disabled ? "textTertiary" : "onAccent"}
          style={styles.label}
        >
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
    alignItems: "center",
    justifyContent: "center",
  },
  content: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm },
  label: { flexShrink: 1, textAlign: "center" },
});
