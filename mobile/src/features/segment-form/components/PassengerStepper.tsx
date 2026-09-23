import { SEGMENT_PASSENGERS_MAX, SEGMENT_PASSENGERS_MIN } from "@tripplanner/shared";
import { StyleSheet, View } from "react-native";

import { AppText, Icon, IconButton } from "@/components";
import { spacing } from "@/lib/theme";

export interface PassengerStepperProps {
  label: string;
  value: number;
  decrementAccessibilityLabel: string;
  incrementAccessibilityLabel: string;
  onDecrement: () => void;
  onIncrement: () => void;
  testID?: string;
}

/**
 * "Пассажиры" — this feature's OWN working stepper: 1..9 (`SEGMENT_PASSENGERS_MIN/MAX` from
 * `shared`, never a locally invented number, AC-36), buttons disable at either boundary. The
 * value is body-face text, deliberately NOT mono ("Число пассажиров ... не моно", AGENTS.md).
 */
export function PassengerStepper({
  label,
  value,
  decrementAccessibilityLabel,
  incrementAccessibilityLabel,
  onDecrement,
  onIncrement,
  testID,
}: PassengerStepperProps) {
  return (
    <View testID={testID} style={styles.row}>
      <AppText style={styles.label}>{label}</AppText>
      <View style={styles.controls}>
        <IconButton
          accessibilityLabel={decrementAccessibilityLabel}
          disabled={value <= SEGMENT_PASSENGERS_MIN}
          onPress={onDecrement}
          testID={testID ? `${testID}-decrement` : undefined}
        >
          <Icon name="minus" />
        </IconButton>
        <AppText accessibilityLabel={`${label}, ${value}`} style={styles.value} testID={testID ? `${testID}-value` : undefined}>
          {String(value)}
        </AppText>
        <IconButton
          accessibilityLabel={incrementAccessibilityLabel}
          disabled={value >= SEGMENT_PASSENGERS_MAX}
          onPress={onIncrement}
          testID={testID ? `${testID}-increment` : undefined}
        >
          <Icon name="plus" />
        </IconButton>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md },
  label: { flexShrink: 1 },
  controls: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  value: { minWidth: spacing.xl, textAlign: "center" },
});
