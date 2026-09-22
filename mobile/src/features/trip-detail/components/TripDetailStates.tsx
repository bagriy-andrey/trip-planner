import { useEffect } from "react";
import { AccessibilityInfo, StyleSheet, View } from "react-native";
import type { ReactNode } from "react";

import { EmptyState, Icon, IconButton, Screen, SecondaryButton } from "@/components";
import type { TripErrorKind } from "@/features/trips";
import { useTranslation } from "@/lib/i18n";
import { layout, radius, spacing, useTheme } from "@/lib/theme";

import { useLeaveToList } from "../hooks/useLeaveToList";

// Flights, hotel, car: one placeholder per block. The count is not data.
const SKELETON_BLOCKS = ["flights", "hotel", "car"] as const;

/** The screen shell of every state without a trip: a back button on top, the state below. */
function StateScreen({ children }: { children: ReactNode }) {
  const { t: tCommon } = useTranslation("common");
  const leave = useLeaveToList();
  return (
    <Screen testID="trip-detail-screen" contentStyle={styles.content}>
      <View style={styles.topRow}>
        <IconButton accessibilityLabel={tCommon("actions.back")} onPress={leave} testID="trip-state-back">
          <Icon name="back" />
        </IconButton>
      </View>
      {children}
    </Screen>
  );
}

/** Loading (AC-71): a hero-shaped placeholder and three block placeholders, no centered spinner. */
export function TripDetailLoading() {
  const { t } = useTranslation("trips");
  const { tokens } = useTheme();
  const block = { backgroundColor: tokens.divider };
  return (
    <StateScreen>
      <View
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={t("list.a11y.loading")}
        accessibilityState={{ busy: true }}
        testID="trip-detail-loading"
        style={styles.skeletons}
      >
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={[styles.heroBlock, block]}
        />
        {SKELETON_BLOCKS.map((key) => (
          <View
            key={key}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={[styles.sectionBlock, block]}
          />
        ))}
      </View>
    </StateScreen>
  );
}

/**
 * One state for a trip that does not exist, is gone, is someone else's or has a malformed id
 * (AC-44, AC-56): the app neither can nor tries to tell them apart, and shows no other trip.
 */
export function TripNotFound() {
  const { t } = useTranslation("tripDetail");
  const leave = useLeaveToList();
  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(t("notFound.title"));
  }, [t]);
  return (
    <StateScreen>
      <View testID="trip-not-found">
        <EmptyState
          title={t("notFound.title")}
          description={t("notFound.text")}
          action={
            <SecondaryButton
              label={t("notFound.action")}
              accessibilityLabel={t("notFound.action")}
              onPress={leave}
              testID="trip-not-found-back"
            />
          }
        />
      </View>
    </StateScreen>
  );
}

export interface TripLoadErrorProps {
  kind: TripErrorKind | null;
  onRetry: () => void;
}

/** A load failure with the explicit "Retry"; the cause is one of the localized `trips:errors.*`. */
export function TripLoadError({ kind, onRetry }: TripLoadErrorProps) {
  const { t } = useTranslation("tripDetail");
  const { t: tTrips } = useTranslation("trips");
  const { t: tCommon } = useTranslation("common");
  const message = tTrips(`errors.${kind === null || kind === "notFound" ? "unknown" : kind}`);
  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(message);
  }, [message]);
  return (
    <StateScreen>
      <View testID="trip-load-error">
        <EmptyState
          title={t("loadError")}
          description={message}
          action={
            <SecondaryButton
              label={tCommon("actions.retry")}
              accessibilityLabel={tCommon("actions.retry")}
              onPress={onRetry}
              testID="trip-load-retry"
            />
          }
        />
      </View>
    </StateScreen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.xl, paddingBottom: spacing.xl },
  topRow: { flexDirection: "row", alignItems: "center" },
  skeletons: { gap: spacing.xl },
  heroBlock: { height: layout.heroHeight, borderRadius: radius.cover },
  sectionBlock: { height: layout.minTouch + spacing.lg * 2, borderRadius: radius.card },
});
