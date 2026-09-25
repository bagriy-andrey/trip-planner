import { Pressable, StyleSheet, View } from "react-native";
import type { Car } from "@tripplanner/shared";

import { AppText, GlassSurface, Icon } from "@/components";
import { useTranslation } from "@/lib/i18n";
import { family, layout, radius, size, spacing, useTheme } from "@/lib/theme";

import { useCopyBookingRef } from "../hooks/useCopyBookingRef";

export function MainCard({ car }: { car: Car }) {
  const { t } = useTranslation("car");
  const { tokens } = useTheme();
  const { copied, failed, copy } = useCopyBookingRef(car.bookingRef);
  const label = copied ? t("view.copied") : t("view.copy");
  return (
    <GlassSurface strengthen style={styles.card}>
      <View style={styles.head}>
        <AppText style={styles.company}>{car.company ?? t("card.untitled")}</AppText>
        {car.carClass === null ? null : (
          <AppText variant="small" color="textSecondary">
            {car.carClass}
          </AppText>
        )}
      </View>
      <View style={styles.refRow}>
        <View style={styles.ref}>
          <AppText variant="caption" color="textSecondary">
            {t("view.bookingRef")}
          </AppText>
          <AppText variant="mono" style={styles.refValue} testID="car-view-booking-ref">
            {car.bookingRef}
          </AppText>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={label}
          onPress={() => void copy()}
          testID="car-view-copy"
          style={[styles.pill, { backgroundColor: tokens.surface, borderColor: tokens.surfaceBorder }]}
        >
          <Icon name="copy" size="sm" color={copied ? "accent" : "text"} />
          <AppText variant="small" style={styles.pillText}>
            {label}
          </AppText>
        </Pressable>
      </View>
      {failed ? (
        <AppText variant="caption" color="danger" accessibilityRole="alert" testID="car-view-copy-error">
          {t("view.copyFailed")}
        </AppText>
      ) : null}
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  card: { padding: spacing.lg, borderRadius: radius.card, gap: spacing.md },
  head: { gap: spacing.xs },
  company: { fontFamily: family.display, fontSize: size.cardTitle },
  refRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md },
  ref: { flexShrink: 1, gap: spacing.xs },
  refValue: { fontSize: size.cardTitle },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    minHeight: layout.minTouch,
    minWidth: layout.minTouch,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    borderWidth: layout.borderWidth,
  },
  pillText: { fontFamily: family.bold },
});
