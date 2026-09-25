import { StyleSheet, View } from "react-native";
import type { Car } from "@tripplanner/shared";

import { AppText, GlassSurface, Icon, PressableRow } from "@/components";
import { useTranslation } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";
import { family, layout, radius, spacing, useTheme } from "@/lib/theme";

import { toCarCardData } from "../types";

export interface CarCardProps {
  car: Car;
  locale: Locale;
  onPress: (carId: string) => void;
  testID?: string;
}

/**
 * S7 rental card (AC-39): company (or "Car rental"), pick-up / return columns, booking reference.
 * Mono only for the moments and the reference. Address, phone, terms, payment, notes are NOT here.
 */
export function CarCard({ car, locale, onPress, testID }: CarCardProps) {
  const { t } = useTranslation("car");
  const { tokens } = useTheme();
  const data = toCarCardData(car, t, locale);

  return (
    <PressableRow
      accessibilityRole="button"
      accessibilityLabel={data.a11yLabel}
      onPress={() => onPress(car.id)}
      testID={testID}
      style={styles.pressable}
    >
      <GlassSurface style={styles.card}>
        <View style={styles.row}>
          <AppText style={styles.title}>{data.title}</AppText>
          <Icon name="chevron" color="textTertiary" />
        </View>
        <View style={styles.columns}>
          <View style={styles.column}>
            <AppText variant="caption" color="textSecondary">
              {t("card.pickup")}
            </AppText>
            <AppText variant="monoSmall">{data.pickupText}</AppText>
            <AppText variant="caption" color="textSecondary">
              {data.pickupPlace}
            </AppText>
          </View>
          <View style={styles.column}>
            <AppText variant="caption" color="textSecondary">
              {t("card.return")}
            </AppText>
            <AppText variant="monoSmall">{data.returnText}</AppText>
            <AppText variant="caption" color="textSecondary">
              {data.returnPlaceText}
            </AppText>
          </View>
        </View>
        <View style={[styles.divider, { backgroundColor: tokens.divider }]} />
        <View style={styles.ref}>
          <AppText variant="caption" color="textSecondary">
            {t("card.bookingRef")}
          </AppText>
          <AppText variant="monoSmall">{data.bookingRef}</AppText>
        </View>
      </GlassSurface>
    </PressableRow>
  );
}

const styles = StyleSheet.create({
  pressable: { width: "100%" },
  card: { width: "100%", padding: spacing.lg, borderRadius: radius.card, gap: spacing.md },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  title: { flexShrink: 1, fontFamily: family.bold },
  columns: { flexDirection: "row", gap: spacing.lg },
  column: { flex: 1, gap: spacing.xs },
  divider: { height: layout.borderWidth },
  ref: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
});
