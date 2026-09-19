import { Pressable, StyleSheet, View } from "react-native";

import { useTranslation } from "@/lib/i18n";
import { spacing } from "@/lib/theme";

import { AppText } from "./AppText";
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
}

/** Cancel / Title / Done bar for modal forms. */
export function ModalHeader({
  title,
  onCancel,
  onDone,
  cancelLabel,
  doneLabel,
  doneDisabled = false,
}: ModalHeaderProps) {
  const { t } = useTranslation();
  const cancel = cancelLabel ?? t("actions.cancel");
  const done = doneLabel ?? t("actions.done");
  return (
    <View style={styles.bar}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={cancel}
        onPress={onCancel}
        style={[styles.side, styles.left]}
      >
        <AppText color="textMuted">{cancel}</AppText>
      </Pressable>
      <AppText variant="title" accessibilityRole="header" numberOfLines={1} style={styles.title}>
        {title}
      </AppText>
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
