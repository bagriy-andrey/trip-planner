import { Pressable, StyleSheet, View } from "react-native";

import { useTranslation } from "@/lib/i18n";
import { spacing } from "@/lib/theme";

import { AppText } from "./AppText";
import { Icon } from "./Icon";
import { MIN_HIT_SIZE } from "./a11y";

export interface ModalHeaderProps {
  title: string;
  onCancel?: () => void;
  onDone?: () => void;
  /** Defaults to `common:actions.cancel`. */
  cancelLabel?: string;
  /** Defaults to `common:actions.done`. */
  doneLabel?: string;
  doneDisabled?: boolean;
  /** Draw the left action as a "×" icon (its `cancelLabel` stays the spoken name) instead of text. */
  cancelAsIcon?: boolean;
  /** No Cancel on the left (the form has its own Cancel at the bottom): the slot stays to keep the title centred. */
  hideCancel?: boolean;
  /** No Done on the right (the form has its own Save button): the slot stays to keep the title centred. */
  hideDone?: boolean;
}

/** Cancel / Title / Done bar for modal forms. */
export function ModalHeader({
  title,
  onCancel,
  onDone,
  cancelLabel,
  doneLabel,
  doneDisabled = false,
  cancelAsIcon = false,
  hideDone = false,
  hideCancel = false,
}: ModalHeaderProps) {
  const { t } = useTranslation();
  const cancel = cancelLabel ?? t("actions.cancel");
  const done = doneLabel ?? t("actions.done");
  return (
    <View style={styles.bar}>
      {hideCancel ? (
        <View style={[styles.side, styles.left]} />
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={cancel}
          onPress={onCancel}
          style={[styles.side, styles.left]}
        >
          {cancelAsIcon ? <Icon name="close" color="textSecondary" /> : <AppText color="textSecondary">{cancel}</AppText>}
        </Pressable>
      )}
      <AppText variant="h2" accessibilityRole="header" numberOfLines={1} style={styles.title}>
        {title}
      </AppText>
      {hideDone ? (
        <View style={[styles.side, styles.right]} />
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={done}
          accessibilityState={{ disabled: doneDisabled }}
          disabled={doneDisabled}
          onPress={onDone}
          style={[styles.side, styles.right, doneDisabled && styles.disabled]}
        >
          <AppText color="accent">{done}</AppText>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    minHeight: MIN_HIT_SIZE,
  },
  side: {
    minHeight: MIN_HIT_SIZE,
    minWidth: MIN_HIT_SIZE,
    justifyContent: "center",
  },
  left: { alignItems: "flex-start" },
  right: { alignItems: "flex-end" },
  title: { flex: 1, textAlign: "center" },
  disabled: { opacity: 0.4 },
});
