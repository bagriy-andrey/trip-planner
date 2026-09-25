import { StyleSheet, View } from "react-native";

import { AppText, PressableRow, SoonBadge } from "@/components";
import { useTranslation } from "@/lib/i18n";
import { spacing } from "@/lib/theme";

export interface SoonSettingRowProps {
  /** Already translated row title. */
  label: string;
  testID?: string;
}

/**
 * Stubbed settings row (Q7): tappable, goes nowhere, no alert, always carries
 * the "soon" marker and announces it to screen readers.
 */
export function SoonSettingRow({ label, testID }: SoonSettingRowProps) {
  const { t } = useTranslation("common");
  return (
    <PressableRow
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={t("a11y.soonHint")}
      testID={testID}
      style={styles.row}
    >
      <View style={styles.text}>
        <AppText>{label}</AppText>
      </View>
      <SoonBadge />
    </PressableRow>
  );
}

const styles = StyleSheet.create({
  row: { justifyContent: "space-between", paddingVertical: spacing.sm },
  text: { flex: 1, flexShrink: 1 },
});
