import { isClockTime } from "@tripplanner/shared";
import type { ClockTime, HotelFieldErrorId } from "@tripplanner/shared";
import { StyleSheet, View } from "react-native";

import { MapsLinkField, TextField } from "@/components";
import { useToday } from "@/lib/clock";
import { useTranslation } from "@/lib/i18n";
import { spacing } from "@/lib/theme";

import type { TimeSheetPicker } from "@/platform/timeSheetPicker";

import type { HotelFormController } from "../hooks/useHotelForm";
import { BreakfastBlock } from "./BreakfastBlock";
import { CityField } from "./CityField";
import { CostField } from "./CostField";
import { GuestsParkingBlock } from "./GuestsParkingBlock";
import { NightsLine } from "./NightsLine";
import { StayDatesField } from "./StayDatesField";
import { StayTimeField } from "./StayTimeField";

/** Where the time sheet opens while a field is EMPTY (it stays empty until the user confirms): typical hotel check-in / check-out hours. */
const CHECK_IN_START: ClockTime = "15:00";
const CHECK_OUT_START: ClockTime = "11:00";

/** The fields in the order of AC-8. Holds no logic: everything comes from `useHotelForm`. */
export function HotelFormFields({ form, timePicker }: { form: HotelFormController; timePicker: TimeSheetPicker }) {
  const { t } = useTranslation("hotel");
  const today = useToday();
  const { state, errors } = form;
  const text = (id: HotelFieldErrorId | undefined) => (id === undefined ? undefined : t(`form.validation.${id}`));

  return (
    <View style={styles.fields}>
      <TextField
        label={t("form.field.name")}
        value={state.name}
        onChangeText={form.name.change}
        onBlur={form.name.blur}
        errorText={text(errors.name)}
        testID="hotel-form-name"
      />
      <CityField
        label={t("form.field.city")}
        placeholder={t("form.field.cityPlaceholder")}
        value={state.cityText}
        onChangeText={form.city.change}
        onBlur={form.city.blur}
        suggestions={form.city.suggestions}
        lang={form.lang}
        onSelect={form.city.select}
        errorText={text(errors.city)}
        testID="hotel-form-city"
      />
      <TextField
        label={t("form.field.address")}
        value={state.address}
        onChangeText={form.address.change}
        onBlur={form.address.blur}
        errorText={text(errors.address)}
        multiline
        testID="hotel-form-address"
      />
      <MapsLinkField
        acceptedUrl={state.mapsUrl}
        text={state.mapsUrlText}
        onChangeText={form.maps.changeText}
        labels={{
          field: t("form.field.mapsUrl"),
          placeholder: t("form.field.mapsUrlPlaceholder"),
          added: t("form.mapsLink.added"),
          source: t("form.mapsLink.source"),
          open: t("form.mapsLink.open"),
          remove: t("form.mapsLink.remove"),
          openFailed: t("form.mapsLink.openFailed"),
        }}
        onBlur={form.maps.blur}
        onRemove={form.maps.remove}
        onOpen={form.maps.open}
        errorText={text(errors.mapsUrl)}
        openFailed={form.maps.openFailed}
        testID="hotel-form-maps"
      />
      <StayDatesField
        checkInDate={state.checkInDate}
        checkOutDate={state.checkOutDate}
        onChangeRange={form.changeRange}
        startFallback={today}
        minDate={form.dateFloor}
        errorTexts={errors.dates.map((id) => t(`form.validation.${id}`))}
        testID="hotel-form-dates"
      />
      <StayTimeField
        label={t("form.field.checkInTime")}
        time={state.checkInTime}
        onOpen={() =>
          timePicker.open({
            title: t("form.field.checkInTime"),
            value: state.checkInTime,
            startTime: CHECK_IN_START,
            onPick: (picked) => isClockTime(picked) && form.changeCheckInTime(picked),
          })
        }
        onClear={() => form.changeCheckInTime(null)}
        testID="hotel-form-check-in-time"
      />
      <StayTimeField
        label={t("form.field.checkOutTime")}
        time={state.checkOutTime}
        onOpen={() =>
          timePicker.open({
            title: t("form.field.checkOutTime"),
            value: state.checkOutTime,
            startTime: CHECK_OUT_START,
            onPick: (picked) => isClockTime(picked) && form.changeCheckOutTime(picked),
          })
        }
        onClear={() => form.changeCheckOutTime(null)}
        errorText={text(errors.checkOutTime)}
        testID="hotel-form-check-out-time"
      />
      <NightsLine nights={form.nights} testID="hotel-form-nights" />
      <GuestsParkingBlock
        guests={state.guests}
        parking={state.parking}
        onStepGuests={form.stepGuests}
        onChangeParking={form.changeParking}
        testID="hotel-form-stay"
      />
      <BreakfastBlock
        value={state.breakfast}
        days={state.breakfastDays}
        range={form.breakfastRange}
        onChange={form.changeBreakfast}
        onStepDays={form.stepBreakfastDays}
        testID="hotel-form-breakfast"
      />
      <CostField
        amount={state.costAmount}
        currency={state.costCurrency}
        onChangeAmount={form.cost.changeAmount}
        onBlurAmount={form.cost.blurAmount}
        onOpenCurrency={form.cost.openCurrency}
        currencyPlaceholder={form.cost.currencyPlaceholder}
        amountError={text(errors.costAmount)}
        currencyError={text(errors.costCurrency)}
        testID="hotel-form-cost"
      />
      <TextField
        label={t("form.field.bookingRef")}
        value={state.bookingRef}
        onChangeText={form.bookingRef.change}
        onBlur={form.bookingRef.blur}
        errorText={text(errors.bookingRef)}
        mono
        autoCapitalize="characters"
        autoCorrect={false}
        testID="hotel-form-booking-ref"
      />
      <TextField
        label={t("form.field.notes")}
        value={state.notes}
        onChangeText={form.notes.change}
        onBlur={form.notes.blur}
        errorText={text(errors.notes)}
        multiline
        testID="hotel-form-notes"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fields: { gap: spacing.block },
});
