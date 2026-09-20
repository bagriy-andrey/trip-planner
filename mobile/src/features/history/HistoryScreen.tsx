import { useRouter } from "expo-router";
import { StyleSheet, View } from "react-native";
import type { Edge } from "react-native-safe-area-context";

import { AppText, AvatarButton, Screen } from "@/components";
import { PLACEHOLDER_NOW, TripCard } from "@/features/trips";
import { resolveLocale, useTranslation } from "@/lib/i18n";
import { spacing } from "@/lib/theme";

import { HISTORY_PLACEHOLDERS } from "./placeholders";

// The tab bar owns the bottom inset.
const TAB_EDGES: readonly Edge[] = ["top", "left", "right"];

/** S5 — history tab: muted, completed sample trips reusing the S4 card. */
export function HistoryScreen() {
  const { t, i18n } = useTranslation("history");
  const { t: tProfile } = useTranslation("profile");
  const { t: tCommon } = useTranslation("common");
  const router = useRouter();
  const locale = resolveLocale([i18n.language]);
  const initial = Array.from(tProfile("namePlaceholder"))[0] ?? "";

  return (
    <Screen edges={TAB_EDGES} testID="history-screen" contentStyle={styles.content}>
      <View style={styles.header}>
        <AppText variant="display" accessibilityRole="header" style={styles.title}>
          {t("title")}
        </AppText>
        <AvatarButton
          initials={initial}
          accessibilityLabel={tCommon("a11y.openProfile")}
          // A tab switch, not a push: Profile keeps a single instance (Q1).
          onPress={() => router.navigate("/profile")}
          testID="history-avatar"
        />
      </View>
      {HISTORY_PLACEHOLDERS.map(({ cityKey, ...trip }) => (
        <TripCard
          key={trip.id}
          trip={{ ...trip, city: t(cityKey) }}
          locale={locale}
          now={PLACEHOLDER_NOW}
          muted
          onPress={() => router.push(`/trips/${trip.id}`)}
          testID={`trip-card-${trip.id}`}
        />
      ))}
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
