import { pickRangeDate } from "@tripplanner/shared";
import type { CalendarDate, PickedRange } from "@tripplanner/shared";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { AppText, Icon } from "@/components";
import { formatCalendarRange, resolveLocale, useTranslation } from "@/lib/i18n";
import { layout, radius, spacing, useTheme } from "@/lib/theme";

import { StayRangeCalendar } from "./StayRangeCalendar";

export interface StayDatesFieldProps {
  checkInDate: CalendarDate | null;
  checkOutDate: CalendarDate | null;
  /** Both ends at once: reported only when the second day is tapped (same day = a day-use stay). */
  onChangeRange: (checkIn: CalendarDate, checkOut: CalendarDate) => void;
  /** Month the calendar opens on when nothing is chosen (today). */
  startFallback: CalendarDate;
  /** Missing-date / stay-too-long problems, already translated; each is shown on its own line. */
  errorTexts?: readonly string[];
  testID: string;
}

/** The stay's ONE range field: shows "from - to" and opens an inline range calendar (same interaction as the trip form). */
export function StayDatesField({
  checkInDate,
  checkOutDate,
  onChangeRange,
  startFallback,
  errorTexts = [],
  testID,
}: StayDatesFieldProps) {
  const { t, i18n } = useTranslation("hotel");
  const { tokens } = useTheme();
  const locale = resolveLocale([i18n.language]);
  const [open, setOpen] = useState(false);
  // The first tap of a new range waits here until the second one completes it.
  const [pending, setPending] = useState<PickedRange | null>(null);

  const shown: PickedRange = pending ?? { start: checkInDate, end: checkOutDate };
  const hasRange = checkInDate !== null && checkOutDate !== null;
  const fieldText = hasRange ? formatCalendarRange(locale, checkInDate, checkOutDate) : t("form.field.datesChoose");

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
        {t("form.field.dates")}
      </AppText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={hasRange ? t("form.a11y.datesField", { value: fieldText }) : fieldText}
        accessibilityState={{ expanded: open }}
        onPress={() => {
          setPending(null);
          setOpen((current) => !current);
        }}
        testID={`${testID}-field`}
        style={[styles.field, { backgroundColor: tokens.surface, borderColor: open ? tokens.accent : tokens.surfaceBorder }]}
      >
        <Icon name="calendar" color="textSecondary" />
        <AppText variant={hasRange ? "mono" : "body"} color={hasRange ? "text" : "textSecondary"}>
          {fieldText}
        </AppText>
      </Pressable>
      {open ? (
        <View style={styles.calendar}>
          <AppText variant="small" color="textSecondary">
            {shown.start !== null && shown.end === null ? t("form.field.datesPickEnd") : t("form.field.datesPickStart")}
          </AppText>
          <StayRangeCalendar
            start={shown.start}
            end={shown.end}
            initialMonthOf={startFallback}
            onPick={pick}
            testID={`${testID}-calendar`}
          />
        </View>
      ) : null}
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
    minWidth: layout.minTouch,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.field,
    borderWidth: layout.borderWidth,
  },
  calendar: { gap: spacing.sm },
});
