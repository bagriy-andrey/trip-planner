import { useRouter } from "expo-router";
import { StyleSheet, View } from "react-native";
import type { Edge } from "react-native-safe-area-context";

import { Screen } from "@/components";
import {
  formatDateRange,
  formatNights,
  formatRelativeDays,
  resolveLocale,
  useTranslation,
} from "@/lib/i18n";
import { spacing } from "@/lib/theme";
import { MOCK_NOW, findTrip, nightsBetween } from "@/mocks";

import { BookingSection } from "./components/BookingSection";
import { CarEmptySection } from "./components/CarEmptySection";
import { FlightCard } from "./components/FlightCard";
import { HotelCard } from "./components/HotelCard";
import { TripHero } from "./components/TripHero";

// The hero bleeds under the status bar and pads the top inset itself.
const EDGES: readonly Edge[] = ["bottom", "left", "right"];

export interface TripDetailScreenProps {
  /**
   * Picks the mock trip. An unknown or malformed id (e.g. from a future deep
   * link) falls back to the nearest trip instead of breaking the screen.
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

  // The id is data, not a path: it goes through `params`, which expo-router encodes
  // per segment, so it can never add path segments.
  const params = { tripId };
  const trip = findTrip(tripId);
  const { start, end, flights, hotel } = trip;
  // A draft has no dates yet: no range or nights, and its status reads "plan · no date yet".
  const dated = start !== null && end !== null;
  const dateLine = dated
    ? `${formatDateRange(locale, start, end)} · ${formatNights(locale, nightsBetween(start, end))}`
    : null;
  const statusLabel = dated ? formatRelativeDays(locale, start, MOCK_NOW) : tCommon("status.draft");

  return (
    <Screen edges={EDGES} testID="trip-detail-screen" contentStyle={styles.screen}>
      <TripHero
        city={tTrips(trip.cityKey)}
        dateLine={dateLine}
        statusLabel={statusLabel}
        backLabel={tCommon("actions.back")}
        moreLabel={t("a11y.more")}
        moreHint={tCommon("a11y.soonHint")}
        onBack={() => router.back()}
      />
      <View style={styles.sections}>
        <BookingSection
          title={t("sections.flights")}
          addLabel={t("a11y.addFlight")}
          onAdd={() => router.push({ pathname: "/trips/[tripId]/flights/new", params })}
          testID="section-flights"
          addTestID="add-flight"
        >
          {flights.map((flight) => (
            <FlightCard
              key={flight.id}
              flight={flight}
              locale={locale}
              onPress={() => router.push({
                  pathname: "/trips/[tripId]/flights/[flightId]",
                  params: { tripId, flightId: flight.id },
                })}
              testID={`flight-card-${flight.id}`}
            />
          ))}
        </BookingSection>
        <BookingSection
          title={t("sections.hotel")}
          addLabel={t("a11y.addHotel")}
          onAdd={() => router.push({ pathname: "/trips/[tripId]/hotels/new", params })}
          testID="section-hotel"
          addTestID="add-hotel"
        >
          {hotel !== null ? <HotelCard hotel={hotel} locale={locale} testID="hotel-card" /> : null}
        </BookingSection>
        <BookingSection
          title={t("sections.car")}
          addLabel={t("a11y.addCar")}
          onAdd={() => router.push({ pathname: "/trips/[tripId]/cars/new", params })}
          testID="section-car"
          addTestID="add-car"
        >
          <CarEmptySection onAdd={() => router.push({ pathname: "/trips/[tripId]/cars/new", params })} testID="car-empty-add" />
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
