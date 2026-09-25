import { StyleSheet, View } from "react-native";

import { AppText, MIN_HIT_SIZE, ToggleSwitch } from "@/components";
import { spacing } from "@/lib/theme";

export interface BaggageToggleProps {
  /** Already translated caption ("Baggage included"); also the spoken name. */
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  testID?: string;
}

/** "Baggage included": a caption row around the shared `ToggleSwitch`. */
export function BaggageToggle({ label, value, onChange, testID }: BaggageToggleProps) {
  return (
    <View style={styles.row}>
      <AppText style={styles.label}>{label}</AppText>
      <ToggleSwitch label={label} value={value} onChange={onChange} testID={testID} />
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
