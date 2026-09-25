import { pickRangeDate } from "@tripplanner/shared";
import type { CalendarDate, PickedRange } from "@tripplanner/shared";
import { useState } from "react";

import { AnimatedSheetOverlay, AppText, PrimaryButton } from "@/components";
import { formatRentalRange } from "@/features/cars";
import { useToday } from "@/lib/clock";
import { useTranslation } from "@/lib/i18n";

import { RentalCalendar } from "./RentalCalendar";

export interface RentalDatesSheetProps {
  /** The range currently in the form (or empty); the sheet works on its own copy until "Done". */
  start: CalendarDate | null;
  end: CalendarDate | null;
  /** Earliest selectable day (AC-19). */
  floor: CalendarDate;
  onDone: (start: CalendarDate, end: CalendarDate) => void;
  /** Closed by the scrim or a swipe down: nothing changes. */
  onClose: () => void;
  testID: string;
}

/** The "Rental dates" bottom sheet (AC-16..AC-18): pick start, then end; "Done" is live only with both. */
export function RentalDatesSheet({ start, end, floor, onDone, onClose, testID }: RentalDatesSheetProps) {
  const { t } = useTranslation("car");
  const today = useToday();
  const [range, setRange] = useState<PickedRange>({ start, end });
  // Set once the user leaves; the exit animation runs, then `onExited` reports what happened.
  const [exit, setExit] = useState<"close" | "done" | null>(null);

  const complete = range.start !== null && range.end !== null;
  const hint =
    range.start === null
      ? t("form.datesSheet.pickStart")
      : range.end === null
        ? t("form.datesSheet.pickEnd")
        : formatRentalRange(t, range.start, range.end);

  const finish = () => {
    if (exit === "done" && range.start !== null && range.end !== null) onDone(range.start, range.end);
    else onClose();
  };
  const pick = (day: CalendarDate) => {
    if (exit === null && day >= floor) setRange((current) => pickRangeDate(current, day));
  };

  return (
    <AnimatedSheetOverlay
      closeLabel={t("form.datesSheet.close")}
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
      <RentalCalendar
        start={range.start}
        end={range.end}
        initialMonthOf={today}
        floor={floor}
        onPick={pick}
        testID={`${testID}-calendar`}
      />
      <PrimaryButton
        label={t("form.datesSheet.done")}
        accessibilityLabel={t("form.datesSheet.done")}
        disabled={!complete}
        onPress={() => setExit((current) => current ?? "done")}
        testID={`${testID}-done`}
      />
    </AnimatedSheetOverlay>
  );
}
