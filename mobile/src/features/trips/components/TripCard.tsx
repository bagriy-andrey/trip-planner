import { StyleSheet, View } from "react-native";
import type { CalendarDate } from "@tripplanner/shared";

import { AppText, GlassSurface, PressableRow } from "@/components";
import { formatCalendarRange, useTranslation } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";
import { layout, radius, spacing } from "@/lib/theme";

import type { TripCardData } from "../types";

import { TripCoverPlaceholder } from "./TripCoverPlaceholder";
import { TripStatusPill, useTripStatusLabel } from "./TripStatusPill";

export interface TripCardProps {
  trip: TripCardData;
  locale: Locale;
  /** Reference "today" for the relative status label. */
  today: CalendarDate;
  /** History look: the cover backing is desaturated (never the card as a whole). */
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
export function TripCard({ trip, locale, today, muted = false, onPress, testID }: TripCardProps) {
  const { t } = useTranslation("trips");
  const { t: tCommon } = useTranslation("common");
  const range =
    trip.startDate !== null && trip.endDate !== null
      ? formatCalendarRange(locale, trip.startDate, trip.endDate)
      : null;
  const status = useTripStatusLabel({ status: trip.status, startDate: trip.startDate, today });
  // The card is one accessible element: place, status and dates read as one phrase.
  const spokenLabel = t("list.a11y.card", {
    title: trip.placeName,
    status,
    dates: range ?? tCommon("dates.notChosen"),
  });
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
          <AppText variant="cardTitle" numberOfLines={1} ellipsizeMode="tail">
            {trip.placeName}
          </AppText>
          <View style={styles.meta}>
            {range !== null ? (
              // Ticket data: the dates of a card are the one mono text on it (AC-68).
              <AppText variant="monoSmall" color="textSecondary" numberOfLines={1}>
                {range}
              </AppText>
            ) : (
              <AppText variant="small" color="textTertiary" numberOfLines={1}>
                {tCommon("dates.notChosen")}
              </AppText>
            )}
            <TripStatusPill
              status={trip.status}
              startDate={trip.startDate}
              today={today}
              testID={testID === undefined ? undefined : `${testID}-status`}
            />
          </View>
        </GlassSurface>
      </TripCoverPlaceholder>
    </PressableRow>
  );
}

const styles = StyleSheet.create({
  card: { minHeight: layout.coverHeight, borderRadius: radius.cover, overflow: "hidden" },
  panel: { padding: spacing.md, gap: spacing.xs },
  meta: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    columnGap: spacing.sm,
    rowGap: spacing.xs,
  },
});
