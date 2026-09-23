import { isClockTime } from "@tripplanner/shared";
import type { CalendarDate, ClockTime } from "@tripplanner/shared";
import { StyleSheet, View } from "react-native";

import { AppText, Icon, IconButton } from "@/components";
import { formatCalendarDate, resolveLocale, useTranslation } from "@/lib/i18n";
import { spacing } from "@/lib/theme";
import { DatePicker, TimePicker } from "@/platform/datePicker";

export interface StayDateTimeRowProps {
  /** "Заезд" / "Выезд". */
  label: string;
  date: CalendarDate | null;
  time: ClockTime | null;
  onChangeDate: (date: CalendarDate | null) => void;
  onChangeTime: (time: ClockTime | null) => void;
  /** Earliest selectable day: the check-in date for the check-out row (AC-13). */
  minimumDate?: CalendarDate;
  /** Day the empty date picker opens on. */
  startDate: CalendarDate;
  /** Time the empty time picker opens on: "15:00" check-in, "11:00" check-out (AC-13). */
  startTime: ClockTime;
  errorText?: string;
  testID: string;
}

/** One "date + time" line of the stay (AC-13): one tap on an empty field opens the picker, a filled one has a "×". */
export function StayDateTimeRow({
  label,
  date,
  time,
  onChangeDate,
  onChangeTime,
  minimumDate,
  startDate,
  startTime,
  errorText,
  testID,
}: StayDateTimeRowProps) {
  const { t } = useTranslation("hotel");
  const { i18n } = useTranslation();
  const locale = resolveLocale([i18n.language]);
  const dateLabel = `${label}, ${t("form.field.date")}`;
  const timeLabel = `${label}, ${t("form.field.time")}`;
  const clear = t("form.a11y.clear");

  return (
    <View testID={testID} style={styles.block}>
      <AppText variant="small" color="textSecondary">
        {label}
      </AppText>
      <View style={styles.row}>
        <View style={styles.control}>
          <DatePicker
            value={date}
            onChange={onChangeDate}
            startDate={startDate}
            minimumDate={minimumDate}
            emptyContent={<Icon name="calendar" color="textSecondary" />}
            accessibilityLabel={date === null ? dateLabel : `${dateLabel}: ${formatCalendarDate(locale, date)}`}
            testID={`${testID}-date`}
          />
          {date !== null ? (
            <IconButton
              filled={false}
              accessibilityLabel={`${clear}: ${dateLabel}`}
              onPress={() => onChangeDate(null)}
              testID={`${testID}-date-clear`}
            >
              <Icon name="close" color="textSecondary" />
            </IconButton>
          ) : null}
        </View>
        <View style={styles.control}>
          <TimePicker
            value={time}
            onChange={(picked) => {
              if (isClockTime(picked)) onChangeTime(picked);
            }}
            startTime={startTime}
            emptyContent={<Icon name="clock" color="textSecondary" />}
            accessibilityLabel={time === null ? timeLabel : `${timeLabel}: ${time}`}
            testID={`${testID}-time`}
          />
          {time !== null ? (
            <IconButton
              filled={false}
              accessibilityLabel={`${clear}: ${timeLabel}`}
              onPress={() => onChangeTime(null)}
              testID={`${testID}-time-clear`}
            >
              <Icon name="close" color="textSecondary" />
            </IconButton>
          ) : null}
        </View>
      </View>
      {errorText === undefined ? null : (
        <AppText variant="small" color="danger" accessibilityRole="alert">
          {errorText}
        </AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: spacing.xs },
  row: { flexDirection: "row", gap: spacing.gap },
  control: { flex: 1, flexDirection: "row", alignItems: "center", gap: spacing.xs },
});
