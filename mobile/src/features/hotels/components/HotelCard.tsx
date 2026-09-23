import { StyleSheet, View } from "react-native";
import type { Hotel } from "@tripplanner/shared";

import { AppText, GlassSurface, Icon, Pill, PressableRow } from "@/components";
import { useTranslation } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";
import { radius, spacing } from "@/lib/theme";

import { toHotelCardData } from "../types";

export interface HotelCardProps {
  hotel: Hotel;
  locale: Locale;
  onPress: (hotelId: string) => void;
  testID?: string;
}

/**
 * S7 hotel card (design/screens/trip-detail.md): name, check-in / check-out (mono, in the hotel's
 * own time zone) and a breakfast chip. Address, notes, booking reference and cost are NOT here.
 */
export function HotelCard({ hotel, locale, onPress, testID }: HotelCardProps) {
  const { t } = useTranslation("hotel");
  const data = toHotelCardData(hotel, locale);
  const chip = data.breakfastChip;
  const chipLabel =
    chip === null
      ? null
      : chip.kind === "all"
        ? t("card.breakfastAll")
        : t("card.breakfastPartial", { count: chip.days });

  return (
    <PressableRow
      accessibilityRole="button"
      accessibilityLabel={data.a11yLabel}
      onPress={() => onPress(hotel.id)}
      testID={testID}
      style={styles.pressable}
    >
      <GlassSurface style={styles.card}>
        <View style={styles.row}>
          <AppText variant="cardTitle" style={styles.name}>
            {data.name}
          </AppText>
          <Icon name="chevron" color="textTertiary" />
        </View>
        <View style={styles.line}>
          <AppText color="textSecondary">{t("card.checkIn")}</AppText>
          <AppText variant="monoSmall">{data.checkInText}</AppText>
        </View>
        <View style={styles.line}>
          <AppText color="textSecondary">{t("card.checkOut")}</AppText>
          <AppText variant="monoSmall">{data.checkOutText}</AppText>
        </View>
        {chipLabel === null ? null : (
          <View style={styles.chips}>
            <Pill label={chipLabel} />
          </View>
        )}
      </GlassSurface>
    </PressableRow>
  );
}

const styles = StyleSheet.create({
  pressable: { width: "100%" },
  card: { width: "100%", padding: spacing.lg, borderRadius: radius.card, gap: spacing.sm },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  name: { flexShrink: 1 },
  line: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
});
