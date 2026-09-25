import { CAR_FUEL_POLICY, CAR_INSURANCE } from "@tripplanner/shared";
import type { CarFuelPolicy, CarInsurance } from "@tripplanner/shared";
import { StyleSheet, View } from "react-native";

import { AppText, SegmentedControl, TextField } from "@/components";
import { useTranslation } from "@/lib/i18n";
import { spacing } from "@/lib/theme";

import type { CarFormController } from "../hooks/useCarForm";
import { useErrorText } from "./useErrorText";

/** "Car and terms": class, insurance and fuel (segments; a second tap on the chosen one clears it). */
export function CarTermsGroup({ form }: { form: CarFormController }) {
  const { t } = useTranslation("car");
  const text = useErrorText();
  const { state, errors } = form;
  const insuranceOptions = CAR_INSURANCE.map((value) => ({ value, label: t(`form.insurance.${value}`) }));
  const fuelOptions = CAR_FUEL_POLICY.map((value) => ({ value, label: t(`form.fuel.${value}`) }));
  return (
    <>
      <TextField
        label={t("form.field.carClass")}
        placeholder={t("form.field.carClassPlaceholder")}
        value={state.carClass}
        onChangeText={(carClass) => form.apply({ carClass })}
        onBlur={() => form.touch("carClass")}
        errorText={text(errors.carClass)}
        testID="car-form-class"
      />
      <View style={styles.block}>
        <AppText variant="small" color="textSecondary">
          {t("form.field.insurance")}
        </AppText>
        <SegmentedControl<CarInsurance>
          allowDeselect
          label={t("form.a11y.insuranceGroup")}
          options={insuranceOptions}
          value={state.insurance}
          onChange={(insurance) => form.apply({ insurance })}
          testID="car-form-insurance"
        />
      </View>
      <View style={styles.block}>
        <AppText variant="small" color="textSecondary">
          {t("form.field.fuel")}
        </AppText>
        <SegmentedControl<CarFuelPolicy>
          allowDeselect
          label={t("form.a11y.fuelGroup")}
          options={fuelOptions}
          value={state.fuelPolicy}
          onChange={(fuelPolicy) => form.apply({ fuelPolicy })}
          testID="car-form-fuel"
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  block: { gap: spacing.xs },
});
