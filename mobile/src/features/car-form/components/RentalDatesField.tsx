import type { CalendarDate } from "@tripplanner/shared";
import { Pressable, StyleSheet, View } from "react-native";

import { AppText, Icon } from "@/components";
import { formatRentalRange } from "@/features/cars";
import { useTranslation } from "@/lib/i18n";
import { layout, radius, spacing, useTheme } from "@/lib/theme";

export interface RentalDatesFieldProps {
  start: CalendarDate | null;
  end: CalendarDate | null;
  onOpen: () => void;
  /** Missing-date / too-long / past pick-up problems, already translated; one line each. */
  errorTexts: readonly string[];
  testID: string;
}

/** The rental's ONE range field: mono "19 – 27 Aug 2026" + calendar icon on the right; a tap opens the dates sheet. */
export function RentalDatesField({ start, end, onOpen, errorTexts, testID }: RentalDatesFieldProps) {
  const { t } = useTranslation("car");
  const { tokens } = useTheme();
  const hasRange = start !== null && end !== null;
  const fieldText = hasRange ? formatRentalRange(t, start, end) : t("form.field.datesPlaceholder");
  const hasError = errorTexts.length > 0;
  return (
    <View testID={testID} style={styles.block}>
      <AppText variant="small" color="textSecondary">
        {t("form.field.dates")}
      </AppText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={hasRange ? `${t("form.a11y.datesField")}: ${fieldText}` : fieldText}
        onPress={onOpen}
        testID={`${testID}-field`}
        style={[
          styles.field,
          { backgroundColor: tokens.surface, borderColor: hasError ? tokens.danger : tokens.surfaceBorder },
        ]}
      >
        <AppText variant={hasRange ? "mono" : "body"} color={hasRange ? "text" : "textSecondary"}>
          {fieldText}
        </AppText>
        <Icon name="calendar" color="textSecondary" />
      </Pressable>
      {errorTexts.map((message) => (
        <AppText key={message} variant="small" color="danger" accessibilityRole="alert">
          {message}
        </AppText>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: spacing.xs },
  field: {
    minHeight: layout.minTouch,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.field,
    borderWidth: layout.borderWidth,
  },
});
