import { useRouter } from "expo-router";
import { useCallback, useMemo } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import type { ListRenderItem } from "react-native";
import type { Edge } from "react-native-safe-area-context";

import { AppText, Screen } from "@/components";
import {
  TRIP_LIST_WINDOW,
  TripCard,
  TripListStates,
  toTripCardData,
  useTripListStatus,
  useTripsQuery,
} from "@/features/trips";
import type { TripCardData } from "@/features/trips";
import { useToday } from "@/lib/clock";
import { placeLanguageOf, resolveLocale, useTranslation } from "@/lib/i18n";
import { spacing } from "@/lib/theme";

// The tab bar owns the bottom inset.
const TAB_EDGES: readonly Edge[] = ["top", "left", "right"];

const keyOf = (card: TripCardData) => card.id;

/**
 * S5 — history tab: completed AND archived trips, freshest first, on the S4 card with a muted
 * cover. No create button. Same `FlatList` structure and list states as S4.
 */
export function HistoryScreen() {
  const { t, i18n } = useTranslation("history");
  const router = useRouter();
  const locale = resolveLocale([i18n.language]);
  const today = useToday();
  const { trips, history, isError, error, refetch } = useTripsQuery();

  // Nothing here is "upcoming": the accent chip belongs to the active list.
  const cards = useMemo(
    () => history.map((trip) => toTripCardData(trip, { today, upcomingId: null })),
    [history, today, locale],
  );
  const status = useTripListStatus("history", { trips, isError }, cards.length);

  const renderItem = useCallback<ListRenderItem<TripCardData>>(
    ({ item }) => (
      <TripCard
        trip={item}
        locale={locale}
        today={today}
        muted
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
    </View>
  );

  return (
    <Screen scroll={false} edges={TAB_EDGES} testID="history-screen">
      <FlatList
        testID="history-list"
        data={cards}
        keyExtractor={keyOf}
        renderItem={renderItem}
        ListHeaderComponent={header}
        ListEmptyComponent={
          status === "ready" ? null : (
            <TripListStates
              variant="history"
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
