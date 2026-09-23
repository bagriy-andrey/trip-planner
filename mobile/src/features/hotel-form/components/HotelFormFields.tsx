import type { ClockTime, HotelFieldErrorId } from "@tripplanner/shared";
import { StyleSheet, View } from "react-native";

import { TextField } from "@/components";
import { useToday } from "@/lib/clock";
import { useTranslation } from "@/lib/i18n";
import { spacing } from "@/lib/theme";

import type { HotelFormController } from "../hooks/useHotelForm";
import { BreakfastBlock } from "./BreakfastBlock";
import { CityField } from "./CityField";
import { CostField } from "./CostField";
import { GuestsParkingBlock } from "./GuestsParkingBlock";
import { MapsLinkField } from "./MapsLinkField";
import { NightsLine } from "./NightsLine";
import { StayDateTimeRow } from "./StayDateTimeRow";

/** Where the empty time pickers open (AC-13): typical hotel check-in / check-out hours. */
const CHECK_IN_START: ClockTime = "15:00";
const CHECK_OUT_START: ClockTime = "11:00";

/** The fields in the order of AC-8. Holds no logic: everything comes from `useHotelForm`. */
export function HotelFormFields({ form }: { form: HotelFormController }) {
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
        onBlur={form.maps.blur}
        onRemove={form.maps.remove}
        onOpen={form.maps.open}
        errorText={text(errors.mapsUrl)}
        openFailed={form.maps.openFailed}
        testID="hotel-form-maps"
      />
      <StayDateTimeRow
        label={t("form.field.checkIn")}
        date={state.checkInDate}
        time={state.checkInTime}
        onChangeDate={form.checkIn.changeDate}
        onChangeTime={form.checkIn.changeTime}
        startDate={today}
        startTime={CHECK_IN_START}
        errorText={text(errors.checkIn)}
        testID="hotel-form-check-in"
      />
      <StayDateTimeRow
        label={t("form.field.checkOut")}
        date={state.checkOutDate}
        time={state.checkOutTime}
        onChangeDate={form.checkOut.changeDate}
        onChangeTime={form.checkOut.changeTime}
        minimumDate={state.checkInDate ?? undefined}
        startDate={state.checkInDate ?? today}
        startTime={CHECK_OUT_START}
        errorText={text(errors.checkOut)}
        testID="hotel-form-check-out"
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
        onChangeCurrency={form.cost.changeCurrency}
        onSelectCurrency={form.cost.selectCurrency}
        onBlurCurrency={form.cost.blurCurrency}
        suggestions={form.cost.suggestions}
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
