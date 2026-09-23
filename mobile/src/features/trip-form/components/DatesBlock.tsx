import { pickRangeDate } from "@tripplanner/shared";
import type { CalendarDate, PickedRange } from "@tripplanner/shared";
import { useEffect, useState } from "react";
import { AccessibilityInfo, Pressable, StyleSheet, View } from "react-native";

import { AppText, Checkbox, Icon } from "@/components";
import { formatCalendarRange, resolveLocale, useTranslation } from "@/lib/i18n";
import { layout, radius, spacing, useTheme } from "@/lib/theme";

import { RangeCalendar } from "./RangeCalendar";

export interface DatesBlockProps {
  startDate: CalendarDate | null;
  endDate: CalendarDate | null;
  noDates: boolean;
  /** Both ends at once: the range is only reported once the second day is tapped. */
  onChangeRange: (start: CalendarDate, end: CalendarDate) => void;
  onChangeNoDates: (noDates: boolean) => void;
  /** Month the calendar opens on when no range is chosen yet (usually today). */
  startFallback: CalendarDate;
  /** Block-level problem (already translated). */
  errorText?: string;
  testID?: string;
}

/**
 * The "Dates" block: ONE field showing the range, which opens a calendar right below it where
 * the user taps the first and the last day (no intermediate default date), and the "No dates yet"
 * checkbox, which hides the field (AC-21). Problems are shown once, under the block.
 */
export function DatesBlock({
  startDate,
  endDate,
  noDates,
  onChangeRange,
  onChangeNoDates,
  startFallback,
  errorText,
  testID,
}: DatesBlockProps) {
  const { t, i18n } = useTranslation("trips");
  const { tokens } = useTheme();
  const locale = resolveLocale([i18n.language]);
  const hasError = errorText !== undefined && errorText !== "";
  const [open, setOpen] = useState(false);
  // The first tap of a new range lives here until the second one completes it.
  const [pending, setPending] = useState<PickedRange | null>(null);

  useEffect(() => {
    if (errorText) AccessibilityInfo.announceForAccessibility(errorText);
  }, [errorText]);

  const shown: PickedRange = pending ?? { start: startDate, end: endDate };
  const hasRange = startDate !== null && endDate !== null;
  const fieldText = hasRange ? formatCalendarRange(locale, startDate, endDate) : t("form.dates.choose");

  const toggle = () => {
    setPending(null);
    setOpen((current) => !current);
  };

  const pick = (day: CalendarDate) => {
    const next = pickRangeDate(shown, day);
    if (next.start !== null && next.end !== null) {
      setPending(null);
      setOpen(false);
      onChangeRange(next.start, next.end);
    } else {
      setPending(next);
    }
  };

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
            onPress={toggle}
            testID="trip-form-dates-field"
            style={[styles.field, { backgroundColor: tokens.surface, borderColor: open ? tokens.accent : tokens.surfaceBorder }]}
          >
            <Icon name="calendar" color="textSecondary" />
            <AppText color={hasRange ? "text" : "textSecondary"}>{fieldText}</AppText>
          </Pressable>
          {open ? (
            <View style={styles.calendar}>
              <AppText variant="small" color="textSecondary">
                {shown.start !== null && shown.end === null ? t("form.dates.pickEnd") : t("form.dates.pickStart")}
              </AppText>
              <RangeCalendar
                start={shown.start}
                end={shown.end}
                initialMonthOf={startFallback}
                onPick={pick}
                testID="trip-form-calendar"
              />
            </View>
          ) : null}
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
  calendar: { gap: spacing.sm },
  checkRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  checkCaption: { flex: 1, minHeight: layout.minTouch, justifyContent: "center" },
});
