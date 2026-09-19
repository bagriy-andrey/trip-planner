import { createContext, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useColorScheme } from "react-native";

import { readSetting, writeSetting } from "@/lib/storage";
import type { WriteResult } from "@/lib/storage";

import {
  DEFAULT_THEME_PREFERENCE,
  THEME_STORAGE_KEY,
  parseThemePreference,
  resolveColorScheme,
} from "./preference";
import type { ColorScheme, ThemePreference } from "./preference";
import { darkTokens, lightTokens } from "./tokens";
import type { ThemeTokens } from "./tokens";

export interface ThemeContextValue {
  tokens: ThemeTokens;
  scheme: ColorScheme;
  preference: ThemePreference;
  /** Applies the choice immediately, then persists it. Never rejects; `ok: false` = not persisted. */
  setPreference: (preference: ThemePreference) => Promise<WriteResult>;
  /** True once the stored choice has been read (or failed to read). */
  isReady: boolean;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(DEFAULT_THEME_PREFERENCE);
  const [isReady, setIsReady] = useState(false);
  // Set once the user picks a theme so a slow initial read can't overwrite it.
  const userChoseRef = useRef(false);
  const systemScheme = useColorScheme();

  useEffect(() => {
    let cancelled = false;
    void readSetting(THEME_STORAGE_KEY).then((raw) => {
      if (cancelled) return;
      const stored = parseThemePreference(raw);
      if (stored !== null && !userChoseRef.current) {
        setPreferenceState(stored);
      }
      setIsReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const setPreference = useCallback(async (next: ThemePreference): Promise<WriteResult> => {
    userChoseRef.current = true;
    setPreferenceState(next);
    return writeSetting(THEME_STORAGE_KEY, next);
  }, []);

  // Derived at render time, not stored.
  const scheme = resolveColorScheme(preference, systemScheme);
  const tokens = scheme === "light" ? lightTokens : darkTokens;

  const value = useMemo<ThemeContextValue>(
    () => ({ tokens, scheme, preference, setPreference, isReady }),
    [tokens, scheme, preference, setPreference, isReady],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
