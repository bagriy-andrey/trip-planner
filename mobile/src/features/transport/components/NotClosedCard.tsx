import { StyleSheet, View } from "react-native";
import { findPlaceById } from "@tripplanner/shared";
import type { RouteView } from "@tripplanner/shared";

import { AppText, Icon, PrimaryButton } from "@/components";
import { useTranslation } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";
import { layout, radius, spacing, useTheme } from "@/lib/theme";

export interface NotClosedCardProps {
  openAt: NonNullable<RouteView["openAt"]>;
  locale: Locale;
  /** Reports where the next segment should start from; the segment form (Step 9) prefills "from". */
  onAddFlight: (openAt: NonNullable<RouteView["openAt"]>) => void;
  testID?: string;
}

/**
 * The bottom-of-screen banner when the route doesn't return to its starting city (AC-67,
 * design/screens/route.md "Маршрут не замкнут"): a `warnBg` card with a dashed `dashBorderWidth`
 * border, distinct from `WarningRow`'s plain inline rows. One rule closes both a simple round trip
 * and a multi-city route — this component doesn't judge that itself, it only renders what
 * `buildRoute`'s `openAt` already decided.
 */
export function NotClosedCard({ openAt, locale, onAddFlight, testID }: NotClosedCardProps) {
  const { t } = useTranslation("transport");
  const { tokens } = useTheme();
  const cityName = findPlaceById(openAt.cityId)?.[locale] ?? openAt.cityId;
  const buttonLabel = t("route.addFlightFrom", { city: cityName });

  return (
    <View
      testID={testID}
      style={[styles.card, { backgroundColor: tokens.warnBg, borderColor: tokens.warnBorder }]}
    >
      <View style={styles.header}>
        <Icon name="warning" color="text" />
        <AppText variant="h2" accessibilityRole="header" style={styles.title}>
          {t("route.notClosedTitle")}
        </AppText>
      </View>
      <AppText color="textSecondary">{t("route.notClosedText")}</AppText>
      <PrimaryButton
        label={buttonLabel}
        accessibilityLabel={buttonLabel}
        onPress={() => onAddFlight(openAt)}
        testID={testID === undefined ? undefined : `${testID}-add`}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.lg,
    borderRadius: radius.card,
    borderWidth: layout.dashBorderWidth,
    borderStyle: "dashed",
    gap: spacing.md,
  },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  title: { flexShrink: 1 },
});
