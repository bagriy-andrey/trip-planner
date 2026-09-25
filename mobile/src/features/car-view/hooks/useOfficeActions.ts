import { useCallback, useState } from "react";
import { Linking } from "react-native";
import { parseMapsUrl, telHref } from "@tripplanner/shared";
import type { Car } from "@tripplanner/shared";

export type OfficeError = "openFailed" | "callFailed" | null;

export interface OfficeActions {
  error: OfficeError;
  openRoute: () => Promise<void>;
  call: () => Promise<void>;
}

/** "Directions" re-checks the stored link (AC-46); "Call" uses `telHref` from shared (AC-47). No logging. */
export function useOfficeActions(car: Pick<Car, "mapsUrl" | "phone">): OfficeActions {
  const [error, setError] = useState<OfficeError>(null);
  const { mapsUrl, phone } = car;

  const openRoute = useCallback(async () => {
    setError(null);
    try {
      const parsed = parseMapsUrl(mapsUrl);
      if (!parsed.ok) {
        setError("openFailed");
        return;
      }
      await Linking.openURL(parsed.url);
    } catch {
      setError("openFailed");
    }
  }, [mapsUrl]);

  const call = useCallback(async () => {
    setError(null);
    try {
      const href = telHref(phone);
      if (href === null) {
        setError("callFailed");
        return;
      }
      await Linking.openURL(href);
    } catch {
      setError("callFailed");
    }
  }, [phone]);

  return { error, openRoute, call };
}
