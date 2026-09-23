import { isClockTime } from "@tripplanner/shared";
import type { CalendarDate, ClockTime } from "@tripplanner/shared";
import { useEffect } from "react";
import { AccessibilityInfo, StyleSheet, View } from "react-native";

import { AppText, Icon, IconButton } from "@/components";
import { formatCalendarDate, resolveLocale, useTranslation } from "@/lib/i18n";
import { spacing } from "@/lib/theme";
import { DatePicker, TimePicker } from "@/platform/datePicker";

export interface ArrivalBlockProps {
  dateLabel: string;
  timeLabel: string;
  /** "Optional, only needed to work out layovers" (AC-27, AC-28). */
  caption: string;
  date: CalendarDate | null;
  time: ClockTime | null;
  /** `null` clears the field back to "not chosen" (both are set or cleared together). */
  onChangeDate: (date: CalendarDate | null) => void;
  onChangeTime: (time: ClockTime | null) => void;
  /** Where the date picker starts when the empty button is tapped (usually the departure date). */
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

/**
 * Arrival date + time — BOTH optional (AC-27): a segment with no arrival is valid, connections
 * just can't be computed for it. Same empty-button pattern as `DepartureBlock`.
 */
export function ArrivalBlock({
  dateLabel,
  timeLabel,
  caption,
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
}: ArrivalBlockProps) {
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
      <AppText variant="small" color="textSecondary">
        {caption}
      </AppText>
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
