import { useRouter } from "expo-router";
import { useEffect } from "react";
import { AccessibilityInfo, ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText, ModalHeader, PrimaryButton, Screen, SecondaryButton } from "@/components";
import { useTranslation } from "@/lib/i18n";
import { layout, radius, spacing, useTheme } from "@/lib/theme";

import { useHotelForm } from "../hooks/useHotelForm";
import type { HotelFormTarget } from "../hooks/useHotelForm";
import type { HotelFormState } from "../hooks/formState";
import { ConfirmOverlay } from "./ConfirmOverlay";
import { CurrencySheet } from "./CurrencySheet";
import { HotelFormFields } from "./HotelFormFields";
import { HotelNotFound } from "./HotelFormStates";

export interface HotelFormBodyProps {
  target: HotelFormTarget;
  initial: HotelFormState;
  /** Name shown in the delete confirmation (edit mode). */
  hotelName?: string;
}

/** S14/S14b composition: header, scrolling fields, the bottom "Сохранить" panel and the two overlays. */
export function HotelFormBody({ target, initial, hotelName }: HotelFormBodyProps) {
  const { t } = useTranslation("hotel");
  const { t: tCommon } = useTranslation("common");
  const { t: tTrips } = useTranslation("trips");
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const form = useHotelForm(target, initial);
  const { guard, del } = form;

  const submitMessage = form.submitError ?? undefined;
  useEffect(() => {
    if (submitMessage) AccessibilityInfo.announceForAccessibility(submitMessage);
  }, [submitMessage]);

  if (form.gone) return <HotelNotFound onBack={() => router.back()} />;

  const overlayOpen = guard.confirmOpen || del.open || form.cost.currencyOpen;
  const deleteError = del.error === null ? null : tTrips(`errors.${del.error}`);

  return (
    <View style={styles.root}>
      <View
        style={styles.root}
        accessibilityElementsHidden={overlayOpen}
        importantForAccessibility={overlayOpen ? "no-hide-descendants" : "auto"}
      >
        <Screen testID="hotel-form-screen" edges={["top", "left", "right"]} contentStyle={styles.content}>
          <ModalHeader
            title={t("form.title")}
            cancelLabel={tCommon("actions.cancel")}
            onCancel={guard.requestClose}
            cancelAsIcon
            hideDone
          />
          <HotelFormFields form={form} />
          {del.canDelete ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("form.delete.link")}
              onPress={del.ask}
              testID="hotel-form-delete"
              style={styles.delete}
            >
              <AppText color="danger">{t("form.delete.link")}</AppText>
            </Pressable>
          ) : null}
        </Screen>
        <View
          style={[
            styles.bottom,
            { backgroundColor: tokens.bg, borderTopColor: tokens.divider, paddingBottom: insets.bottom + spacing.md },
          ]}
        >
          {submitMessage === undefined ? null : (
            <AppText color="danger" accessibilityRole="alert" testID="hotel-form-error">
              {submitMessage}
            </AppText>
          )}
          <PrimaryButton
            label={t("form.save")}
            accessibilityLabel={t("form.save")}
            loading={form.submitting}
            onPress={form.submit}
            testID="hotel-form-save"
          />
        </View>
      </View>

      {form.cost.currencyOpen ? (
        <CurrencySheet
          selected={form.state.costCurrency}
          onSelect={form.cost.selectCurrency}
          onClose={form.cost.closeCurrency}
          testID="hotel-form-currency-sheet"
        />
      ) : null}

      {guard.confirmOpen ? (
        <ConfirmOverlay closeLabel={tCommon("actions.cancel")} onClose={guard.cancelConfirm} testID="hotel-form-unsaved">
          <AppText variant="h2" accessibilityRole="header">
            {t("form.unsaved.title")}
          </AppText>
          <AppText color="textSecondary">{t("form.unsaved.message")}</AppText>
          <PrimaryButton
            label={t("form.unsaved.discard")}
            accessibilityLabel={t("form.unsaved.discard")}
            onPress={guard.confirmDiscard}
            testID="hotel-form-unsaved-discard"
          />
          <SecondaryButton
            label={tCommon("actions.cancel")}
            accessibilityLabel={tCommon("actions.cancel")}
            onPress={guard.cancelConfirm}
            testID="hotel-form-unsaved-cancel"
          />
        </ConfirmOverlay>
      ) : null}

      {del.open ? (
        <ConfirmOverlay closeLabel={tCommon("actions.cancel")} onClose={del.cancel} testID="hotel-form-delete-confirm">
          <AppText variant="h2" accessibilityRole="header">
            {t("form.delete.title")}
          </AppText>
          <AppText color="textSecondary">{t("form.delete.message", { name: hotelName ?? form.state.name })}</AppText>
          {deleteError === null ? null : (
            <AppText color="danger" accessibilityRole="alert" testID="hotel-form-delete-error">
              {deleteError}
            </AppText>
          )}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("form.delete.confirm")}
            accessibilityState={{ busy: del.busy }}
            onPress={del.busy ? undefined : del.confirm}
            testID="hotel-form-delete-confirm-button"
            style={[styles.confirmDelete, { backgroundColor: tokens.surface, borderColor: tokens.danger }]}
          >
            {del.busy ? <ActivityIndicator color={tokens.danger} testID="hotel-form-delete-spinner" /> : null}
            <AppText variant="button" color="danger">
              {t("form.delete.confirm")}
            </AppText>
          </Pressable>
          <SecondaryButton
            label={tCommon("actions.cancel")}
            accessibilityLabel={tCommon("actions.cancel")}
            onPress={del.cancel}
            testID="hotel-form-delete-cancel"
          />
        </ConfirmOverlay>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { gap: spacing.xl, paddingBottom: spacing.xl },
  delete: { minHeight: layout.minTouch, alignItems: "center", justifyContent: "center" },
  bottom: {
    gap: spacing.sm,
    paddingHorizontal: spacing.screenX,
    paddingTop: spacing.md,
    borderTopWidth: layout.borderWidth,
  },
  confirmDelete: {
    minHeight: layout.minTouch,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.pill,
    borderWidth: layout.borderWidth,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
});
