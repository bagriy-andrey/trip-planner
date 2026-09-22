import { deriveTripStatus } from "@tripplanner/shared";
import type { Trip } from "@tripplanner/shared";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo } from "react-native";

import { TripApiError, useArchiveTrip, useDeleteTrip, useUnarchiveTrip } from "@/features/trips";
import { useToday } from "@/lib/clock";
import { useTranslation } from "@/lib/i18n";

import { useLeaveToList } from "./useLeaveToList";

/** What the on-screen sheet shows: nothing, the "…" menu, or the delete confirmation. */
export type TripSheet = "closed" | "menu" | "confirmDelete";

/** The `trips:errors.*` message a failed action shows; `notFound` is handled separately. */
export type ActionErrorKind = "offline" | "timeout" | "denied" | "unknown";

export interface TripActions {
  sheet: TripSheet;
  /** The trip is archived: the only state that offers "Delete permanently" (AC-47). */
  archived: boolean;
  /** An action is in flight: presses are ignored and the button shows a spinner. */
  busy: boolean;
  /** Localized text of the last failure, shown on the screen next to the action (AC-58). */
  errorMessage: string | null;
  openMenu: () => void;
  closeSheet: () => void;
  edit: () => void;
  archive: () => void;
  unarchive: () => void;
  askDelete: () => void;
  confirmDelete: () => void;
}

/**
 * All logic of the "…" menu (S7): which sheet is open, the archive / restore / delete requests
 * and what happens after them. The screen only renders what this returns.
 *
 * Every action is single-flight through a ref (two taps in the same frame both see `busy ===
 * false`), never optimistic and never sent for a state where it must not exist: delete is
 * refused unless the trip is archived, whatever the UI did (AC-47).
 */
export function useTripActions(trip: Trip, refetch: () => Promise<unknown>): TripActions {
  const { t } = useTranslation("tripDetail");
  const { t: tTrips } = useTranslation("trips");
  const router = useRouter();
  const today = useToday();
  const leaveToList = useLeaveToList();
  const archiveTrip = useArchiveTrip();
  const unarchiveTrip = useUnarchiveTrip();
  const deleteTrip = useDeleteTrip();

  const [sheet, setSheet] = useState<TripSheet>("closed");
  const [busy, setBusy] = useState(false);
  const [errorKind, setErrorKind] = useState<ActionErrorKind | null>(null);
  const inFlight = useRef(false);

  const archived = deriveTripStatus(trip, today) === "archived";
  const errorMessage = errorKind === null ? null : tTrips(`errors.${errorKind}`);

  // A failure is spoken when it appears (AC-58); the message itself sits in the sheet.
  useEffect(() => {
    if (errorMessage !== null) AccessibilityInfo.announceForAccessibility(errorMessage);
  }, [errorMessage]);

  const run = async (request: () => Promise<unknown>, onDone: () => void) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setErrorKind(null);
    try {
      await request();
      onDone();
    } catch (error) {
      const kind = error instanceof TripApiError ? error.kind : "unknown";
      if (kind === "notFound") {
        // Gone in the meantime: the screen switches to "Trip not found" by itself (AC-44).
        setSheet("closed");
        void refetch();
      } else {
        setErrorKind(kind);
      }
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };

  const finish = (announcement: string) => {
    setSheet("closed");
    AccessibilityInfo.announceForAccessibility(announcement);
  };

  return {
    sheet,
    archived,
    busy,
    errorMessage,
    openMenu: () => {
      setErrorKind(null);
      setSheet("menu");
    },
    closeSheet: () => {
      if (inFlight.current) return;
      setErrorKind(null);
      setSheet("closed");
    },
    edit: () => {
      setSheet("closed");
      router.push({ pathname: "/trips/[tripId]/edit", params: { tripId: trip.id } });
    },
    // The details stay open and working: the query refetches and the status chip follows (AC-52).
    // "Restore" places the trip by its dates, not by where it lay before (AC-53): the status is
    // derived from the refreshed trip, nothing is remembered.
    archive: () => void run(() => archiveTrip.mutateAsync(trip.id), () => finish(t("announce.archived"))),
    unarchive: () =>
      void run(() => unarchiveTrip.mutateAsync(trip.id), () => finish(t("announce.unarchived"))),
    askDelete: () => {
      if (!archived) return;
      setErrorKind(null);
      setSheet("confirmDelete");
    },
    confirmDelete: () => {
      if (!archived || sheet !== "confirmDelete") return;
      void run(
        () => deleteTrip.mutateAsync(trip.id),
        () => {
          finish(t("announce.deleted"));
          leaveToList();
        },
      );
    },
  };
}
