import { Pressable, StyleSheet } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";
import type { ReactNode } from "react";

import { spacing } from "@/lib/theme";

import { MIN_HIT_SIZE } from "./a11y";
import type { AccessibleProps, InteractiveRole } from "./a11y";

export interface PressableRowProps extends AccessibleProps {
  children: ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  /** Defaults to "button"; use "link" for rows that navigate. */
  accessibilityRole?: InteractiveRole;
  style?: StyleProp<ViewStyle>;
}

/** Full-width tappable row (list rows, settings rows, cards). Layout is up to the children. */
export function PressableRow({
  children,
  onPress,
  disabled = false,
  accessibilityRole = "button",
  style,
  accessibilityLabel,
  accessibilityHint,
  testID,
}: PressableRowProps) {
  return (
    <Pressable
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [styles.base, { opacity: disabled ? 0.4 : pressed ? 0.7 : 1 }, style]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: MIN_HIT_SIZE,
    minWidth: MIN_HIT_SIZE,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
});
