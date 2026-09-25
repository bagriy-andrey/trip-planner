import { isCurrencyCode } from "@tripplanner/shared";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { AccessibilityInfo, StyleSheet, View } from "react-native";

import { AppText, CurrencyPickerSheet, DismissKeyboardView, ModalHeader, PrimaryButton, Screen, SecondaryButton } from "@/components";
import { useTranslation } from "@/lib/i18n";
import { spacing } from "@/lib/theme";
import { useTimeSheetPicker } from "@/platform/timeSheetPicker";

import { useCarForm } from "../hooks/useCarForm";
import type { CarFormTarget } from "../hooks/useCarForm";
import type { CarFormState } from "../hooks/formState";

import { CarFormFields } from "./CarFormFields";
import { CarFormNotFound } from "./CarFormStates";
import { CarFormOverlays } from "./CarFormOverlays";
import { RentalDatesSheet } from "./RentalDatesSheet";

export interface CarFormBodyProps {
  target: CarFormTarget;
  initial: CarFormState;
  /** Name shown in the delete confirmation (edit mode). */
  carName?: string;
}

/** S16/S16b composition: header, scrolling fields, the bottom "Save" panel and every overlay (outside the ScrollView). */
export function CarFormBody({ target, initial, carName }: CarFormBodyProps) {
  const { t } = useTranslation("car");
  const { t: tCommon } = useTranslation("common");
  const router = useRouter();
  const form = useCarForm(target, initial);
  const [datesOpen, setDatesOpen] = useState(false);
  const { guard, del } = form;
  const timePicker = useTimeSheetPicker({
    done: tCommon("actions.done"),
    cancel: tCommon("actions.cancel"),
    close: t("form.a11y.timeClose"),
  });

  const submitMessage = form.submitError ?? undefined;
  useEffect(() => {
    if (submitMessage) AccessibilityInfo.announceForAccessibility(submitMessage);
  }, [submitMessage]);

  if (form.gone) return <CarFormNotFound onBack={() => router.back()} />;

  const overlayOpen = guard.confirmOpen || del.open || form.currency.open || datesOpen || timePicker.element !== null;

  return (
    <DismissKeyboardView style={styles.root} testID="car-form-root">
      <View
        style={styles.root}
        accessibilityElementsHidden={overlayOpen}
        importantForAccessibility={overlayOpen ? "no-hide-descendants" : "auto"}
      >
        <Screen testID="car-form-screen" edges={["top", "left", "right"]} contentStyle={styles.content}>
          <ModalHeader
            title={t("form.title")}
            cancelLabel={tCommon("actions.cancel")}
            hideCancel
            hideDone
          />
          <CarFormFields form={form} timePicker={timePicker} initial={initial} onOpenDates={() => setDatesOpen(true)} />
          {submitMessage === undefined ? null : (
            <AppText color="danger" accessibilityRole="alert" testID="car-form-error">
              {submitMessage}
            </AppText>
          )}
          <PrimaryButton
            label={t("form.save")}
            accessibilityLabel={t("form.save")}
            loading={form.submitting}
            onPress={form.submit}
            testID="car-form-save"
          />
          <SecondaryButton
            label={tCommon("actions.cancel")}
            accessibilityLabel={tCommon("actions.cancel")}
            onPress={guard.requestClose}
            testID="car-form-cancel"
          />
          {del.canDelete ? (
            <SecondaryButton
              tone="danger"
              label={t("form.delete.link")}
              accessibilityLabel={t("form.delete.link")}
              onPress={del.ask}
              testID="car-form-delete"
            />
          ) : null}
        </Screen>
      </View>

      {form.currency.open ? (
        <CurrencyPickerSheet
          title={t("form.field.currency")}
          selected={isCurrencyCode(form.state.costCurrency) ? form.state.costCurrency : null}
          required={form.state.costAmount !== "" || form.state.depositAmount !== ""}
          onSelect={form.currency.select}
          onClose={form.currency.close}
          testID="car-form-currency-sheet"
        />
      ) : null}
      {timePicker.element}
      {datesOpen ? (
        <RentalDatesSheet
          start={form.state.pickupDate}
          end={form.state.returnDate}
          floor={form.dateFloor}
          onDone={(start, end) => {
            form.changeRange(start, end);
            setDatesOpen(false);
          }}
          onClose={() => setDatesOpen(false)}
          testID="car-form-dates-sheet"
        />
      ) : null}
      <CarFormOverlays form={form} carName={carName ?? form.state.company} />
    </DismissKeyboardView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { gap: spacing.xl, paddingBottom: spacing.xl },
});
