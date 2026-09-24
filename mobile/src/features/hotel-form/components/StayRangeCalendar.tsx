import { compareCalendarDates, monthGrid, shiftMonth } from "@tripplanner/shared";
import type { CalendarDate, YearMonth } from "@tripplanner/shared";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { AppText, Icon, IconButton } from "@/components";
import { formatCalendarDate, resolveLocale, useTranslation } from "@/lib/i18n";
import { layout, radius, spacing, useTheme } from "@/lib/theme";

export interface StayRangeCalendarProps {
  /** Chosen start (and end once picked); a lone start means "waiting for the end". */
  start: CalendarDate | null;
  end: CalendarDate | null;
  /** Month shown first when nothing is chosen. */
  initialMonthOf: CalendarDate;
  onPick: (date: CalendarDate) => void;
  testID?: string;
}

function monthOf(date: CalendarDate): YearMonth {
  const [year = 1970, month = 1] = date.split("-").map(Number);
  return { year, month };
}

const REFERENCE_SUNDAY = Date.UTC(2023, 0, 1);
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * A month grid with range highlighting. It only reports taps; what a tap means (start, end,
 * start over) is `pickRangeDate` in `@tripplanner/shared`, so every client behaves alike.
 */
export function StayRangeCalendar({ start, end, initialMonthOf, onPick, testID }: StayRangeCalendarProps) {
  const { t, i18n } = useTranslation("hotel");
  const { tokens } = useTheme();
  const locale = resolveLocale([i18n.language]);
  const weekStart = locale === "ru" ? 1 : 0;
  const [shown, setShown] = useState<YearMonth>(() => monthOf(start ?? initialMonthOf));

  const title = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(shown.year, shown.month - 1, 1)),
  );
  const weekdays = Array.from({ length: 7 }, (_, i) =>
    new Intl.DateTimeFormat(locale, { weekday: "short", timeZone: "UTC" }).format(
      new Date(REFERENCE_SUNDAY + ((i + weekStart) % 7) * DAY_MS),
    ),
  );
  const weeks = monthGrid(shown, weekStart);

  return (
    <View testID={testID} style={styles.root}>
      <View style={styles.header}>
        <IconButton
          filled={false}
          accessibilityLabel={t("form.a11y.prevMonth")}
          onPress={() => setShown(shiftMonth(shown, -1))}
          testID={`${testID}-prev`}
        >
          <Icon name="back" />
        </IconButton>
        <AppText variant="cardTitle" accessibilityRole="header">
          {title}
        </AppText>
        <IconButton
          filled={false}
          accessibilityLabel={t("form.a11y.nextMonth")}
          onPress={() => setShown(shiftMonth(shown, 1))}
          testID={`${testID}-next`}
        >
          <Icon name="forward" />
        </IconButton>
      </View>
      <View style={styles.week}>
        {weekdays.map((name, i) => (
          <View key={i} style={styles.cell}>
            <AppText variant="small" color="textSecondary">
              {name}
            </AppText>
          </View>
        ))}
      </View>
      {weeks.map((week, weekIndex) => (
        <View key={weekIndex} style={styles.week}>
          {week.map((day, dayIndex) => {
            if (day === null) return <View key={dayIndex} style={styles.cell} />;
            const isStart = day === start;
            const isEnd = day === end;
            const inside =
              start !== null &&
              end !== null &&
              compareCalendarDates(day, start) > 0 &&
              compareCalendarDates(day, end) < 0;
            const selected = isStart || isEnd;
            return (
              <Pressable
                key={dayIndex}
                accessibilityRole="button"
                accessibilityLabel={formatCalendarDate(locale, day)}
                accessibilityState={{ selected: selected || inside }}
                onPress={() => onPick(day)}
                testID={`${testID}-day-${day}`}
                style={[
                  styles.cell,
                  inside && { backgroundColor: tokens.surfaceStrong },
                  selected && { backgroundColor: tokens.accent, borderRadius: radius.field },
                ]}
              >
                <AppText color={selected ? "onAccent" : "text"}>{Number(day.slice(8))}</AppText>
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
});
