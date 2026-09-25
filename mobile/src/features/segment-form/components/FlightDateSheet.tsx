import type { CalendarDate } from "@tripplanner/shared";
import { useState } from "react";

import { AnimatedSheetOverlay, AppText, PrimaryButton } from "@/components";
import { useTranslation } from "@/lib/i18n";

import { DayCalendar } from "./DayCalendar";

export interface FlightDateSheetProps {
  /** The date currently in the form (or none); the sheet works on its own copy until "Done". */
  value: CalendarDate | null;
  /** Earliest selectable day (a new departure: today or the trip start, whichever is later). */
  floor?: CalendarDate;
  /** Month the calendar opens on while nothing is chosen. */
  initialMonthOf: CalendarDate;
  onDone: (date: CalendarDate) => void;
  /** Closed by the scrim or a swipe down: nothing changes. */
  onClose: () => void;
  testID: string;
}

/** The "Departure date" bottom sheet: tap a day, "Done" is live once one is chosen. */
export function FlightDateSheet({ value, floor, initialMonthOf, onDone, onClose, testID }: FlightDateSheetProps) {
  const { t } = useTranslation("transport");
  const { t: tCommon } = useTranslation("common");
  const [day, setDay] = useState<CalendarDate | null>(value);
  // Set once the user leaves; the exit animation runs, then `onExited` reports what happened.
  const [exit, setExit] = useState<"close" | "done" | null>(null);

  const finish = () => {
    if (exit === "done" && day !== null) onDone(day);
    else onClose();
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
        {t("form.dateSheet.title")}
      </AppText>
      <DayCalendar
        value={day}
        initialMonthOf={initialMonthOf}
        floor={floor}
        onPick={(picked) => exit === null && setDay(picked)}
        testID={`${testID}-calendar`}
      />
      <PrimaryButton
        label={tCommon("actions.done")}
        accessibilityLabel={tCommon("actions.done")}
        disabled={day === null}
        onPress={() => setExit((current) => current ?? "done")}
        testID={`${testID}-done`}
      />
    </AnimatedSheetOverlay>
  );
}
