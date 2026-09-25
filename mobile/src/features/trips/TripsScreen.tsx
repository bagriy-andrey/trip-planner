import { useRouter } from "expo-router";
import { pickUpcomingTripId } from "@tripplanner/shared";
import { useCallback, useMemo } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import type { ListRenderItem } from "react-native";
import type { Edge } from "react-native-safe-area-context";

import { AppText, AvatarButton, Screen } from "@/components";
import { useToday } from "@/lib/clock";
import { placeLanguageOf, resolveLocale, useTranslation } from "@/lib/i18n";
import { displayNameOf, initialOf, useSession } from "@/lib/session";
import { spacing } from "@/lib/theme";

import { FloatingAddButton } from "./components/FloatingAddButton";
import { TripCard } from "./components/TripCard";
import { TRIP_LIST_WINDOW, TripListStates, useTripListStatus } from "./components/TripListStates";
import { useTripsQuery } from "./hooks/useTripsQuery";
import { toTripCardData } from "./types";
import type { TripCardData } from "./types";

// The tab bar owns the bottom inset.
const TAB_EDGES: readonly Edge[] = ["top", "left", "right"];

const keyOf = (card: TripCardData) => card.id;

/**
 * S4 — trips tab: the user's active trips (nearest first, undated last), avatar -> profile tab,
 * "+" -> new-trip modal. One `FlatList`; the header is its `ListHeaderComponent` and the
 * loading / error / empty states are its `ListEmptyComponent`.
 */
export function TripsScreen() {
  const { t, i18n } = useTranslation("trips");
  const { t: tCommon } = useTranslation("common");
  const router = useRouter();
  const locale = resolveLocale([i18n.language]);
  const today = useToday();
  const { user } = useSession();
  // The same name, hence the same initial, as on the profile (AC-27).
  const initial = initialOf(displayNameOf(user));
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
      <AvatarButton
        initials={initial}
        accessibilityLabel={tCommon("a11y.openProfile")}
        // A tab switch, not a push: Profile keeps a single instance (Q1).
        onPress={() => router.navigate("/profile")}
        testID="trips-avatar"
      />
    </View>
  );

  return (
    <View style={styles.root}>
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
      <FloatingAddButton
        accessibilityLabel={t("a11y.newTrip")}
        onPress={() => router.push("/trips/new")}
        style={styles.fab}
        testID="trips-add"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  // Bottom padding keeps the last card clear of the floating button.
  content: { gap: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.xxl * 3 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  title: { flexShrink: 1 },
  fab: { position: "absolute", right: spacing.screenX, bottom: spacing.xl },
});
