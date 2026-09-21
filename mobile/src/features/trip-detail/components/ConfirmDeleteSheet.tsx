import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";

import { AppText, SecondaryButton } from "@/components";
import { useTranslation } from "@/lib/i18n";
import { layout, radius, spacing, useTheme } from "@/lib/theme";

export interface ConfirmDeleteSheetProps {
  /** What is being deleted: the trip's own title or, without one, its place. */
  name: string;
  /** The request is in flight: the confirm button shows a spinner and ignores presses. */
  busy: boolean;
  /** Failure of the last attempt; the same button retries in one tap (AC-58). */
  errorMessage: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Confirmation of "Delete permanently" (AC-54): plainly says that the trip cannot be restored.
 * Nothing is deleted before the explicit confirm. The confirm control is a `danger` outline with
 * `danger` text — the accent fill is reserved for the safe primary action.
 */
export function ConfirmDeleteSheet({ name, busy, errorMessage, onConfirm, onCancel }: ConfirmDeleteSheetProps) {
  const { t } = useTranslation("tripDetail");
  const { t: tCommon } = useTranslation("common");
  const { tokens } = useTheme();
  return (
    <View testID="confirm-delete-sheet" style={styles.sheet}>
      <AppText variant="h2" accessibilityRole="header">
        {t("deleteConfirm.title")}
      </AppText>
      <AppText color="textSecondary">{t("deleteConfirm.message", { name })}</AppText>
      {errorMessage === null ? null : (
        <AppText color="danger" accessibilityRole="alert" testID="confirm-delete-error">
          {errorMessage}
        </AppText>
      )}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("deleteConfirm.confirm")}
        accessibilityState={{ busy }}
        onPress={busy ? undefined : onConfirm}
        testID="confirm-delete"
        style={[styles.confirm, { backgroundColor: tokens.surface, borderColor: tokens.danger }]}
      >
        {busy ? <ActivityIndicator color={tokens.danger} testID="confirm-delete-spinner" /> : null}
        <AppText variant="button" color="danger" style={styles.label}>
          {t("deleteConfirm.confirm")}
        </AppText>
      </Pressable>
      <SecondaryButton
        label={tCommon("actions.cancel")}
        accessibilityLabel={tCommon("actions.cancel")}
        onPress={onCancel}
        testID="confirm-delete-cancel"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: { gap: spacing.md },
  confirm: {
    minHeight: layout.minTouch,
    minWidth: layout.minTouch,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.pill,
    borderWidth: layout.borderWidth,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  label: { flexShrink: 1, textAlign: "center" },
});
