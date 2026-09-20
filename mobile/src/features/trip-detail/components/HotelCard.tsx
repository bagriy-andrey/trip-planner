import { StyleSheet, View } from "react-native";

import { AppText, GlassSurface, Pill } from "@/components";
import { formatShortDate, useTranslation } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";
import { spacing } from "@/lib/theme";

import type { HotelPlaceholder } from "../placeholders";

export interface HotelCardProps {
  hotel: HotelPlaceholder;
  locale: Locale;
  testID?: string;
}

/** Hotel summary: name, check-in/out dates (mono, AC-38) and a breakfast chip. Not navigable in the skeleton. */
export function HotelCard({ hotel, locale, testID }: HotelCardProps) {
  const { t } = useTranslation("tripDetail");
  const checkIn = formatShortDate(locale, hotel.checkIn);
  const checkOut = formatShortDate(locale, hotel.checkOut);
  return (
    <GlassSurface style={styles.card}>
      <View testID={testID} style={styles.content}>
        <AppText variant="title" numberOfLines={2}>
          {t("hotel.sampleName")}
        </AppText>
        <View style={styles.dates}>
          <View style={styles.date}>
            <AppText variant="caption" color="textMuted">
              {t("hotel.checkIn")}
            </AppText>
            <AppText variant="monoSmall">{checkIn}</AppText>
          </View>
          <View style={styles.date}>
            <AppText variant="caption" color="textMuted">
              {t("hotel.checkOut")}
            </AppText>
            <AppText variant="monoSmall">{checkOut}</AppText>
          </View>
        </View>
        <Pill label={t("hotel.breakfast", { count: hotel.totalDays, included: hotel.breakfastDays })} />
      </View>
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  card: { padding: spacing.md },
  content: { gap: spacing.sm },
  dates: { flexDirection: "row", flexWrap: "wrap", columnGap: spacing.xl, rowGap: spacing.xs },
  date: { gap: spacing.xs },
});
