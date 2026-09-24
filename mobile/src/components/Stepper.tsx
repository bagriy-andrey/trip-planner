import { StyleSheet, View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";

import { spacing } from "@/lib/theme";

import { AppText } from "./AppText";
import { Icon } from "./Icon";
import { IconButton } from "./IconButton";

export interface StepperProps {
  /** Static value between the buttons (the skeleton does not change it). */
  value: number;
  /** Spoken name of the value (e.g. "Passengers"); the value is appended. */
  accessibilityLabel: string;
  decrementAccessibilityLabel: string;
  incrementAccessibilityLabel: string;
  /** Lower bound: the decrement button is disabled at it. */
  min?: number;
  /** Upper bound: the increment button is disabled at it. */
  max?: number;
  /** Mono value face (default, ticket data). Pass false for non-ticket counts such as guests. */
  mono?: boolean;
  onDecrement?: () => void;
  onIncrement?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function Stepper({
  value,
  accessibilityLabel,
  decrementAccessibilityLabel,
  incrementAccessibilityLabel,
  min,
  max,
  mono = true,
  onDecrement,
  onIncrement,
  style,
  testID,
}: StepperProps) {
  return (
    <View testID={testID} style={[styles.row, style]}>
      <IconButton
        accessibilityLabel={decrementAccessibilityLabel}
        onPress={onDecrement}
        disabled={min !== undefined && value <= min}
      >
        <Icon name="minus" />
      </IconButton>
      <AppText
        variant={mono ? "mono" : "body"}
        accessibilityLabel={`${accessibilityLabel}, ${value}`}
        style={styles.value}
      >
        {String(value)}
      </AppText>
      <IconButton
        accessibilityLabel={incrementAccessibilityLabel}
        onPress={onIncrement}
        disabled={max !== undefined && value >= max}
      >
        <Icon name="plus" />
      </IconButton>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  value: { minWidth: spacing.xl, textAlign: "center" },
});
