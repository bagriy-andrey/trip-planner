import { pickRangeDate } from "@tripplanner/shared";
import type { CalendarDate, PickedRange } from "@tripplanner/shared";
import { useState } from "react";

import { AnimatedSheetOverlay, AppText, PrimaryButton } from "@/components";
import { formatCalendarRange, resolveLocale, useTranslation } from "@/lib/i18n";

import { RangeCalendar } from "./RangeCalendar";

export interface TripDatesSheetProps {
  /** The range currently in the form (or empty); the sheet works on its own copy until "Done". */
  start: CalendarDate | null;
  end: CalendarDate | null;
  /** Month the calendar opens on when no range is chosen yet (usually today). */
  initialMonthOf: CalendarDate;
  onDone: (start: CalendarDate, end: CalendarDate) => void;
  /** Closed by the scrim or a swipe down: nothing changes. */
  onClose: () => void;
  testID: string;
}

/** The trip's "Dates" bottom sheet: pick the first day, then the last; "Done" is live only with both. */
export function TripDatesSheet({ start, end, initialMonthOf, onDone, onClose, testID }: TripDatesSheetProps) {
  const { t, i18n } = useTranslation("trips");
  const { t: tCommon } = useTranslation("common");
  const locale = resolveLocale([i18n.language]);
  const [range, setRange] = useState<PickedRange>({ start, end });
  // Set once the user leaves; the exit animation runs, then `onExited` reports what happened.
  const [exit, setExit] = useState<"close" | "done" | null>(null);

  const complete = range.start !== null && range.end !== null;
  const hint =
    range.start === null
      ? t("form.dates.pickStart")
      : range.end === null
        ? t("form.dates.pickEnd")
        : formatCalendarRange(locale, range.start, range.end);

  const finish = () => {
    if (exit === "done" && range.start !== null && range.end !== null) onDone(range.start, range.end);
    else onClose();
  };
  const pick = (day: CalendarDate) => {
    if (exit === null) setRange((current) => pickRangeDate(current, day));
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
      <RangeCalendar
        start={range.start}
        end={range.end}
        initialMonthOf={initialMonthOf}
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
