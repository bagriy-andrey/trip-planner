import { StyleSheet, View } from "react-native";

import { AppText, ToggleSwitch } from "@/components";
import { spacing } from "@/lib/theme";

export interface SwitchRowProps {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  testID: string;
}

/** A label with the 44x24 switch on the right (the label is also the switch's spoken name). */
export function SwitchRow({ label, value, onChange, testID }: SwitchRowProps) {
  return (
    <View style={styles.row}>
      <AppText style={styles.label}>{label}</AppText>
      <ToggleSwitch label={label} value={value} onChange={onChange} testID={testID} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md },
  label: { flex: 1 },
});
