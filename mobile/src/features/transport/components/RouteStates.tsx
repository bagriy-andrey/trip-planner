import { useEffect } from "react";
import { AccessibilityInfo, StyleSheet, View } from "react-native";

import { EmptyState, Icon, SecondaryButton } from "@/components";
import type { TripErrorKind } from "@/features/trips";
import { useTranslation } from "@/lib/i18n";
import { layout, radius, spacing, useTheme } from "@/lib/theme";

const SKELETON_ROWS = 3;

/** First load (AC-69): chain-shaped placeholders, no centred spinner (mirrors `TripDetailLoading`). */
export function RouteLoading() {
  const { t } = useTranslation("transport");
  const { tokens } = useTheme();
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={t("a11y.chain")}
      accessibilityState={{ busy: true }}
      testID="route-loading"
      style={styles.skeletons}
    >
      {Array.from({ length: SKELETON_ROWS }, (_, index) => (
        <View
          key={index}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={[styles.skeletonRow, { backgroundColor: tokens.divider }]}
        />
      ))}
    </View>
  );
}

export interface RouteLoadErrorProps {
  kind: TripErrorKind | null;
  onRetry: () => void;
}

/** A load failure with an explicit "Retry" (AC-69) — visually distinct from the skeleton above. */
export function RouteLoadError({ kind, onRetry }: RouteLoadErrorProps) {
  const { t: tTrips } = useTranslation("trips");
  const { t: tCommon } = useTranslation("common");
  const message = tTrips(`errors.${kind === null || kind === "notFound" ? "unknown" : kind}`);
  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(message);
  }, [message]);
  return (
    <View testID="route-load-error">
      <EmptyState
        title={tTrips("list.loadError")}
        description={message}
        action={
          <SecondaryButton
            label={tCommon("actions.retry")}
            accessibilityLabel={tCommon("actions.retry")}
            onPress={onRetry}
            testID="route-load-retry"
          />
        }
      />
    </View>
  );
}

/** No segments yet (AC-68): zero warnings by construction — an empty chain has nothing to warn about. */
export function RouteEmpty() {
  const { t } = useTranslation("tripDetail");
  return (
    <View testID="route-empty">
      <EmptyState icon={<Icon name="plane" size="lg" color="textSecondary" />} title={t("empty.flight")} />
    </View>
  );
}

export interface RouteTripNotFoundProps {
  /** Wired by the caller once the screen has a real "back to trips" target (Step 8). */
  onLeave?: () => void;
}

/** The same "Поездка не найдена" state as S7 (AC-70): unknown/foreign/malformed tripId alike. */
export function RouteTripNotFound({ onLeave }: RouteTripNotFoundProps) {
  const { t } = useTranslation("tripDetail");
  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(t("notFound.title"));
  }, [t]);
  return (
    <View testID="route-not-found">
      <EmptyState
        title={t("notFound.title")}
        description={t("notFound.text")}
        action={
          onLeave === undefined ? undefined : (
            <SecondaryButton
              label={t("notFound.action")}
              accessibilityLabel={t("notFound.action")}
              onPress={onLeave}
              testID="route-not-found-back"
            />
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  skeletons: { gap: spacing.lg },
  skeletonRow: { height: layout.minTouch + spacing.lg * 2, borderRadius: radius.card },
});
