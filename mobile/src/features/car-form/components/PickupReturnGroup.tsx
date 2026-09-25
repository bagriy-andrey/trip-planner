import { isClockTime } from "@tripplanner/shared";
import type { ClockTime } from "@tripplanner/shared";
import { StyleSheet, View } from "react-native";

import { TextField } from "@/components";
import { useTranslation } from "@/lib/i18n";
import { spacing } from "@/lib/theme";
import type { TimeSheetPicker } from "@/platform/timeSheetPicker";

import type { CarFormController } from "../hooks/useCarForm";
import { RentalDatesField } from "./RentalDatesField";
import { RentalTimeField } from "./RentalTimeField";
import { ReturnAfterFlightBanner } from "./ReturnAfterFlightBanner";
import { SwitchRow } from "./SwitchRow";
import { useErrorText } from "./useErrorText";

/** Where the time sheet opens while a field is EMPTY (it stays empty until confirmed): typical rental hour (AC-20). */
const START_TIME: ClockTime = "11:00";

/** "Pick-up and return": place, dates, the two times, the flight warning and the return place. */
export function PickupReturnGroup({
  form,
  timePicker,
  onOpenDates,
}: {
  form: CarFormController;
  timePicker: TimeSheetPicker;
  onOpenDates: () => void;
}) {
  const { t } = useTranslation("car");
  const text = useErrorText();
  const { state, errors, flightWarning } = form;
  const openTime = (which: "pickupTime" | "returnTime", title: string) =>
    timePicker.open({
      title,
      value: state[which],
      startTime: START_TIME,
      onPick: (picked) => isClockTime(picked) && form.changeTime(which, picked),
    });
  const datesErrors = errors.dates.map((id) => t(`form.validation.${id}`));

  return (
    <>
      <TextField
        label={t("form.field.pickupPlace")}
        value={state.pickupPlace}
        onChangeText={(pickupPlace) => form.apply({ pickupPlace })}
        onBlur={() => form.touch("pickupPlace")}
        errorText={text(errors.pickupPlace)}
        testID="car-form-pickup-place"
      />
      <RentalDatesField
        start={state.pickupDate}
        end={state.returnDate}
        onOpen={onOpenDates}
        errorTexts={datesErrors}
        testID="car-form-dates"
      />
      <View style={styles.times}>
        <RentalTimeField
          label={t("form.field.pickupTime")}
          time={state.pickupTime}
          onOpen={() => openTime("pickupTime", t("form.field.pickupTime"))}
          errorText={text(errors.pickupTime)}
          testID="car-form-pickup-time"
        />
        <RentalTimeField
          label={t("form.field.returnTime")}
          time={state.returnTime}
          onOpen={() => openTime("returnTime", t("form.field.returnTime"))}
          errorText={text(errors.returnTime ?? errors.returnOrder)}
          testID="car-form-return-time"
        />
      </View>
      {flightWarning === null ? null : (
        <ReturnAfterFlightBanner {...flightWarning} testID="car-form-flight-warning" />
      )}
      <SwitchRow
        label={t("form.field.returnSamePlace")}
        value={state.returnSamePlace}
        onChange={(returnSamePlace) => form.apply({ returnSamePlace })}
        testID="car-form-same-place"
      />
      {state.returnSamePlace ? null : (
        <TextField
          label={t("form.field.returnPlace")}
          value={state.returnPlace}
          onChangeText={(returnPlace) => form.apply({ returnPlace })}
          onBlur={() => form.touch("returnPlace")}
          errorText={text(errors.returnPlace)}
          multiline
          testID="car-form-return-place"
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  times: { flexDirection: "row", gap: spacing.gap, alignItems: "flex-start" },
});
