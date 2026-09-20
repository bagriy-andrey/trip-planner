import { StyleSheet, View } from "react-native";

import { AppText, GlassSurface, PressableRow } from "@/components";
import { formatDateRange } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";
import { radii, spacing } from "@/lib/theme";

import type { TripCardData } from "../types";

import { TripCoverPlaceholder } from "./TripCoverPlaceholder";
import { TripStatusPill, useTripStatusLabel } from "./TripStatusPill";

export interface TripCardProps {
  trip: TripCardData;
  locale: Locale;
  /** Reference "now" for the relative status label. */
  now: Date;
  /** Dimmed card for finished trips (History). */
  muted?: boolean;
  onPress: () => void;
  testID?: string;
}

/**
 * REPLACEABLE UNIT (spec principle 9): this is the single component that
 * decides how a trip looks in a list. Swapping the card for a "ticket stub" or
 * "timeline" design means replacing this file only; `TripsScreen` and
 * `HistoryScreen` pass the same `TripCardProps` and don't care what is drawn.
 */
export function TripCard({ trip, locale, now, muted = false, onPress, testID }: TripCardProps) {
  const range =
    trip.start !== null && trip.end !== null ? formatDateRange(locale, trip.start, trip.end) : null;
  const status = useTripStatusLabel({ status: trip.status, start: trip.start, locale, now });
  // The card is one accessible element: city, dates and status read as one phrase.
  const spokenLabel = [trip.city, range, status].filter((part) => part !== null).join(", ");
  return (
    <PressableRow
      accessibilityRole="button"
      accessibilityLabel={spokenLabel}
      onPress={onPress}
      testID={testID}
      style={styles.card}
    >
      <TripCoverPlaceholder variant={trip.coverIndex} muted={muted}>
        <GlassSurface style={styles.panel}>
          <AppText variant="title" numberOfLines={1} ellipsizeMode="tail">
            {trip.city}
          </AppText>
          <View style={styles.meta}>
            {range !== null ? (
              <AppText variant="monoSmall" color="textMuted" numberOfLines={1}>
                {range}
              </AppText>
            ) : null}
            <TripStatusPill status={trip.status} start={trip.start} locale={locale} now={now} />
          </View>
        </GlassSurface>
      </TripCoverPlaceholder>
    </PressableRow>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radii.lg, overflow: "hidden" },
  panel: { padding: spacing.md, gap: spacing.xs },
  meta: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    columnGap: spacing.sm,
    rowGap: spacing.xs,
  },
});
