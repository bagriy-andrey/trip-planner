import { StyleSheet, View } from "react-native";

import { AppText, Icon, IconButton } from "@/components";
import { useTranslation } from "@/lib/i18n";
import { layout, spacing } from "@/lib/theme";

/** `IconButton`'s default visible circle. */
const BACK_CIRCLE = 36;

export interface CarViewHeaderProps {
  onBack: () => void;
  /** Opens the actions sheet; absent while there is no rental to act on (loading / error / not found). */
  onMore?: () => void;
}

export function CarViewHeader({ onBack, onMore }: CarViewHeaderProps) {
  const { t } = useTranslation("car");
  return (
    <View style={styles.row}>
      <View style={styles.side}>
        <IconButton accessibilityLabel={t("view.back")} onPress={onBack} style={styles.back} testID="car-view-back">
          <Icon name="chevronLeft" />
        </IconButton>
      </View>
      <AppText variant="h2" accessibilityRole="header" style={styles.title} numberOfLines={1}>
        {t("view.title")}
      </AppText>
      <View style={[styles.side, styles.end]}>
        {onMore === undefined ? null : (
          <IconButton accessibilityLabel={t("view.more")} onPress={onMore} style={styles.more} testID="car-view-more">
            <Icon name="more" />
          </IconButton>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", minHeight: layout.minTouch, gap: spacing.sm },
  side: { minWidth: layout.minTouch * 2, flexShrink: 0, alignItems: "flex-start" },
  // The 36pt circle sits centred in its 44pt hit area: pull it left so the circle, not the hit area, meets the content edge.
  back: { marginLeft: -(layout.minTouch - BACK_CIRCLE) / 2 },
  end: { alignItems: "flex-end" },
  title: { flex: 1, textAlign: "center" },
  more: { marginRight: -(layout.minTouch - BACK_CIRCLE) / 2 },
});
