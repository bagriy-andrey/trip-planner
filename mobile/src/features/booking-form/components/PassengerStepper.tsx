import { StyleSheet, View } from "react-native";

import { AppText, Stepper } from "@/components";
import { useTranslation } from "@/lib/i18n";
import { spacing } from "@/lib/theme";

export interface PassengerStepperProps {
  /** Already translated caption ("Passengers"). */
  label: string;
  /** Static count: the skeleton never changes it (Q15). */
  value: number;
  testID?: string;
}

/** "Passengers" row with the − / + stepper. Both buttons are inert, the value stays put. */
export function PassengerStepper({ label, value, testID }: PassengerStepperProps) {
  const { t } = useTranslation("bookingForm");
  return (
    <View style={styles.row}>
      <AppText style={styles.label}>{label}</AppText>
      <Stepper
        value={value}
        accessibilityLabel={label}
        decrementAccessibilityLabel={t("a11y.decreasePassengers")}
        incrementAccessibilityLabel={t("a11y.increasePassengers")}
        testID={testID}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md },
  label: { flexShrink: 1 },
});
