import { pickRangeDate } from "@tripplanner/shared";
import type { CalendarDate, PickedRange } from "@tripplanner/shared";
import { useState } from "react";

import { AnimatedSheetOverlay, AppText, PrimaryButton } from "@/components";
import { formatCalendarRange, resolveLocale, useTranslation } from "@/lib/i18n";

import { StayRangeCalendar } from "./StayRangeCalendar";

export interface StayDatesSheetProps {
  /** The range currently in the form (or empty); the sheet works on its own copy until "Done". */
  checkInDate: CalendarDate | null;
  checkOutDate: CalendarDate | null;
  /** Month the calendar opens on when nothing is chosen (today). */
  startFallback: CalendarDate;
  /** Earliest selectable day. */
  minDate: CalendarDate;
  /** Same day twice is a day-use stay. */
  onDone: (checkIn: CalendarDate, checkOut: CalendarDate) => void;
  /** Closed by the scrim or a swipe down: nothing changes. */
  onClose: () => void;
  testID: string;
}

/** The "Stay dates" bottom sheet: pick check-in, then check-out; "Done" is live only with both. */
export function StayDatesSheet({ checkInDate, checkOutDate, startFallback, minDate, onDone, onClose, testID }: StayDatesSheetProps) {
  const { t, i18n } = useTranslation("hotel");
  const { t: tCommon } = useTranslation("common");
  const locale = resolveLocale([i18n.language]);
  const [range, setRange] = useState<PickedRange>({ start: checkInDate, end: checkOutDate });
  // Set once the user leaves; the exit animation runs, then `onExited` reports what happened.
  const [exit, setExit] = useState<"close" | "done" | null>(null);

  const complete = range.start !== null && range.end !== null;
  const hint =
    range.start === null
      ? t("form.field.datesPickStart")
      : range.end === null
        ? t("form.field.datesPickEnd")
        : formatCalendarRange(locale, range.start, range.end);

  const finish = () => {
    if (exit === "done" && range.start !== null && range.end !== null) onDone(range.start, range.end);
    else onClose();
  };
  const pick = (day: CalendarDate) => {
    if (exit === null && day >= minDate) setRange((current) => pickRangeDate(current, day));
  };

  return (
    <AnimatedSheetOverlay
      closeLabel={tCommon("actions.cancel")}
      onRequestClose={() => setExit((current) => current ?? "close")}
      closing={exit !== null}
      onExited={finish}
      handle
      swipeToClose
      testID={testID}
    >
      <AppText variant="h2" accessibilityRole="header">
        {t("form.datesSheet.title")}
      </AppText>
      <AppText variant="small" color="textSecondary" testID={`${testID}-hint`}>
        {hint}
      </AppText>
      <StayRangeCalendar
        start={range.start}
        end={range.end}
        initialMonthOf={startFallback}
        minDate={minDate}
        onPick={pick}
        testID={`${testID}-calendar`}
      />
      <PrimaryButton
        label={tCommon("actions.done")}
        accessibilityLabel={tCommon("actions.done")}
        disabled={!complete}
        onPress={() => setExit((current) => current ?? "done")}
        testID={`${testID}-done`}
      />
    </AnimatedSheetOverlay>
  );
}
