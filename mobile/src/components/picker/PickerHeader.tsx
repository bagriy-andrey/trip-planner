import { Pressable, StyleSheet, View } from "react-native";

import { useTranslation } from "@/lib/i18n";
import { layout, spacing } from "@/lib/theme";

import { AppText } from "../AppText";

export interface PickerHeaderProps {
  title: string;
  onCancel: () => void;
  testID: string;
}

/** «Cancel» left, title centred, an empty block of the same width on the right for symmetry. */
export function PickerHeader({ title, onCancel, testID }: PickerHeaderProps) {
  const { t } = useTranslation("common");
  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("actions.cancel")}
        onPress={onCancel}
        testID={`${testID}-cancel`}
        style={styles.side}
      >
        <AppText color="accent" variant="button">
          {t("actions.cancel")}
        </AppText>
      </Pressable>
      <AppText variant="h2" accessibilityRole="header" style={styles.title} numberOfLines={1}>
        {title}
      </AppText>
      <View style={styles.side} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  side: { minWidth: layout.minTouch * 2, minHeight: layout.minTouch, justifyContent: "center" },
  title: { flex: 1, textAlign: "center" },
});
