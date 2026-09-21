import { Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components";
import { layout, spacing } from "@/lib/theme";

export interface FormHeaderProps {
  title: string;
  cancelLabel: string;
  onCancel: () => void;
}

/**
 * The sheet's top bar: "Cancel" on the left, the title in the middle, and an empty slot of the
 * same width on the right so the title stays centred. There is deliberately no "Done" (AC-33):
 * saving is the bottom button. `ModalHeader` always draws "Done", hence this local bar.
 */
export function FormHeader({ title, cancelLabel, onCancel }: FormHeaderProps) {
  return (
    <View style={styles.bar}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={cancelLabel}
        onPress={onCancel}
        testID="trip-form-cancel"
        style={styles.side}
      >
        <AppText color="textSecondary">{cancelLabel}</AppText>
      </Pressable>
      <AppText variant="h2" accessibilityRole="header" numberOfLines={1} style={styles.title}>
        {title}
      </AppText>
      <View style={styles.side} />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    minHeight: layout.minTouch,
  },
  // Equal flex on both sides keeps the title centred whatever the width of the Cancel word.
  side: { flex: 1, minWidth: layout.minTouch, minHeight: layout.minTouch, justifyContent: "center" },
  title: { flex: 2, textAlign: "center" },
});
