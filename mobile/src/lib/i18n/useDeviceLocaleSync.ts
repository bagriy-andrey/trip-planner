import { useEffect } from "react";
import { AppState } from "react-native";

import { getDeviceLocale, i18n } from "./i18n";

/**
 * Re-reads the device language whenever the app returns to the foreground and
 * switches the UI language if it changed (the user changed the language in
 * iOS Settings while the app was backgrounded).
 */
export function useDeviceLocaleSync(): void {
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active") return;
      const next = getDeviceLocale();
      if (next !== i18n.language) void i18n.changeLanguage(next);
    });
    return () => subscription.remove();
  }, []);
}
