import { useState } from "react";
import { StyleSheet, Switch, View } from "react-native";

import { AppText, MIN_HIT_SIZE } from "@/components";
import { spacing, useTheme } from "@/lib/theme";

export interface BaggageToggleProps {
  /** Already translated caption ("Baggage included"); also the spoken name. */
  label: string;
  testID?: string;
}

/** "Baggage included" switch. Its state lives in the component only: nothing is saved (skeleton). */
export function BaggageToggle({ label, testID }: BaggageToggleProps) {
  const { tokens } = useTheme();
  const [included, setIncluded] = useState(true);
  return (
    <View style={styles.row}>
      <AppText style={styles.label}>{label}</AppText>
      <Switch
        accessibilityLabel={label}
        value={included}
        onValueChange={setIncluded}
        trackColor={{ true: tokens.accent, false: tokens.divider }}
        testID={testID}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: MIN_HIT_SIZE,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  label: { flexShrink: 1 },
});
