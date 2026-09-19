import { StyleSheet, View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";

import { spacing } from "@/lib/theme";

import { AppText } from "./AppText";
import { IconButton } from "./IconButton";

export interface StepperProps {
  /** Static value between the buttons (the skeleton does not change it). */
  value: number;
  /** Spoken name of the value (e.g. "Passengers"); the value is appended. */
  accessibilityLabel: string;
  decrementAccessibilityLabel: string;
  incrementAccessibilityLabel: string;
  onDecrement?: () => void;
  onIncrement?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

// Operator glyphs, not translatable copy.
const MINUS = "−";
const PLUS = "+";

export function Stepper({
  value,
  accessibilityLabel,
  decrementAccessibilityLabel,
  incrementAccessibilityLabel,
  onDecrement,
  onIncrement,
  style,
  testID,
}: StepperProps) {
  return (
    <View testID={testID} style={[styles.row, style]}>
      <IconButton accessibilityLabel={decrementAccessibilityLabel} onPress={onDecrement}>
        <AppText variant="title">{MINUS}</AppText>
      </IconButton>
      <AppText
        variant="mono"
        accessibilityLabel={`${accessibilityLabel}, ${value}`}
        style={styles.value}
      >
        {String(value)}
      </AppText>
      <IconButton accessibilityLabel={incrementAccessibilityLabel} onPress={onIncrement}>
        <AppText variant="title">{PLUS}</AppText>
      </IconButton>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  value: { minWidth: spacing.xl, textAlign: "center" },
});
