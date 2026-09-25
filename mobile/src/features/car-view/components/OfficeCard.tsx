import { Pressable, StyleSheet, View } from "react-native";
import type { Car } from "@tripplanner/shared";

import { AppText, GlassSurface, Icon } from "@/components";
import { useTranslation } from "@/lib/i18n";
import { family, layout, radius, spacing, useTheme } from "@/lib/theme";

import { useOfficeActions } from "../hooks/useOfficeActions";

/** The office card; null (hidden) when there is no address, no link and no phone (AC-47). */
export function OfficeCard({ car }: { car: Car }) {
  const { t } = useTranslation("car");
  const { tokens } = useTheme();
  const { error, openRoute, call } = useOfficeActions(car);
  const hasRoute = car.mapsUrl !== null;
  const hasCall = car.phone !== null;
  if (car.address === null && !hasRoute && !hasCall) return null;

  return (
    <GlassSurface style={styles.card}>
      <AppText variant="h2">{t("view.office")}</AppText>
      {car.address === null ? null : <AppText testID="car-view-address">{car.address}</AppText>}
      {hasRoute || hasCall ? (
        <View style={styles.buttons}>
          {hasRoute ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("view.route")}
              onPress={() => void openRoute()}
              testID="car-view-route"
              style={[styles.pill, { backgroundColor: tokens.accent, borderColor: tokens.accent }]}
            >
              <Icon name="navigation" size="sm" color="onAccent" />
              <AppText color="onAccent" style={styles.pillText}>
                {t("view.route")}
              </AppText>
            </Pressable>
          ) : null}
          {hasCall ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("view.call")}
              onPress={() => void call()}
              testID="car-view-call"
              style={[styles.pill, { backgroundColor: tokens.surface, borderColor: tokens.surfaceBorder }]}
            >
              <Icon name="phone" size="sm" />
              <AppText style={styles.pillText}>{t("view.call")}</AppText>
            </Pressable>
          ) : null}
        </View>
      ) : null}
      {error === null ? null : (
        <AppText variant="caption" color="danger" accessibilityRole="alert" testID="car-view-office-error">
          {t(`view.${error}`)}
        </AppText>
      )}
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  card: { padding: spacing.lg, borderRadius: radius.card, gap: spacing.md },
  buttons: { flexDirection: "row", gap: spacing.md },
  pill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    minHeight: layout.minTouch,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    borderWidth: layout.borderWidth,
  },
  pillText: { fontFamily: family.bold },
});
