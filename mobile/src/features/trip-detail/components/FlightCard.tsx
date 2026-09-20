import { StyleSheet, View } from "react-native";

import { AppText, GlassSurface, Pill, PressableRow } from "@/components";
import { formatShortDate, formatTime, useTranslation } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";
import { radii, spacing } from "@/lib/theme";

import type { MockFlight } from "@/mocks";

// Route separator glyph, not translatable copy.
const ARROW = "→";

export interface FlightCardProps {
  flight: MockFlight;
  locale: Locale;
  onPress: () => void;
  testID?: string;
}

/** Flight summary: IATA route and departure in the mono face (AC-38), baggage and passenger chips. */
export function FlightCard({ flight, locale, onPress, testID }: FlightCardProps) {
  const { t } = useTranslation("tripDetail");
  const route = `${flight.from} ${ARROW} ${flight.to}`;
  // Shown as the wall-clock time at the departure airport, not in UTC.
  const when = `${formatShortDate(locale, flight.departure, flight.timeZone)} · ${formatTime(locale, flight.departure, flight.timeZone)}`;
  const baggage = flight.baggageIncluded ? t("flight.baggageIncluded") : t("flight.noBaggage");
  const passengers = t("flight.passengers", { count: flight.passengers });
  return (
    <PressableRow
      accessibilityRole="link"
      accessibilityLabel={[route, when, baggage, passengers].join(", ")}
      onPress={onPress}
      testID={testID}
      style={styles.row}
    >
      <GlassSurface style={styles.card}>
        <AppText variant="mono" numberOfLines={1}>
          {route}
        </AppText>
        <AppText variant="monoSmall" color="textMuted" numberOfLines={1}>
          {when}
        </AppText>
        <View style={styles.chips}>
          <Pill tone={flight.baggageIncluded ? "neutral" : "muted"} label={baggage} />
          <Pill label={passengers} />
        </View>
      </GlassSurface>
    </PressableRow>
  );
}

const styles = StyleSheet.create({
  row: { borderRadius: radii.lg },
  card: { flex: 1, padding: spacing.md, gap: spacing.xs },
  chips: { flexDirection: "row", flexWrap: "wrap", columnGap: spacing.sm, rowGap: spacing.xs },
});
