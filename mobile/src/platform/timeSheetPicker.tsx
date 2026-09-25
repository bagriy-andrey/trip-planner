// Time picker that opens from ONE tap on any field. The native iOS compact control cannot be
// opened programmatically (it only reacts to a tap inside its own small pill), so iOS gets an
// in-tree bottom sheet holding the native spinner; Android opens the system dialog. Callers see
// the same `open()` and render `element` once, next to their other overlays (the sheet is an
// `absoluteFill` view, so it must not live inside a ScrollView). Screens see "HH:MM" strings.
import DateTimePicker, { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import type { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { useCallback, useState } from "react";
import type { ReactElement } from "react";
import { Platform, StyleSheet, View } from "react-native";

import { AnimatedSheetOverlay } from "@/components/AnimatedSheetOverlay";
import { AppText } from "@/components/AppText";
import { PrimaryButton } from "@/components/PrimaryButton";
import { SecondaryButton } from "@/components/SecondaryButton";
import { resolveLocale, useTranslation } from "@/lib/i18n";
import { spacing, useTheme } from "@/lib/theme";

export interface TimePickRequest {
  /** Sheet title (already translated), e.g. "Check-in time". */
  title: string;
  /** Current value, or null while empty. */
  value: string | null;
  /** Where the picker opens while `value` is null, "HH:MM". */
  startTime: string;
  /** A 24-hour wheel on every locale (a duration, not a clock time: no AM/PM). */
  hour24?: boolean;
  /** Called only when the user confirms a time (never on cancel / dismiss). */
  onPick: (time: string) => void;
}

export interface TimePickerLabels {
  done: string;
  cancel: string;
  /** Spoken name of the scrim. */
  close: string;
}

export interface TimeSheetPicker {
  open: (request: TimePickRequest) => void;
  /** Render once at screen-body level; null when nothing is shown (always null on Android). */
  element: ReactElement | null;
}

const TEST_ID = "time-sheet";

function toLocalTime(time: string): Date {
  const [hour = 0, minute = 0] = time.split(":").map(Number);
  return new Date(2000, 0, 1, hour, minute);
}

function toTimeOfDay(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function useTimeSheetPicker(labels: TimePickerLabels): TimeSheetPicker {
  const { scheme, tokens } = useTheme();
  const { i18n } = useTranslation();
  const locale = resolveLocale([i18n.language]);
  const [request, setRequest] = useState<TimePickRequest | null>(null);
  const [draft, setDraft] = useState<Date>(() => toLocalTime("12:00"));
  const [closing, setClosing] = useState(false);

  const open = useCallback((next: TimePickRequest) => {
    const initial = toLocalTime(next.value ?? next.startTime);
    if (Platform.OS === "android") {
      DateTimePickerAndroid.open({
        mode: "time",
        value: initial,
        is24Hour: true,
        onChange: (event: DateTimePickerEvent, picked?: Date) => {
          if (event.type === "set" && picked !== undefined) next.onPick(toTimeOfDay(picked));
        },
      });
      return;
    }
    setDraft(initial);
    setClosing(false);
    setRequest(next);
  }, []);

  if (request === null) return { open, element: null };

  const requestClose = () => setClosing(true);
  const confirm = () => {
    request.onPick(toTimeOfDay(draft));
    setClosing(true);
  };

  const element = (
    <AnimatedSheetOverlay
      closeLabel={labels.close}
      onRequestClose={requestClose}
      closing={closing}
      onExited={() => setRequest(null)}
      testID={TEST_ID}
    >
      <AppText variant="h2" accessibilityRole="header">
        {request.title}
      </AppText>
      <View style={styles.wheel}>
        <DateTimePicker
          mode="time"
          display="spinner"
          value={draft}
          onChange={(_event: DateTimePickerEvent, picked?: Date) => {
            if (picked !== undefined) setDraft(picked);
          }}
          locale={request.hour24 === true ? "en-GB" : locale}
          themeVariant={scheme}
          textColor={tokens.text}
          accessibilityLabel={request.title}
          testID={`${TEST_ID}-picker`}
        />
      </View>
      <PrimaryButton label={labels.done} accessibilityLabel={labels.done} onPress={confirm} testID={`${TEST_ID}-done`} />
      <SecondaryButton
        label={labels.cancel}
        accessibilityLabel={labels.cancel}
        onPress={requestClose}
        testID={`${TEST_ID}-cancel`}
      />
    </AnimatedSheetOverlay>
  );
  return { open, element };
}

const styles = StyleSheet.create({
  wheel: { alignItems: "center", paddingVertical: spacing.sm },
});
