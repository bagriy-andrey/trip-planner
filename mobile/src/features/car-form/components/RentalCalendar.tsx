import { compareCalendarDates, monthGrid, shiftMonth } from "@tripplanner/shared";
import type { CalendarDate, YearMonth } from "@tripplanner/shared";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { AppText, Icon, IconButton } from "@/components";
import { formatRentalDay } from "@/features/cars";
import { resolveLocale, useTranslation } from "@/lib/i18n";
import { layout, spacing, useTheme } from "@/lib/theme";

export interface RentalCalendarProps {
  /** Chosen start (and end once picked); a lone start means "waiting for the end". */
  start: CalendarDate | null;
  end: CalendarDate | null;
  /** Month shown first when no start is chosen. */
  initialMonthOf: CalendarDate;
  /** Earliest selectable day: earlier days are disabled and months wholly before it are unreachable (AC-19). */
  floor: CalendarDate;
  onPick: (date: CalendarDate) => void;
  testID: string;
}

function monthOf(date: CalendarDate): YearMonth {
  const [year = 1970, month = 1] = date.split("-").map(Number);
  return { year, month };
}

/** 2023-01-02 is a Monday: the grid starts the week on Monday (AC-16). */
const REFERENCE_MONDAY = Date.UTC(2023, 0, 2);
const DAY_MS = 24 * 60 * 60 * 1000;
const EDGE_RADIUS = layout.minTouch / 2;

/** A month grid, weeks from Monday. It only reports taps; what a tap means is `pickRangeDate` in `shared`. */
export function RentalCalendar({ start, end, initialMonthOf, floor, onPick, testID }: RentalCalendarProps) {
  const { t, i18n } = useTranslation("car");
  const { tokens } = useTheme();
  const locale = resolveLocale([i18n.language]);
  const [shown, setShown] = useState<YearMonth>(() => monthOf(start ?? initialMonthOf));

  const title = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(shown.year, shown.month - 1, 1)),
  );
  const weekdays = Array.from({ length: 7 }, (_, i) =>
    new Intl.DateTimeFormat(locale, { weekday: "short", timeZone: "UTC" }).format(new Date(REFERENCE_MONDAY + i * DAY_MS)),
  );
  const floorMonth = monthOf(floor);
  const canGoBack = shown.year > floorMonth.year || (shown.year === floorMonth.year && shown.month > floorMonth.month);
  const ranged = start !== null && end !== null && start !== end;

  return (
    <View testID={testID} style={styles.root}>
      <View style={styles.header}>
        <IconButton
          filled={false}
          accessibilityLabel={t("form.datesSheet.prevMonth")}
          disabled={!canGoBack}
          onPress={() => setShown(shiftMonth(shown, -1))}
          testID={`${testID}-prev`}
        >
          <Icon name="chevronLeft" />
        </IconButton>
        <AppText variant="cardTitle" accessibilityRole="header">
          {title}
        </AppText>
        <IconButton
          filled={false}
          accessibilityLabel={t("form.datesSheet.nextMonth")}
          onPress={() => setShown(shiftMonth(shown, 1))}
          testID={`${testID}-next`}
        >
          <Icon name="chevron" />
        </IconButton>
      </View>
      <View style={styles.week}>
        {weekdays.map((name, i) => (
          <View key={i} style={styles.cell}>
            <AppText variant="small" color="textTertiary">
              {name}
            </AppText>
          </View>
        ))}
      </View>
      {monthGrid(shown, 1).map((week, weekIndex) => (
        <View key={weekIndex} style={styles.week}>
          {week.map((day, dayIndex) => {
            if (day === null) return <View key={dayIndex} style={styles.cell} />;
            const isStart = day === start;
            const isEnd = day === end;
            const selected = isStart || isEnd;
            const inside = start !== null && end !== null && compareCalendarDates(day, start) > 0 && compareCalendarDates(day, end) < 0;
            const disabled = compareCalendarDates(day, floor) < 0;
            const band = inside || (ranged && selected);
            return (
              <Pressable
                key={dayIndex}
                accessibilityRole="button"
                accessibilityLabel={formatRentalDay(t, day)}
                accessibilityState={{ selected: selected || inside, disabled }}
                disabled={disabled}
                onPress={() => onPick(day)}
                testID={`${testID}-day-${day}`}
                style={[
                  styles.cell,
                  band && { backgroundColor: tokens.surfaceStrong },
                  ranged && isStart && styles.bandStart,
                  ranged && isEnd && styles.bandEnd,
                ]}
              >
                <View style={[styles.circle, selected && { backgroundColor: tokens.accent }]}>
                  <AppText variant="mono" color={selected ? "onAccent" : disabled ? "textTertiary" : "text"}>
                    {Number(day.slice(8))}
                  </AppText>
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.xs },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  week: { flexDirection: "row" },
  cell: { flex: 1, minHeight: layout.minTouch, alignItems: "center", justifyContent: "center" },
  circle: {
    width: layout.calendarDayCircle,
    height: layout.calendarDayCircle,
    borderRadius: layout.calendarDayCircle / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  bandStart: { borderTopLeftRadius: EDGE_RADIUS, borderBottomLeftRadius: EDGE_RADIUS },
  bandEnd: { borderTopRightRadius: EDGE_RADIUS, borderBottomRightRadius: EDGE_RADIUS },
});
