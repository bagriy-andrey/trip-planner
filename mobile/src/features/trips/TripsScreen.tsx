import { useRouter } from "expo-router";
import { StyleSheet, View } from "react-native";
import type { Edge } from "react-native-safe-area-context";

import { AppText, AvatarButton, Screen } from "@/components";
import { resolveLocale, useTranslation } from "@/lib/i18n";
import { spacing } from "@/lib/theme";
import { CURRENT_TRIPS, MOCK_NOW, MOCK_USER } from "@/mocks";

import { FloatingAddButton } from "./components/FloatingAddButton";
import { TripCard } from "./components/TripCard";

// The tab bar owns the bottom inset.
const TAB_EDGES: readonly Edge[] = ["top", "left", "right"];

/** S4 — trips tab: mock trip cards, avatar -> profile tab, "+" -> new-trip modal. */
export function TripsScreen() {
  const { t, i18n } = useTranslation("trips");
  const { t: tCommon } = useTranslation("common");
  const router = useRouter();
  const locale = resolveLocale([i18n.language]);
  const initial = Array.from(MOCK_USER.name)[0] ?? "";

  return (
    <View style={styles.root}>
      <Screen edges={TAB_EDGES} testID="trips-screen" contentStyle={styles.content}>
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
        {CURRENT_TRIPS.map(({ cityKey, ...trip }) => (
          <TripCard
            key={trip.id}
            trip={{ ...trip, city: t(cityKey) }}
            locale={locale}
            now={MOCK_NOW}
            onPress={() => router.push(`/trips/${trip.id}`)}
            testID={`trip-card-${trip.id}`}
          />
        ))}
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
