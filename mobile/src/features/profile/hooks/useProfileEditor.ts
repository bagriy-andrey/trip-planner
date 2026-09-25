import { applyCustomCity, applyProfileChoice, EMPTY_PROFILE } from "@tripplanner/shared";
import type { Profile, ProfileField } from "@tripplanner/shared";
import { useCallback, useMemo, useState } from "react";

import type { TripErrorKind } from "../api";
import { customNameOf } from "../pickerItems";
import { overlay } from "./pendingPatches";
import { useProfileQuery } from "./useProfileQuery";
import { useProfileSave } from "./useProfileSave";

export interface ProfileSaveMessage {
  card: "aboutMe" | "settings";
  kind: TripErrorKind;
}

export interface ProfileEditor {
  display: Profile;
  loading: boolean;
  loadError: boolean;
  retry: () => void;
  activeField: ProfileField | null;
  open: (field: ProfileField) => void;
  close: () => void;
  choose: (value: string | null) => void;
  saveError: ProfileSaveMessage | null;
}

/** Controller of the profile screen (S6): the screen only draws what this returns. */
export function useProfileEditor(): ProfileEditor {
  const { profile, isPending, isError, refetch } = useProfileQuery();
  const { queue, lastError, clearError, save } = useProfileSave();
  const [activeField, setActiveField] = useState<ProfileField | null>(null);

  const display = useMemo(() => overlay(profile ?? EMPTY_PROFILE, queue), [profile, queue]);

  const open = useCallback((field: ProfileField) => {
    // Opening while a sheet is already open is a double tap: ignored.
    setActiveField((current) => current ?? field);
  }, []);
  const close = useCallback(() => setActiveField(null), []);

  const choose = useCallback(
    (value: string | null) => {
      if (activeField === null) return;
      // A key of an own city (typed text) is not a directory id: it goes through its own rule.
      const own = activeField === "homeCity" && value !== null ? customNameOf(value) : null;
      const patch = own !== null ? applyCustomCity(display, own) : applyProfileChoice(display, activeField, value);
      setActiveField(null);
      if (patch === null) return;
      clearError();
      save(activeField, patch, display);
    },
    [activeField, display, clearError, save],
  );

  return {
    display,
    loading: profile === undefined && isPending,
    loadError: profile === undefined && isError,
    retry: () => void refetch(),
    activeField,
    open,
    close,
    choose,
    saveError:
      lastError === null
        ? null
        : { card: lastError.field === "homeCurrency" ? "settings" : "aboutMe", kind: lastError.kind },
  };
}
