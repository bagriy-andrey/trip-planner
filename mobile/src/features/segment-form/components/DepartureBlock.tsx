import { isClockTime } from "@tripplanner/shared";
import type { CalendarDate, ClockTime } from "@tripplanner/shared";
import { useEffect } from "react";
import { AccessibilityInfo, StyleSheet, View } from "react-native";

import { AppText, Icon, IconButton } from "@/components";
import { formatCalendarDate, resolveLocale, useTranslation } from "@/lib/i18n";
import { spacing } from "@/lib/theme";
import { DatePicker, TimePicker } from "@/platform/datePicker";

export interface DepartureBlockProps {
  dateLabel: string;
  timeLabel: string;
  date: CalendarDate | null;
  time: ClockTime | null;
  onChangeDate: (date: CalendarDate) => void;
  onChangeTime: (time: ClockTime) => void;
  /** Where the date picker starts when the empty button is tapped (usually "today"). */
  dateFallback: CalendarDate;
  errorText?: string;
  /** Earliest day the calendar allows (inclusive). */
  minimumDate?: CalendarDate;
  /** Clears the field back to "not chosen"; the × shows only while a value is set. */
  onClearDate?: () => void;
  onClearTime?: () => void;
  /** Spoken prefix of the × buttons ("Clear"). */
  clearLabel: string;
  testID?: string;
}

/** Midnight: what the empty time button opens the picker at (deterministic, no clock read here). */
/**
 * Departure date + time (both required, AC-26). The native compact picker has no "empty" look, so
 * while nothing is chosen a plain button stands in and the real picker mounts once a value exists
 * — same pattern as `trip-form`'s `DatesBlock`.
 */
export function DepartureBlock({
  dateLabel,
  timeLabel,
  date,
  time,
  onChangeDate,
  onChangeTime,
  dateFallback,
  errorText,
  minimumDate,
  onClearDate,
  onClearTime,
  clearLabel,
  testID,
}: DepartureBlockProps) {
  const { i18n } = useTranslation();
  const locale = resolveLocale([i18n.language]);
  const hasError = errorText !== undefined && errorText !== "";

  useEffect(() => {
    if (errorText) AccessibilityInfo.announceForAccessibility(errorText);
  }, [errorText]);

  return (
    <View testID={testID} style={styles.block}>
      <View style={styles.row}>
        <View style={styles.column}>
          <AppText variant="small" color="textSecondary">
            {dateLabel}
          </AppText>
          <View style={styles.control}>
            <DatePicker
              value={date}
              onChange={onChangeDate}
              startDate={dateFallback}
              minimumDate={minimumDate}
              emptyContent={<Icon name="calendar" color="textSecondary" />}
              accessibilityLabel={date === null ? dateLabel : `${dateLabel}: ${formatCalendarDate(locale, date)}`}
              testID={`${testID}-date`}
            />
            {date !== null && onClearDate !== undefined ? (
              <IconButton filled={false} accessibilityLabel={`${clearLabel}: ${dateLabel}`} onPress={onClearDate} testID={`${testID}-date-clear`}>
                <Icon name="close" color="textSecondary" />
              </IconButton>
            ) : null}
          </View>
        </View>
        <View style={styles.column}>
          <AppText variant="small" color="textSecondary">
            {timeLabel}
          </AppText>
          <View style={styles.control}>
            <TimePicker
              value={time}
              onChange={(picked) => {
                if (isClockTime(picked)) onChangeTime(picked);
              }}
              emptyContent={<Icon name="clock" color="textSecondary" />}
              accessibilityLabel={time === null ? timeLabel : `${timeLabel}: ${time}`}
              testID={`${testID}-time`}
            />
            {time !== null && onClearTime !== undefined ? (
              <IconButton filled={false} accessibilityLabel={`${clearLabel}: ${timeLabel}`} onPress={onClearTime} testID={`${testID}-time-clear`}>
                <Icon name="close" color="textSecondary" />
              </IconButton>
            ) : null}
          </View>
        </View>
      </View>
      {hasError ? (
        <AppText variant="small" color="danger" accessibilityRole="alert">
          {errorText}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: spacing.sm },
  row: { flexDirection: "row", gap: spacing.gap },
  column: { flex: 1, gap: spacing.xs, alignItems: "flex-start" },
  control: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
});
