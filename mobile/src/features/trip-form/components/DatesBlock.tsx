import type { CalendarDate } from "@tripplanner/shared";
import { useEffect } from "react";
import { AccessibilityInfo, Pressable, StyleSheet, View } from "react-native";

import { AppText, Checkbox, Icon } from "@/components";
import { formatCalendarDate, resolveLocale, useTranslation } from "@/lib/i18n";
import { layout, radius, spacing, useTheme } from "@/lib/theme";
import { DatePicker } from "@/platform/datePicker";

export interface DatesBlockProps {
  startDate: CalendarDate | null;
  endDate: CalendarDate | null;
  noDates: boolean;
  onChangeStart: (date: CalendarDate) => void;
  onChangeEnd: (date: CalendarDate) => void;
  onChangeNoDates: (noDates: boolean) => void;
  /** Where the start picker begins when the empty button is tapped. */
  startFallback: CalendarDate;
  /** Where the end picker begins when the empty button is tapped. */
  endFallback: CalendarDate;
  /** Block-level problem (already translated): one message for both buttons, not one each. */
  errorText?: string;
  testID?: string;
}

interface DateButtonProps {
  caption: string;
  value: CalendarDate | null;
  /** Spoken name with the chosen date, e.g. "Start date: Oct 5". */
  valueLabel: (formatted: string) => string;
  onChange: (date: CalendarDate) => void;
  /** Applied when an empty button is tapped, so a picker with a real value takes its place. */
  fallback: CalendarDate;
  minimumDate?: CalendarDate;
  testID: string;
}

/**
 * One date control. The native compact picker has no "empty" look (iOS shows today), so while
 * nothing is chosen a plain button stands in and the picker is mounted once a date exists:
 * the user never sees a date that is not actually part of the form.
 */
function DateButton({
  caption,
  value,
  valueLabel,
  onChange,
  fallback,
  minimumDate,
  testID,
}: DateButtonProps) {
  const { tokens } = useTheme();
  const { i18n } = useTranslation();
  const locale = resolveLocale([i18n.language]);

  return (
    <View style={styles.column}>
      <AppText variant="small" color="textSecondary">
        {caption}
      </AppText>
      {value === null ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={caption}
          onPress={() => onChange(fallback)}
          testID={testID}
          style={[
            styles.empty,
            { backgroundColor: tokens.surface, borderColor: tokens.surfaceBorder },
          ]}
        >
          <Icon name="calendar" color="textSecondary" />
        </Pressable>
      ) : (
        <DatePicker
          value={value}
          onChange={onChange}
          minimumDate={minimumDate}
          accessibilityLabel={valueLabel(formatCalendarDate(locale, value))}
          testID={testID}
        />
      )}
    </View>
  );
}

/**
 * The "Dates" block: Start and End buttons in a row and the "No dates yet" checkbox, which hides
 * both buttons (AC-21). Problems are shown once, under the block (AC-17..AC-19).
 */
export function DatesBlock({
  startDate,
  endDate,
  noDates,
  onChangeStart,
  onChangeEnd,
  onChangeNoDates,
  startFallback,
  endFallback,
  errorText,
  testID,
}: DatesBlockProps) {
  const { t } = useTranslation("trips");
  const hasError = errorText !== undefined && errorText !== "";

  useEffect(() => {
    if (errorText) AccessibilityInfo.announceForAccessibility(errorText);
  }, [errorText]);

  return (
    <View testID={testID} style={styles.block}>
      <AppText variant="small" color="textSecondary">
        {t("form.dates.label")}
      </AppText>
      {noDates ? null : (
        <View style={styles.row}>
          <DateButton
            caption={t("form.dates.start")}
            value={startDate}
            valueLabel={(value) => t("form.a11y.startDate", { value })}
            onChange={onChangeStart}
            fallback={startFallback}
            testID="trip-form-start-date"
          />
          <DateButton
            caption={t("form.dates.end")}
            value={endDate}
            valueLabel={(value) => t("form.a11y.endDate", { value })}
            onChange={onChangeEnd}
            fallback={endFallback}
            minimumDate={startDate ?? undefined}
            testID="trip-form-end-date"
          />
        </View>
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
  row: { flexDirection: "row", gap: spacing.gap },
  column: { flex: 1, gap: spacing.xs, alignItems: "flex-start" },
  empty: {
    minHeight: layout.minTouch,
    minWidth: layout.minTouch,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    borderRadius: radius.field,
    borderWidth: layout.borderWidth,
  },
  checkRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  checkCaption: { flex: 1, minHeight: layout.minTouch, justifyContent: "center" },
});
