import { ActivityIndicator, Pressable, StyleSheet } from "react-native";

import { AppText, ConfirmOverlay, PrimaryButton, SecondaryButton } from "@/components";
import { useTranslation } from "@/lib/i18n";
import { layout, radius, spacing, useTheme } from "@/lib/theme";

import type { CarFormController } from "../hooks/useCarForm";

/** "Close without saving?" and the delete confirmation: in-tree bottom overlays, never a system `Alert`. */
export function CarFormOverlays({ form, carName }: { form: CarFormController; carName: string }) {
  const { t } = useTranslation("car");
  const { t: tCommon } = useTranslation("common");
  const { t: tTrips } = useTranslation("trips");
  const { tokens } = useTheme();
  const { guard, del } = form;
  const deleteError = del.error === null ? null : tTrips(`errors.${del.error}`);
  const cancel = tCommon("actions.cancel");

  return (
    <>
      {guard.confirmOpen ? (
        <ConfirmOverlay closeLabel={cancel} onClose={guard.cancelConfirm} testID="car-form-unsaved">
          <AppText variant="h2" accessibilityRole="header">
            {t("form.unsaved.title")}
          </AppText>
          <AppText color="textSecondary">{t("form.unsaved.message")}</AppText>
          <PrimaryButton
            label={t("form.unsaved.discard")}
            accessibilityLabel={t("form.unsaved.discard")}
            onPress={guard.confirmDiscard}
            testID="car-form-unsaved-discard"
          />
          <SecondaryButton label={cancel} accessibilityLabel={cancel} onPress={guard.cancelConfirm} testID="car-form-unsaved-cancel" />
        </ConfirmOverlay>
      ) : null}

      {del.open ? (
        <ConfirmOverlay closeLabel={cancel} onClose={del.cancel} testID="car-form-delete-confirm">
          <AppText variant="h2" accessibilityRole="header">
            {t("form.delete.title")}
          </AppText>
          <AppText color="textSecondary">{t("form.delete.message", { name: carName })}</AppText>
          {deleteError === null ? null : (
            <AppText color="danger" accessibilityRole="alert" testID="car-form-delete-error">
              {deleteError}
            </AppText>
          )}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("form.delete.confirm")}
            accessibilityState={{ busy: del.busy }}
            onPress={del.busy ? undefined : del.confirm}
            testID="car-form-delete-confirm-button"
            style={[styles.confirmDelete, { backgroundColor: tokens.surface, borderColor: tokens.danger }]}
          >
            {del.busy ? <ActivityIndicator color={tokens.danger} testID="car-form-delete-spinner" /> : null}
            <AppText variant="button" color="danger">
              {t("form.delete.confirm")}
            </AppText>
          </Pressable>
          <SecondaryButton label={cancel} accessibilityLabel={cancel} onPress={del.cancel} testID="car-form-delete-cancel" />
        </ConfirmOverlay>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
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
