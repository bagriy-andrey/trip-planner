import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { AppText, TextField } from "@/components";
import { useTranslation } from "@/lib/i18n";
import { spacing } from "@/lib/theme";
import type { TimeSheetPicker } from "@/platform/timeSheetPicker";

import { moreInitiallyOpen } from "../hooks/formState";
import type { CarFormState } from "../hooks/formState";
import type { CarFormController } from "../hooks/useCarForm";
import { CarTermsGroup } from "./CarTermsGroup";
import { MoreSection } from "./MoreSection";
import { OfficeGroup } from "./OfficeGroup";
import { PaymentGroup } from "./PaymentGroup";
import { PickupReturnGroup } from "./PickupReturnGroup";
import { useErrorText } from "./useErrorText";

export interface CarFormFieldsProps {
  form: CarFormController;
  timePicker: TimeSheetPicker;
  /** The form as opened: decides whether "More" starts expanded (AC-14). */
  initial: CarFormState;
  onOpenDates: () => void;
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.group}>
      <AppText variant="h2" accessibilityRole="header">
        {title}
      </AppText>
      {children}
    </View>
  );
}

/** The fields in the order of AC-9. Holds no logic: everything comes from `useCarForm`. */
export function CarFormFields({ form, timePicker, initial, onOpenDates }: CarFormFieldsProps) {
  const { t } = useTranslation("car");
  const text = useErrorText();
  const { state, errors } = form;

  return (
    <View style={styles.fields}>
      <TextField
        label={t("form.field.bookingRef")}
        value={state.bookingRef}
        onChangeText={(bookingRef) => form.apply({ bookingRef })}
        onBlur={() => form.touch("bookingRef")}
        errorText={text(errors.bookingRef)}
        mono
        autoCapitalize="characters"
        autoCorrect={false}
        testID="car-form-booking-ref"
      />
      <TextField
        label={t("form.field.company")}
        placeholder={t("form.field.companyPlaceholder")}
        value={state.company}
        onChangeText={(company) => form.apply({ company })}
        onBlur={() => form.touch("company")}
        errorText={text(errors.company)}
        testID="car-form-company"
      />
      <Group title={t("form.groups.pickupReturn")}>
        <PickupReturnGroup form={form} timePicker={timePicker} onOpenDates={onOpenDates} />
      </Group>
      <Group title={t("form.groups.office")}>
        <OfficeGroup form={form} />
      </Group>
      <Group title={t("form.groups.carTerms")}>
        <CarTermsGroup form={form} />
      </Group>
      <Group title={t("form.groups.payment")}>
        <PaymentGroup form={form} />
      </Group>
      <MoreSection form={form} initialOpen={moreInitiallyOpen(initial)} />
    </View>
  );
}

const styles = StyleSheet.create({
  fields: { gap: spacing.block },
  group: { gap: spacing.lg },
});
