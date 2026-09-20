import { StyleSheet, View } from "react-native";

import { AppText, PressableRow, SoonBadge } from "@/components";
import { useTranslation } from "@/lib/i18n";
import { spacing } from "@/lib/theme";

export interface SoonSettingRowProps {
  /** Already translated row title. */
  label: string;
  /** Already translated current value, e.g. "EUR"; shown under the title. */
  value?: string;
  testID?: string;
}

/**
 * Stubbed settings row (Q7): tappable, goes nowhere, no alert, always carries
 * the "soon" marker and announces it to screen readers.
 */
export function SoonSettingRow({ label, value, testID }: SoonSettingRowProps) {
  const { t } = useTranslation("common");
  const spoken = [label, value].filter((part) => part !== undefined).join(", ");
  return (
    <PressableRow
      accessibilityRole="button"
      accessibilityLabel={spoken}
      accessibilityHint={t("a11y.soonHint")}
      testID={testID}
      style={styles.row}
    >
      <View style={styles.text}>
        <AppText>{label}</AppText>
        {value !== undefined ? (
          <AppText variant="small" color="textSecondary">
            {value}
          </AppText>
        ) : null}
      </View>
      <SoonBadge />
    </PressableRow>
  );
}

const styles = StyleSheet.create({
  row: { justifyContent: "space-between", paddingVertical: spacing.sm },
  text: { flex: 1, flexShrink: 1 },
});
