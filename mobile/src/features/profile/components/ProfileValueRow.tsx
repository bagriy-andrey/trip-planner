import { StyleSheet, View } from "react-native";

import { AppText, CountryFlag, Icon, MIN_HIT_SIZE, PressableRow } from "@/components";
import { useTranslation } from "@/lib/i18n";
import { radius, spacing, useTheme } from "@/lib/theme";

import type { RowValue } from "../rowValues";

export interface ProfileValueRowProps {
  label: string;
  /** Second line under the label (home airport and currency only, AC-11). */
  hint?: string;
  /** `null` = still loading: a placeholder that cannot be pressed (AC-28). */
  value: RowValue | null;
  onPress: () => void;
  testID: string;
}

function ValueView({ value }: { value: RowValue }) {
  const { t: tPicker } = useTranslation("picker");
  const { t } = useTranslation("profile");
  switch (value.kind) {
    case "empty":
      return <AppText color="textSecondary">{tPicker("notSpecified")}</AppText>;
    case "country":
      return (
        <View style={styles.inline}>
          <CountryFlag countryCode={value.code} />
          <AppText numberOfLines={2} ellipsizeMode="tail" style={styles.shrink}>
            {value.name}
          </AppText>
        </View>
      );
    case "rawCode":
      return <AppText variant="mono">{value.code}</AppText>;
    case "city":
      return (
        <AppText numberOfLines={2} ellipsizeMode="tail">
          {value.name}
        </AppText>
      );
    case "unknownCity":
      return <AppText color="textSecondary">{t("values.notInDirectory")}</AppText>;
    case "text":
      return <AppText>{value.text}</AppText>;
  }
}

/** One tappable profile row: label (+hint) on the left, value and chevron on the right. */
export function ProfileValueRow({ label, hint, value, onPress, testID }: ProfileValueRowProps) {
  const { t } = useTranslation("profile");
  const { t: tPicker } = useTranslation("picker");
  const { tokens } = useTheme();

  const spokenOf = (v: RowValue): string => {
    switch (v.kind) {
      case "empty":
        return tPicker("notSpecified");
      case "country":
      case "city":
        return v.name;
      case "rawCode":
        return v.spoken ?? v.code;
      case "unknownCity":
        return t("values.notInDirectory");
      case "text":
        return v.text;
    }
  };
  const spoken = value === null ? label : t("a11y.row", { label, value: spokenOf(value) });

  return (
    <PressableRow
      accessibilityLabel={spoken}
      onPress={value === null ? undefined : onPress}
      disabled={value === null}
      testID={testID}
      style={styles.row}
    >
      <View style={styles.label}>
        <AppText>{label}</AppText>
        {hint !== undefined ? (
          <AppText variant="small" color="textSecondary">
            {hint}
          </AppText>
        ) : null}
      </View>
      <View style={styles.value}>
        {value === null ? (
          <View testID={`${testID}-placeholder`} style={[styles.placeholder, { backgroundColor: tokens.divider }]} />
        ) : (
          <ValueView value={value} />
        )}
        <Icon name="chevron" color="textSecondary" />
      </View>
    </PressableRow>
  );
}

const styles = StyleSheet.create({
  // One row in every language: the label (and its hint) wraps inside its own column, the value never drops below it.
  row: { justifyContent: "space-between", paddingVertical: spacing.sm },
  label: { flex: 1, flexShrink: 1 },
  value: { flexDirection: "row", alignItems: "center", gap: spacing.sm, flexShrink: 0, maxWidth: "50%", justifyContent: "flex-end" },
  inline: { flexDirection: "row", alignItems: "center", gap: spacing.sm, flexShrink: 1 },
  shrink: { flexShrink: 1 },
  placeholder: { width: MIN_HIT_SIZE * 2, height: spacing.lg, borderRadius: radius.tile },
});
