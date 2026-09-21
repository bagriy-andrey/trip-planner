import { useEffect, useRef } from "react";
import { AccessibilityInfo, StyleSheet, View } from "react-native";

import { AppText, EmptyState, SecondaryButton } from "@/components";
import { useTranslation } from "@/lib/i18n";
import { spacing } from "@/lib/theme";

import type { TripErrorKind } from "../api";

import { TripCardSkeleton } from "./TripCardSkeleton";

/** The two lists share one set of states; only the copy differs. */
export type TripListVariant = "trips" | "history";

/** What the list body shows: skeletons, the error block, the empty block, or the trips. */
export type TripListStatus = "loading" | "error" | "empty" | "ready";

// Enough to fill a phone screen; the count is not data.
const SKELETON_COUNT = 3;

/**
 * Windowing for both lists: a few dozen trips is the design point (SPEC-03 Non-functional), but
 * `FlatList` mounts only a window of the cards, so 200 render as cheaply as 20.
 */
export const TRIP_LIST_WINDOW = {
  initialNumToRender: 6,
  maxToRenderPerBatch: 6,
  windowSize: 7,
} as const;

interface ListQueryState {
  /** The loaded list; `undefined` until the first success. */
  trips: readonly unknown[] | undefined;
  isError: boolean;
}

/**
 * Loading, error and empty are three different screens (AC-39..AC-41): an error is never shown as
 * "no trips", and "no data yet" is never shown as an empty list. A failed REFETCH with data
 * already on screen keeps the data.
 */
export function tripListStatus({ trips, isError }: ListQueryState, count: number): TripListStatus {
  if (trips === undefined) return isError ? "error" : "loading";
  return count === 0 ? "empty" : "ready";
}

/**
 * The status of a list plus its announcement (AC-71): when the state settles (loaded / empty /
 * error) it is spoken once, not only redrawn. Later count changes in the same status (a trip
 * archived from the details) stay silent — the menu action announces its own result.
 */
export function useTripListStatus(
  variant: TripListVariant,
  query: ListQueryState,
  count: number,
): TripListStatus {
  const { t: tTrips } = useTranslation("trips");
  const { t: tHistory } = useTranslation("history");
  const status = tripListStatus(query, count);
  const announced = useRef<TripListStatus | null>(null);

  useEffect(() => {
    if (announced.current === status) return;
    announced.current = status;
    if (status === "loading") return;
    const message =
      variant === "trips"
        ? status === "ready"
          ? tTrips("list.announce.loaded", { count })
          : tTrips(`list.announce.${status}`)
        : status === "ready"
          ? tHistory("announce.loaded", { count })
          : tHistory(`announce.${status}`);
    AccessibilityInfo.announceForAccessibility(message);
  }, [status, variant, count, tTrips, tHistory]);

  return status;
}

export interface TripListStatesProps {
  variant: TripListVariant;
  /** Anything but `ready`; a `ready` list renders no state. */
  status: Exclude<TripListStatus, "ready">;
  /** Why the load failed, for the error text; `null`/unknown falls back to the generic one. */
  errorKind?: TripErrorKind | null;
  /** The explicit "Retry": re-requests the list. */
  onRetry: () => void;
}

/** A load failure the user can act on; `notFound` has no meaning for a list, so it is generic. */
function errorMessageKey(kind: TripErrorKind | null | undefined) {
  return kind === "offline" || kind === "timeout" || kind === "denied" ? kind : "unknown";
}

/** Body of a list that has no trips to show: skeletons, an error with "Retry", or an empty note. */
export function TripListStates({ variant, status, errorKind, onRetry }: TripListStatesProps) {
  const { t: tTrips } = useTranslation("trips");
  const { t: tHistory } = useTranslation("history");
  const { t: tCommon } = useTranslation("common");

  if (status === "loading") {
    return (
      <View
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={variant === "trips" ? tTrips("list.a11y.loading") : tHistory("a11y.loading")}
        accessibilityState={{ busy: true }}
        testID={`${variant}-loading`}
        style={styles.skeletons}
      >
        {Array.from({ length: SKELETON_COUNT }, (_, index) => (
          <TripCardSkeleton key={index} testID={`${variant}-skeleton`} />
        ))}
      </View>
    );
  }

  if (status === "error") {
    return (
      <View testID={`${variant}-error`}>
        <EmptyState
          title={variant === "trips" ? tTrips("list.loadError") : tHistory("loadError")}
          description={tTrips(`errors.${errorMessageKey(errorKind)}`)}
          action={
            <SecondaryButton
              label={tCommon("actions.retry")}
              accessibilityLabel={tCommon("actions.retry")}
              onPress={onRetry}
              testID={`${variant}-retry`}
            />
          }
        />
      </View>
    );
  }

  // Two independent empty states (AC-40): S4 points at the "+", S5 is one line and has no button.
  if (variant === "trips") {
    return (
      <View testID="trips-empty">
        <EmptyState title={tTrips("list.emptyTitle")} description={tTrips("list.emptyHint")} />
      </View>
    );
  }
  return (
    <View testID="history-empty" style={styles.historyEmpty}>
      <AppText color="textSecondary" style={styles.centered}>
        {tHistory("empty")}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  skeletons: { gap: spacing.lg },
  historyEmpty: { padding: spacing.xl },
  centered: { textAlign: "center" },
});
