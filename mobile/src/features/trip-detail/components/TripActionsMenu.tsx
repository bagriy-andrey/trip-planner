import { ActivityIndicator, StyleSheet, View } from "react-native";

import { AppText, PrimaryButton, SecondaryButton } from "@/components";
import { useTranslation } from "@/lib/i18n";
import { spacing, useTheme } from "@/lib/theme";

export interface TripActionsMenuProps {
  /** The trip is archived. Only then the menu offers restore and "Delete permanently" (AC-46, AC-47). */
  archived: boolean;
  /** An archive / restore request is in flight: presses are ignored, a spinner shows. */
  busy: boolean;
  /** Failure of the last action, shown above the items (AC-58). */
  errorMessage: string | null;
  onEdit: () => void;
  onArchive: () => void;
  onUnarchive: () => void;
  onDelete: () => void;
  /** The closing "Cancel" pill under the items. */
  onClose: () => void;
}

/** The archive / restore item: a secondary pill that shows a spinner while its request runs. */
function BusyItem({ label, onPress, busy, testID }: { label: string; onPress: () => void; busy: boolean; testID: string }) {
  const { tokens } = useTheme();
  return (
    <SecondaryButton
      label={label}
      accessibilityLabel={label}
      onPress={busy ? undefined : onPress}
      leading={busy ? <ActivityIndicator color={tokens.accent} testID={`${testID}-spinner`} /> : undefined}
      testID={testID}
    />
  );
}

/**
 * The "..." menu of the details (S7) as a bottom sheet of pills: "Edit" is the primary one, the
 * rest are secondary (destructive in `danger`), then "Cancel". Composition is fixed by the trip's
 * archive state: a live trip gets "Edit" and "Move to archive" and NOTHING else; an archived one
 * gets "Edit", "Restore" and "Delete permanently". The path to deletion exists only through the
 * archive (AC-47), so the delete item is rendered inside the archived branch alone.
 */
export function TripActionsMenu({
  archived,
  busy,
  errorMessage,
  onEdit,
  onArchive,
  onUnarchive,
  onDelete,
  onClose,
}: TripActionsMenuProps) {
  const { t } = useTranslation("tripDetail");
  const { t: tCommon } = useTranslation("common");
  return (
    <>
      <View testID="trip-actions-menu" style={styles.menu}>
        {errorMessage === null ? null : (
          <AppText color="danger" accessibilityRole="alert" testID="trip-actions-error">
            {errorMessage}
          </AppText>
        )}
        <PrimaryButton
          label={t("menu.edit")}
          accessibilityLabel={t("menu.edit")}
          onPress={onEdit}
          testID="menu-edit"
        />
        {archived ? (
          <>
            <BusyItem label={t("menu.unarchive")} onPress={onUnarchive} busy={busy} testID="menu-unarchive" />
            <SecondaryButton
              tone="danger"
              label={t("menu.delete")}
              accessibilityLabel={t("menu.delete")}
              onPress={onDelete}
              testID="menu-delete"
            />
          </>
        ) : (
          <BusyItem label={t("menu.archive")} onPress={onArchive} busy={busy} testID="menu-archive" />
        )}
      </View>
      <SecondaryButton
        label={tCommon("actions.cancel")}
        accessibilityLabel={tCommon("actions.cancel")}
        onPress={onClose}
        testID="menu-cancel"
      />
    </>
  );
}

const styles = StyleSheet.create({
  menu: { gap: spacing.sm },
});
