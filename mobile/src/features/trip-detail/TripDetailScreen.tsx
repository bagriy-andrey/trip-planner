import { useRouter } from "expo-router";
import { StyleSheet, View } from "react-native";
import type { Edge } from "react-native-safe-area-context";

import { Screen } from "@/components";
import { PLACEHOLDER_NOW } from "@/features/trips";
import {
  formatDateRange,
  formatNights,
  formatRelativeDays,
  resolveLocale,
  useTranslation,
} from "@/lib/i18n";
import { spacing } from "@/lib/theme";

import { BookingSection } from "./components/BookingSection";
import { CarEmptySection } from "./components/CarEmptySection";
import { FlightCard } from "./components/FlightCard";
import { HotelCard } from "./components/HotelCard";
import { TripHero } from "./components/TripHero";
import { FLIGHT_PLACEHOLDERS, HOTEL_PLACEHOLDER, TRIP_DETAIL_PLACEHOLDER } from "./placeholders";

// The hero bleeds under the status bar and pads the top inset itself.
const EDGES: readonly Edge[] = ["bottom", "left", "right"];

export interface TripDetailScreenProps {
  /**
   * Only used to build the routes of the booking forms. The content never
   * depends on it: the skeleton shows the same sample trip for any id, so a
   * malformed or unknown id (e.g. from a future deep link) cannot break it.
   */
  tripId: string;
}

/** S7 — trip details: hero, then flight / hotel / car sections. Pushed over the tabs, no tab bar. */
export function TripDetailScreen({ tripId }: TripDetailScreenProps) {
  const { t, i18n } = useTranslation("tripDetail");
  const { t: tTrips } = useTranslation("trips");
  const { t: tCommon } = useTranslation("common");
  const router = useRouter();
  const locale = resolveLocale([i18n.language]);

  // The id is data, not a path: encode it so it can never add path segments.
  const base = `/trips/${encodeURIComponent(tripId)}`;
  const { start, end, nights, cityKey } = TRIP_DETAIL_PLACEHOLDER;
  const dateLine = `${formatDateRange(locale, start, end)} · ${formatNights(locale, nights)}`;

  return (
    <Screen edges={EDGES} testID="trip-detail-screen" contentStyle={styles.screen}>
      <TripHero
        city={tTrips(cityKey)}
        dateLine={dateLine}
        statusLabel={formatRelativeDays(locale, start, PLACEHOLDER_NOW)}
        backLabel={tCommon("actions.back")}
        moreLabel={t("a11y.more")}
        moreHint={tCommon("a11y.soonHint")}
        onBack={() => router.back()}
      />
      <View style={styles.sections}>
        <BookingSection
          title={t("sections.flights")}
          addLabel={t("a11y.addFlight")}
          onAdd={() => router.push(`${base}/flights/new`)}
          testID="section-flights"
          addTestID="add-flight"
        >
          {FLIGHT_PLACEHOLDERS.map((flight) => (
            <FlightCard
              key={flight.id}
              flight={flight}
              locale={locale}
              onPress={() => router.push(`${base}/flights/${encodeURIComponent(flight.id)}`)}
              testID={`flight-card-${flight.id}`}
            />
          ))}
        </BookingSection>
        <BookingSection
          title={t("sections.hotel")}
          addLabel={t("a11y.addHotel")}
          onAdd={() => router.push(`${base}/hotels/new`)}
          testID="section-hotel"
          addTestID="add-hotel"
        >
          <HotelCard hotel={HOTEL_PLACEHOLDER} locale={locale} testID="hotel-card" />
        </BookingSection>
        <BookingSection
          title={t("sections.car")}
          addLabel={t("a11y.addCar")}
          onAdd={() => router.push(`${base}/cars/new`)}
          testID="section-car"
          addTestID="add-car"
        >
          <CarEmptySection onAdd={() => router.push(`${base}/cars/new`)} testID="car-empty-add" />
        </BookingSection>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  // The hero is full-bleed, so the screen adds no horizontal padding of its own.
  screen: { paddingHorizontal: 0, paddingBottom: spacing.xl },
  sections: { gap: spacing.xl, paddingHorizontal: spacing.lg, paddingTop: spacing.xl },
});
