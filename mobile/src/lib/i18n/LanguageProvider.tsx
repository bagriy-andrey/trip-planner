import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { AppState } from "react-native";

import { readSetting, writeSetting } from "@/lib/storage";
import type { WriteResult } from "@/lib/storage";

import { getDeviceLocale, i18n } from "./i18n";
import {
  DEFAULT_LANGUAGE_PREFERENCE,
  LANGUAGE_STORAGE_KEY,
  parseLanguagePreference,
  resolveLanguage,
} from "./languagePreference";
import type { LanguagePreference } from "./languagePreference";

export interface LanguageContextValue {
  preference: LanguagePreference;
  /** Applies the choice at once, then persists it. Never rejects; `ok: false` = not persisted. */
  setPreference: (preference: LanguagePreference) => Promise<WriteResult>;
  /** True once the stored choice has been read (or failed to read). */
  isReady: boolean;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

function applyPreference(preference: LanguagePreference): void {
  const next = resolveLanguage(preference, getDeviceLocale());
  if (next !== i18n.language) void i18n.changeLanguage(next);
}

/**
 * Owns the UI language: the stored choice (device-local) wins; with "system" the device language is
 * re-read whenever the app returns to the foreground (the user may change it in system settings).
 */
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<LanguagePreference>(DEFAULT_LANGUAGE_PREFERENCE);
  const [isReady, setIsReady] = useState(false);
  const preferenceRef = useRef(preference);
  // Set once the user picks a language so a slow initial read can't overwrite it.
  const userChoseRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    void readSetting(LANGUAGE_STORAGE_KEY).then((raw) => {
      if (cancelled) return;
      const stored = parseLanguagePreference(raw);
      if (stored !== null && !userChoseRef.current) {
        preferenceRef.current = stored;
        setPreferenceState(stored);
        applyPreference(stored);
      }
      setIsReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") applyPreference(preferenceRef.current);
    });
    return () => subscription.remove();
  }, []);

  const setPreference = useCallback(async (next: LanguagePreference): Promise<WriteResult> => {
    userChoseRef.current = true;
    preferenceRef.current = next;
    setPreferenceState(next);
    applyPreference(next);
    return writeSetting(LANGUAGE_STORAGE_KEY, next);
  }, []);

  const value = useMemo<LanguageContextValue>(
    () => ({ preference, setPreference, isReady }),
    [preference, setPreference, isReady],
  );
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguagePreference(): LanguageContextValue {
  const value = useContext(LanguageContext);
  if (value === null) throw new Error("useLanguagePreference must be used inside <LanguageProvider>");
  return value;
}
