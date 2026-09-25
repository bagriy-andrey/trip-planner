import { Pressable, StyleSheet, View } from "react-native";

import { AppText, Icon, IconButton } from "@/components";
import { useTranslation } from "@/lib/i18n";
import { family, layout, spacing } from "@/lib/theme";

export interface CarViewHeaderProps {
  onBack: () => void;
  /** Absent while there is no rental to edit (loading / error / not found). */
  onEdit?: () => void;
}

export function CarViewHeader({ onBack, onEdit }: CarViewHeaderProps) {
  const { t } = useTranslation("car");
  return (
    <View style={styles.row}>
      <View style={styles.side}>
        <IconButton accessibilityLabel={t("view.back")} onPress={onBack} testID="car-view-back">
          <Icon name="chevronLeft" />
        </IconButton>
      </View>
      <AppText variant="h2" accessibilityRole="header" style={styles.title} numberOfLines={1}>
        {t("view.title")}
      </AppText>
      <View style={[styles.side, styles.end]}>
        {onEdit === undefined ? null : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("view.edit")}
            onPress={onEdit}
            testID="car-view-edit"
            style={styles.edit}
          >
            <AppText color="accent" style={styles.editText}>
              {t("view.edit")}
            </AppText>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", minHeight: layout.minTouch, gap: spacing.sm },
  side: { minWidth: layout.minTouch * 2, flexShrink: 0 },
  end: { alignItems: "flex-end" },
  title: { flex: 1, textAlign: "center" },
  edit: { minHeight: layout.minTouch, minWidth: layout.minTouch, alignItems: "center", justifyContent: "center" },
  editText: { fontFamily: family.bold },
});
