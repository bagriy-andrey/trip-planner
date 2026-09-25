import type { CalendarDate } from "@tripplanner/shared";
import { useEffect } from "react";
import { AccessibilityInfo, Pressable, StyleSheet, View } from "react-native";

import { AppText, Checkbox, Icon } from "@/components";
import { formatCalendarRange, resolveLocale, useTranslation } from "@/lib/i18n";
import { layout, radius, spacing, useTheme } from "@/lib/theme";

export interface DatesBlockProps {
  startDate: CalendarDate | null;
  endDate: CalendarDate | null;
  noDates: boolean;
  /** The dates sheet is drawn by the screen (it must sit outside the scroll view); this asks to open it. */
  onOpen: () => void;
  /** The sheet is showing: the field gets the accent border. */
  open: boolean;
  onChangeNoDates: (noDates: boolean) => void;
  /** Block-level problem (already translated). */
  errorText?: string;
  testID?: string;
}

/**
 * The "Dates" block: ONE field showing the range, which opens a bottom sheet with a calendar where
 * the user taps the first and the last day (no intermediate default date), and the "No dates yet"
 * checkbox, which hides the field (AC-21). Problems are shown once, under the block.
 */
export function DatesBlock({
  startDate,
  endDate,
  noDates,
  onOpen,
  open,
  onChangeNoDates,
  errorText,
  testID,
}: DatesBlockProps) {
  const { t, i18n } = useTranslation("trips");
  const { tokens } = useTheme();
  const locale = resolveLocale([i18n.language]);
  const hasError = errorText !== undefined && errorText !== "";

  useEffect(() => {
    if (errorText) AccessibilityInfo.announceForAccessibility(errorText);
  }, [errorText]);

  const hasRange = startDate !== null && endDate !== null;
  const fieldText = hasRange ? formatCalendarRange(locale, startDate, endDate) : t("form.dates.choose");

  return (
    <View testID={testID} style={styles.block}>
      <AppText variant="small" color="textSecondary">
        {t("form.dates.label")}
      </AppText>
      {noDates ? null : (
        <>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={hasRange ? t("form.a11y.datesField", { value: fieldText }) : fieldText}
            accessibilityState={{ expanded: open }}
            onPress={onOpen}
            testID="trip-form-dates-field"
            style={[styles.field, { backgroundColor: tokens.surface, borderColor: open ? tokens.accent : tokens.surfaceBorder }]}
          >
            <Icon name="calendar" color="textSecondary" />
            <AppText color={hasRange ? "text" : "textSecondary"}>{fieldText}</AppText>
          </Pressable>
        </>
      )}
      {hasError ? (
        <AppText
          variant="small"
          color="danger"
          accessibilityRole="alert"
          testID="trip-form-dates-error"
        >
          {errorText}
        </AppText>
      ) : null}
      <View style={styles.checkRow}>
        <Checkbox
          checked={noDates}
          onChange={onChangeNoDates}
          accessibilityLabel={t("form.dates.noDates")}
          testID="trip-form-no-dates"
        />
        {/* Tapping the words toggles too; the checkbox alone carries the accessible name. */}
        <Pressable
          onPress={() => onChangeNoDates(!noDates)}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={styles.checkCaption}
        >
          <AppText>{t("form.dates.noDates")}</AppText>
        </Pressable>
      </View>
      {noDates ? (
        <AppText variant="small" color="textSecondary">
          {t("form.dates.noDatesHint")}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: spacing.sm },
  field: {
    minHeight: layout.minTouch,
    minWidth: layout.minTouch,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.field,
    borderWidth: layout.borderWidth,
  },
  checkRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  checkCaption: { flex: 1, minHeight: layout.minTouch, justifyContent: "center" },
});
