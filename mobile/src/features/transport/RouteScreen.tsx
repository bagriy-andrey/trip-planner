import { StyleSheet, View } from "react-native";
import { resolveDestinationName } from "@tripplanner/shared";
import type { RouteView } from "@tripplanner/shared";
import type { ReactNode } from "react";

import { AppText, Icon, IconButton, Screen } from "@/components";
import { useTripQuery } from "@/features/trips";
import { resolveLocale, useTranslation } from "@/lib/i18n";
import { layout, spacing, useTheme } from "@/lib/theme";

import { NotClosedCard } from "./components/NotClosedCard";
import { RouteChain } from "./components/RouteChain";
import { RouteEmpty, RouteLoadError, RouteLoading, RouteTripNotFound } from "./components/RouteStates";
import { useRouteView } from "./hooks/useRouteView";
import { useSegmentsQuery } from "./hooks/useSegmentsQuery";

export interface RouteScreenProps {
  tripId: string;
  onBack: () => void;
  onAddSegment: () => void;
  /** Reports the tapped segment's id (chain card tap); the edit destination is Step 9's. */
  onSegmentPress: (segmentId: string) => void;
  /** The "not closed" card's button; the segment form (Step 9) prefills "from" with `openAt`. */
  onAddFromNotClosed: (openAt: NonNullable<RouteView["openAt"]>) => void;
}

/**
 * S13 — the whole route as one chain (design/screens/route.md). Thin: state comes from
 * `useTripQuery` + `useSegmentsQuery` + `useRouteView`, rendering from the `RouteView` they
 * produce. Navigation targets (segment form, "back to trips") are the CALLER's — Step 8 wires the
 * real router once `/trips/[tripId]/route` exists; this screen only reports intent through its
 * callback props (same shape as `TripDetailScreen`'s own thin/state split).
 */
export function RouteScreen({
  tripId,
  onBack,
  onAddSegment,
  onSegmentPress,
  onAddFromNotClosed,
}: RouteScreenProps) {
  const { t, i18n } = useTranslation("transport");
  const { t: tCommon } = useTranslation("common");
  const { t: tTripDetail } = useTranslation("tripDetail");
  const { tokens } = useTheme();
  const locale = resolveLocale([i18n.language]);

  const tripQuery = useTripQuery(tripId);
  const segmentsQuery = useSegmentsQuery(tripId);
  const route = useRouteView(segmentsQuery.segments, tripQuery.trip);

  const cityName = tripQuery.trip === undefined ? "" : resolveDestinationName(tripQuery.trip, locale);

  let body: ReactNode;
  if (tripQuery.isError && tripQuery.error?.kind === "notFound") {
    body = <RouteTripNotFound onLeave={onBack} />;
  } else if (tripQuery.trip === undefined) {
    body = tripQuery.isError ? (
      <RouteLoadError kind={tripQuery.error?.kind ?? null} onRetry={() => void tripQuery.refetch()} />
    ) : (
      <RouteLoading />
    );
  } else if (segmentsQuery.segments === undefined) {
    body = segmentsQuery.isError ? (
      <RouteLoadError kind={segmentsQuery.error?.kind ?? null} onRetry={() => void segmentsQuery.refetch()} />
    ) : (
      <RouteLoading />
    );
  } else if (route === undefined || route.chain.length === 0) {
    body = <RouteEmpty />;
  } else {
    body = (
      <View style={styles.content}>
        <RouteChain route={route} locale={locale} onSegmentPress={onSegmentPress} testID="route-chain" />
        {route.closed || route.openAt === undefined ? null : (
          <NotClosedCard
            openAt={route.openAt}
            locale={locale}
            onAddFlight={onAddFromNotClosed}
            testID="route-not-closed"
          />
        )}
      </View>
    );
  }

  return (
    <Screen testID="route-screen" contentStyle={styles.screen}>
      <View style={[styles.header, { borderBottomColor: tokens.divider }]}>
        <View style={styles.headerSide}>
          <IconButton accessibilityLabel={tCommon("actions.back")} onPress={onBack} testID="route-back">
            <Icon name="back" />
          </IconButton>
          <AppText variant="cardTitle" numberOfLines={1} style={styles.headerCity}>
            {cityName}
          </AppText>
        </View>
        <AppText variant="h2" accessibilityRole="header" style={styles.headerTitle}>
          {t("screen.title")}
        </AppText>
        <IconButton accessibilityLabel={tTripDetail("a11y.addFlight")} onPress={onAddSegment} testID="route-add">
          <Icon name="plus" />
        </IconButton>
      </View>
      {body}
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { paddingBottom: spacing.xl },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    minHeight: layout.minTouch,
    paddingBottom: spacing.md,
    borderBottomWidth: layout.borderWidth,
  },
  headerSide: { flexDirection: "row", alignItems: "center", gap: spacing.sm, flex: 1 },
  headerCity: { flexShrink: 1 },
  headerTitle: { flexShrink: 0 },
  content: { gap: spacing.xl, paddingTop: spacing.lg },
});
