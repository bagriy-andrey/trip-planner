import { ActivityIndicator, StyleSheet, View } from "react-native";

import { AppText, PressableRow } from "@/components";
import type { AppTextColor } from "@/components";
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
}

interface MenuItemProps {
  label: string;
  onPress: () => void;
  color?: AppTextColor;
  busy?: boolean;
  testID: string;
}

function MenuItem({ label, onPress, color = "text", busy = false, testID }: MenuItemProps) {
  const { tokens } = useTheme();
  return (
    <PressableRow
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={busy ? undefined : onPress}
      testID={testID}
      style={styles.item}
    >
      <AppText color={color} style={styles.label}>
        {label}
      </AppText>
      {busy ? <ActivityIndicator color={tokens.accent} testID={`${testID}-spinner`} /> : null}
    </PressableRow>
  );
}

/**
 * The "…" menu of the details (S7). Composition is fixed by the trip's archive state: a live trip
 * gets "Edit" and "Move to archive" and NOTHING else; an archived one gets "Edit", "Restore" and
 * "Delete permanently". The path to deletion exists only through the archive (AC-47), so the
 * delete item is rendered inside the archived branch alone — no other state can reach it.
 */
export function TripActionsMenu({
  archived,
  busy,
  errorMessage,
  onEdit,
  onArchive,
  onUnarchive,
  onDelete,
}: TripActionsMenuProps) {
  const { t } = useTranslation("tripDetail");
  return (
    <View testID="trip-actions-menu" style={styles.menu}>
      {errorMessage === null ? null : (
        <AppText color="danger" accessibilityRole="alert" testID="trip-actions-error">
          {errorMessage}
        </AppText>
      )}
      <MenuItem label={t("menu.edit")} onPress={onEdit} testID="menu-edit" />
      {archived ? (
        <>
          <MenuItem
            label={t("menu.unarchive")}
            onPress={onUnarchive}
            busy={busy}
            testID="menu-unarchive"
          />
          <MenuItem
            label={t("menu.delete")}
            onPress={onDelete}
            color="danger"
            testID="menu-delete"
          />
        </>
      ) : (
        <MenuItem label={t("menu.archive")} onPress={onArchive} busy={busy} testID="menu-archive" />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  menu: { gap: spacing.xs },
  item: { paddingHorizontal: spacing.sm },
  label: { flexShrink: 1 },
});
