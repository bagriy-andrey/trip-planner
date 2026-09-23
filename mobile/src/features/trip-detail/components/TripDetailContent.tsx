import { resolveDestinationName } from "@tripplanner/shared";
import type { Trip } from "@tripplanner/shared";
import { useRouter } from "expo-router";
import { StyleSheet, View } from "react-native";
import type { Edge } from "react-native-safe-area-context";

import { Screen } from "@/components";
import { TransportBlock, useRouteView, useSegmentsQuery } from "@/features/transport";
import { toTripCardData } from "@/features/trips";
import { useToday } from "@/lib/clock";
import { resolveLocale, useTranslation } from "@/lib/i18n";
import { spacing } from "@/lib/theme";

import { useLeaveToList } from "../hooks/useLeaveToList";
import { useTripActions } from "../hooks/useTripActions";

import { BookingSection } from "./BookingSection";
import { ConfirmDeleteSheet } from "./ConfirmDeleteSheet";
import { EmptyBookingSection } from "./EmptyBookingSection";
import { SheetOverlay } from "./SheetOverlay";
import { TripActionsMenu } from "./TripActionsMenu";
import { TripHero } from "./TripHero";

// The hero bleeds under the status bar and pads the top inset itself.
const EDGES: readonly Edge[] = ["bottom", "left", "right"];

export interface TripDetailContentProps {
  trip: Trip;
  /** Re-requests the trip; used when an action finds that the trip is gone. */
  refetch: () => Promise<unknown>;
}

/** The loaded S7: hero, three empty booking blocks, and the "…" sheets over them. */
export function TripDetailContent({ trip, refetch }: TripDetailContentProps) {
  const { t, i18n } = useTranslation("tripDetail");
  const { t: tCommon } = useTranslation("common");
  const router = useRouter();
  const leave = useLeaveToList();
  const today = useToday();
  const locale = resolveLocale([i18n.language]);
  const actions = useTripActions(trip, refetch);
  const card = toTripCardData(trip, { today, language: locale, upcomingId: null });
  const sheetOpen = actions.sheet !== "closed";

  // The id is data, not a path: it goes through `params`, which expo-router encodes per segment,
  // so a hostile id can never add path segments (AC-76).
  const params = { tripId: trip.id };
  const title = trip.title?.trim() ?? "";
  const deleteName = title === "" ? resolveDestinationName(trip, locale) : title;

  // The "Транспорт" block (Step 7's `TransportBlock`) replaces the old "Рейс" block. It computes
  // nothing on its own (summary, nearest segment, "not closed" all come from `buildRoute` via
  // `useRouteView`, AC-62); this screen only decides EMPTY vs. NOT — `segments.length` is a
  // presence check, not route math — and wires the two navigation targets it owns: the segment
  // (edit form, Step 9) and the whole route (S13, Step 8).
  const segmentsQuery = useSegmentsQuery(trip.id);
  const route = useRouteView(segmentsQuery.segments, trip);
  const hasSegments = segmentsQuery.segments !== undefined && segmentsQuery.segments.length > 0;

  const openRoute = () => router.push({ pathname: "/trips/[tripId]/route", params });
  const openSegment = (segmentId: string) =>
    router.push({ pathname: "/trips/[tripId]/flights/[flightId]", params: { tripId: trip.id, flightId: segmentId } });

  return (
    <View style={styles.root}>
      {/* Behind an open sheet the screen is out of the accessibility tree, like behind a modal. */}
      <View
        style={styles.root}
        accessibilityElementsHidden={sheetOpen}
        importantForAccessibility={sheetOpen ? "no-hide-descendants" : "auto"}
      >
        <Screen edges={EDGES} testID="trip-detail-screen" contentStyle={styles.screen}>
          <TripHero
            placeName={card.placeName}
            status={card.status}
            startDate={card.startDate}
            endDate={card.endDate}
            today={today}
            locale={locale}
            coverIndex={card.coverIndex}
            backLabel={tCommon("actions.back")}
            moreLabel={t("a11y.more")}
            onBack={leave}
            onMore={actions.openMenu}
          />
          <View style={styles.sections}>
            <BookingSection
              title={t("sections.flights")}
              addLabel={t("a11y.addFlight")}
              onAdd={() => router.push({ pathname: "/trips/[tripId]/flights/new", params })}
              hideAdd={!(hasSegments && route !== undefined)}
              testID="section-flights"
              addTestID="add-flight"
            >
              {hasSegments && route !== undefined ? (
                <TransportBlock
                  route={route}
                  locale={locale}
                  onSegmentPress={openSegment}
                  onOpenRoute={openRoute}
                  testID="transport-block"
                />
              ) : (
                <EmptyBookingSection
                  caption={t("empty.flight")}
                  onAdd={() => router.push({ pathname: "/trips/[tripId]/flights/new", params })}
                  testID="empty-flight"
                />
              )}
            </BookingSection>
            <BookingSection
              title={t("sections.hotel")}
              addLabel={t("a11y.addHotel")}
              onAdd={() => router.push({ pathname: "/trips/[tripId]/hotels/new", params })}
              hideAdd
              testID="section-hotel"
              addTestID="add-hotel"
            >
              <EmptyBookingSection
                caption={t("empty.hotel")}
                onAdd={() => router.push({ pathname: "/trips/[tripId]/hotels/new", params })}
                testID="empty-hotel"
              />
            </BookingSection>
            <BookingSection
              title={t("sections.car")}
              addLabel={t("a11y.addCar")}
              onAdd={() => router.push({ pathname: "/trips/[tripId]/cars/new", params })}
              hideAdd
              testID="section-car"
              addTestID="add-car"
            >
              <EmptyBookingSection
                caption={t("empty.car")}
                onAdd={() => router.push({ pathname: "/trips/[tripId]/cars/new", params })}
                testID="empty-car"
              />
            </BookingSection>
          </View>
        </Screen>
      </View>
      {actions.sheet === "closed" ? null : (
        <SheetOverlay closeLabel={tCommon("actions.cancel")} onClose={actions.closeSheet} testID="trip-sheet">
          {actions.sheet === "menu" ? (
            <TripActionsMenu
              archived={actions.archived}
              busy={actions.busy}
              errorMessage={actions.errorMessage}
              onEdit={actions.edit}
              onArchive={actions.archive}
              onUnarchive={actions.unarchive}
              onDelete={actions.askDelete}
            />
          ) : (
            <ConfirmDeleteSheet
              name={deleteName}
              busy={actions.busy}
              errorMessage={actions.errorMessage}
              onConfirm={actions.confirmDelete}
              onCancel={actions.closeSheet}
            />
          )}
        </SheetOverlay>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  // The hero is full-bleed, so the screen adds no horizontal padding of its own.
  screen: { paddingHorizontal: 0, paddingBottom: spacing.xl },
  sections: { gap: spacing.xl, paddingHorizontal: spacing.screenX, paddingTop: spacing.xl },
});
