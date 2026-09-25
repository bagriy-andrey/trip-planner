import { useRouter } from "expo-router";
import { pickUpcomingTripId } from "@tripplanner/shared";
import { useCallback, useMemo } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import type { ListRenderItem } from "react-native";
import type { Edge } from "react-native-safe-area-context";

import { AppText, Icon, IconButton, Screen } from "@/components";
import { useToday } from "@/lib/clock";
import { placeLanguageOf, resolveLocale, useTranslation } from "@/lib/i18n";
import { spacing } from "@/lib/theme";

import { TripCard } from "./components/TripCard";
import { TRIP_LIST_WINDOW, TripListStates, useTripListStatus } from "./components/TripListStates";
import { useTripsQuery } from "./hooks/useTripsQuery";
import { toTripCardData } from "./types";
import type { TripCardData } from "./types";

// The tab bar owns the bottom inset.
const TAB_EDGES: readonly Edge[] = ["top", "left", "right"];

const keyOf = (card: TripCardData) => card.id;

/**
 * S4 — trips tab: the user's active trips (nearest first, undated last), "+" in the header -> new-trip modal. One `FlatList`; the header is its `ListHeaderComponent` and the
 * loading / error / empty states are its `ListEmptyComponent`.
 */
export function TripsScreen() {
  const { t, i18n } = useTranslation("trips");
  const router = useRouter();
  const locale = resolveLocale([i18n.language]);
  const today = useToday();
  const { trips, active, isError, error, refetch } = useTripsQuery();

  // "Upcoming" is a property of the LIST: exactly one trip of it gets the accent chip (AC-23).
  const cards = useMemo(() => {
    const upcomingId = pickUpcomingTripId(active);
    return active.map((trip) => toTripCardData(trip, { today, upcomingId }));
  }, [active, today, locale]);
  const status = useTripListStatus("trips", { trips, isError }, cards.length);

  const renderItem = useCallback<ListRenderItem<TripCardData>>(
    ({ item }) => (
      <TripCard
        trip={item}
        locale={locale}
        today={today}
        // An object href: expo-router encodes the param itself, a hostile id stays a param (AC-76).
        onPress={() => router.push({ pathname: "/trips/[tripId]", params: { tripId: item.id } })}
        testID={`trip-card-${item.id}`}
      />
    ),
    [locale, today, router],
  );

  const header = (
    <View style={styles.header}>
      <AppText variant="h1" accessibilityRole="header" style={styles.title}>
        {t("title")}
      </AppText>
      <IconButton
        accessibilityLabel={t("a11y.newTrip")}
        onPress={() => router.push("/trips/new")}
        testID="trips-add"
      >
        <Icon name="plus" color="accent" />
      </IconButton>
    </View>
  );

  return (
    <Screen scroll={false} edges={TAB_EDGES} testID="trips-screen">
      <FlatList
        testID="trips-list"
        data={cards}
        keyExtractor={keyOf}
        renderItem={renderItem}
        ListHeaderComponent={header}
        ListEmptyComponent={
          status === "ready" ? null : (
            <TripListStates
              variant="trips"
              status={status}
              errorKind={error?.kind}
              onRetry={() => void refetch()}
            />
          )
        }
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        {...TRIP_LIST_WINDOW}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.xl },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  title: { flexShrink: 1 },
});
