// Neutral date-picker surface: the ONLY module that imports the native date-picker library
// (SPEC-03 AC-77, AC-78). Screens see calendar dates ("YYYY-MM-DD"), never `Date` objects, and
// tests replace the whole library with one mock in `jest.setup.ts`.
//
// iOS renders the library's compact inline control. The library's Android component is not
// usable that way: mounted declaratively it opens the system dialog immediately and renders
// nothing, so a form that always shows its date buttons would pop a dialog on mount. Android
// therefore gets a themed trigger that opens the imperative dialog on press. That fork is legal
// here (this is `src/platform/`) and invisible to callers: same props, same 44pt target.
import DateTimePicker, { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import type { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { toCalendarDate } from "@tripplanner/shared";
import type { CalendarDate } from "@tripplanner/shared";
import { Platform, Pressable, StyleSheet, Text } from "react-native";

import { formatCalendarDate, resolveLocale, useTranslation } from "@/lib/i18n";
import { useToday } from "@/lib/clock";
import { layout, radius, spacing, typography, useTheme } from "@/lib/theme";

export interface DatePickerProps {
  /** The chosen calendar date, or `null` while none is chosen. */
  value: CalendarDate | null;
  /** Called with the picked day; never with a time or a zone. */
  onChange: (date: CalendarDate) => void;
  /** Earliest selectable day (inclusive). */
  minimumDate?: CalendarDate;
  /** Latest selectable day (inclusive). */
  maximumDate?: CalendarDate;
  /** Spoken name of the control (already translated by the caller). Required. */
  accessibilityLabel: string;
  /**
   * Text shown on Android while `value` is `null` (already translated). iOS's compact control
   * has no empty state and shows the starting day instead, so a form that needs a visible
   * "nothing chosen yet" renders its own placeholder and mounts the picker once a date exists.
   */
  placeholder?: string;
  testID?: string;
}

/** Hour the picker's `Date` is pinned to, far from any midnight DST jump. */
const NOON = 12;

/**
 * "YYYY-MM-DD" -> a `Date` at local noon of that day. Local fields, so that reading them back
 * with `toCalendarDate` returns the same day in every time zone (a `Date.UTC` midnight would
 * show the previous day west of Greenwich). `setFullYear` avoids the 0-99 => 1900s mapping.
 */
function toLocalNoon(date: CalendarDate): Date {
  const [year = 1970, month = 1, day = 1] = date.split("-").map(Number);
  const result = new Date(2000, 0, 1, NOON);
  result.setFullYear(year, month - 1, day);
  return result;
}

export function DatePicker({
  value,
  onChange,
  minimumDate,
  maximumDate,
  accessibilityLabel,
  placeholder,
  testID,
}: DatePickerProps) {
  const { tokens, scheme } = useTheme();
  const { i18n } = useTranslation();
  const locale = resolveLocale([i18n.language]);
  const today = useToday();

  const minimum = minimumDate === undefined ? undefined : toLocalNoon(minimumDate);
  const maximum = maximumDate === undefined ? undefined : toLocalNoon(maximumDate);
  const shown = toLocalNoon(value ?? today);

  const handleChange = (event: DateTimePickerEvent, picked?: Date) => {
    // "dismissed" (Android cancel) and "neutralButtonPressed" carry no new date.
    if (event.type !== "set" || picked === undefined) return;
    onChange(toCalendarDate(picked));
  };

  if (Platform.OS === "android") {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        testID={testID}
        onPress={() =>
          DateTimePickerAndroid.open({
            mode: "date",
            value: shown,
            minimumDate: minimum,
            maximumDate: maximum,
            onChange: handleChange,
          })
        }
        style={[
          styles.trigger,
          { borderColor: tokens.surfaceBorder, backgroundColor: tokens.surface },
        ]}
      >
        <Text
          style={[
            typography.body,
            { color: value === null ? tokens.textSecondary : tokens.text },
          ]}
        >
          {value === null ? (placeholder ?? "") : formatCalendarDate(locale, value)}
        </Text>
      </Pressable>
    );
  }

  return (
    <DateTimePicker
      mode="date"
      display="compact"
      value={shown}
      minimumDate={minimum}
      maximumDate={maximum}
      onChange={handleChange}
      locale={locale}
      themeVariant={scheme}
      accentColor={tokens.accent}
      accessibilityLabel={accessibilityLabel}
      testID={testID}
    />
  );
}

const styles = StyleSheet.create({
  trigger: {
    minHeight: layout.minTouch,
    minWidth: layout.minTouch,
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    borderRadius: radius.field,
    borderWidth: layout.borderWidth,
  },
});
