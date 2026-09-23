import { isClockTime } from "@tripplanner/shared";
import type { CalendarDate, ClockTime } from "@tripplanner/shared";
import { useEffect } from "react";
import { AccessibilityInfo, Pressable, StyleSheet, View } from "react-native";

import { AppText, Icon } from "@/components";
import { formatCalendarDate, resolveLocale, useTranslation } from "@/lib/i18n";
import { layout, radius, spacing, useTheme } from "@/lib/theme";
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
  testID?: string;
}

const FALLBACK_TIME: ClockTime = "00:00";

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
  testID,
}: ArrivalBlockProps) {
  const { tokens } = useTheme();
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
          {date === null ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={dateLabel}
              onPress={() => onChangeDate(dateFallback)}
              testID={`${testID}-date`}
              style={[styles.empty, { backgroundColor: tokens.surface, borderColor: tokens.surfaceBorder }]}
            >
              <Icon name="calendar" color="textSecondary" />
            </Pressable>
          ) : (
            <DatePicker
              value={date}
              onChange={onChangeDate}
              accessibilityLabel={`${dateLabel}: ${formatCalendarDate(locale, date)}`}
              testID={`${testID}-date`}
            />
          )}
        </View>
        <View style={styles.column}>
          <AppText variant="small" color="textSecondary">
            {timeLabel}
          </AppText>
          {time === null ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={timeLabel}
              onPress={() => onChangeTime(FALLBACK_TIME)}
              testID={`${testID}-time`}
              style={[styles.empty, { backgroundColor: tokens.surface, borderColor: tokens.surfaceBorder }]}
            >
              <Icon name="clock" color="textSecondary" />
            </Pressable>
          ) : (
            <TimePicker
              value={time}
              onChange={(picked) => {
                if (isClockTime(picked)) onChangeTime(picked);
              }}
              accessibilityLabel={`${timeLabel}: ${time}`}
              testID={`${testID}-time`}
            />
          )}
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
  empty: {
    minHeight: layout.minTouch,
    minWidth: layout.minTouch,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    borderRadius: radius.field,
    borderWidth: layout.borderWidth,
  },
});
