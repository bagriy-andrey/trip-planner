import { HOTEL_GUESTS_MAX, HOTEL_GUESTS_MIN, HOTEL_PARKING } from "@tripplanner/shared";
import type { HotelParking } from "@tripplanner/shared";
import { StyleSheet, View } from "react-native";

import { AppText, SegmentedControl, Stepper } from "@/components";
import { useTranslation } from "@/lib/i18n";
import { spacing } from "@/lib/theme";

export interface GuestsParkingBlockProps {
  guests: number;
  parking: HotelParking;
  onStepGuests: (delta: number) => void;
  onChangeParking: (value: HotelParking) => void;
  testID: string;
}

/** "Гости" stepper (plain body face, not mono) and "Парковка" segments (Нет / Бесплатно / Платно). */
export function GuestsParkingBlock({ guests, parking, onStepGuests, onChangeParking, testID }: GuestsParkingBlockProps) {
  const { t } = useTranslation("hotel");
  return (
    <View testID={testID} style={styles.block}>
      <View style={styles.group}>
        <AppText variant="small" color="textSecondary">
          {t("form.field.guests")}
        </AppText>
        <Stepper
          value={guests}
          min={HOTEL_GUESTS_MIN}
          max={HOTEL_GUESTS_MAX}
          mono={false}
          accessibilityLabel={t("form.field.guests")}
          decrementAccessibilityLabel={t("form.a11y.decreaseGuests")}
          incrementAccessibilityLabel={t("form.a11y.increaseGuests")}
          onDecrement={() => onStepGuests(-1)}
          onIncrement={() => onStepGuests(1)}
          testID={`${testID}-guests`}
        />
      </View>
      <View style={styles.group}>
        <AppText variant="small" color="textSecondary">
          {t("form.field.parking")}
        </AppText>
        <SegmentedControl
          label={t("form.a11y.parkingGroup")}
          options={HOTEL_PARKING.map((option) => ({ value: option, label: t(`form.parking.${option}`) }))}
          value={parking}
          onChange={onChangeParking}
          testID={`${testID}-parking`}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: spacing.block },
  group: { gap: spacing.xs },
});
