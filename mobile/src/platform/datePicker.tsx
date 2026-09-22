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

/**
 * A wall-clock time, zone-free: "HH:MM", 24-hour, zero-padded (e.g. "07:05", "23:40"). Paired
 * with an IANA zone elsewhere (`shared/src/segments/time.ts`, SPEC-04) to become an instant;
 * this module never does that conversion itself.
 */
export type TimeOfDay = string;

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

export interface TimePickerProps {
  /** The chosen time, or `null` while none is chosen. */
  value: TimeOfDay | null;
  /** Called with the picked time; never with a `Date` or a zone. */
  onChange: (time: TimeOfDay) => void;
  /** Spoken name of the control (already translated by the caller). Required. */
  accessibilityLabel: string;
  /**
   * Text shown on Android while `value` is `null` (already translated). iOS's compact control
   * has no empty state and shows midnight instead, so a form that needs a visible "nothing
   * chosen yet" renders its own placeholder and mounts the picker once a time exists.
   */
  placeholder?: string;
  testID?: string;
}

/** Shown while `value` is `null`. Midnight, not the current time: a picker default must stay
 * deterministic and clock-free (only `src/lib/clock/**` is allowed to read the clock). */
const MIDNIGHT: TimeOfDay = "00:00";

/** "HH:MM" -> a `Date` with those local hour/minute fields, day fixed far from any DST jump. */
function toLocalTime(time: TimeOfDay): Date {
  const [hour = 0, minute = 0] = time.split(":").map(Number);
  return new Date(2000, 0, 1, hour, minute);
}

/** A `Date`'s local hour/minute fields -> "HH:MM", zero-padded. */
function toTimeOfDay(date: Date): TimeOfDay {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * Neutral time-picker surface, same module and pattern as `DatePicker` above (same library,
 * `mode="time"`; SPEC-04 AC-96 — no new native dependency, so no dev-client rebuild). Screens
 * see `"HH:MM"` strings, never `Date` objects or a zone.
 */
export function TimePicker({ value, onChange, accessibilityLabel, placeholder, testID }: TimePickerProps) {
  const { tokens, scheme } = useTheme();
  const { i18n } = useTranslation();
  const locale = resolveLocale([i18n.language]);

  const shown = toLocalTime(value ?? MIDNIGHT);
  const label = new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit" }).format(shown);

  const handleChange = (event: DateTimePickerEvent, picked?: Date) => {
    // "dismissed" (Android cancel) and "neutralButtonPressed" carry no new time.
    if (event.type !== "set" || picked === undefined) return;
    onChange(toTimeOfDay(picked));
  };

  if (Platform.OS === "android") {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        testID={testID}
        onPress={() =>
          DateTimePickerAndroid.open({
            mode: "time",
            value: shown,
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
          {value === null ? (placeholder ?? "") : label}
        </Text>
      </Pressable>
    );
  }

  return (
    <DateTimePicker
      mode="time"
      display="compact"
      value={shown}
      onChange={handleChange}
      locale={locale}
      themeVariant={scheme}
      accentColor={tokens.accent}
      accessibilityLabel={accessibilityLabel}
      testID={testID}
    />
  );
}
