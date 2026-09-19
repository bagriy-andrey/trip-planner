import { render, waitFor } from "@testing-library/react-native";
import { useEffect } from "react";
import type { ReactElement, ReactNode } from "react";
import { I18nextProvider } from "react-i18next";
import { SafeAreaProvider } from "react-native-safe-area-context";
import type { EdgeInsets } from "react-native-safe-area-context";

import { i18n } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";
import { ThemeProvider, useTheme } from "@/lib/theme";
import type { ThemePreference } from "@/lib/theme";

export interface RenderWithProvidersOptions {
  /** UI language; defaults to English (deterministic, independent of the mocked device locale). */
  locale?: Locale;
  /** Theme choice; defaults to the product default, "dark". */
  themePreference?: ThemePreference;
  /** Fixed safe-area insets; defaults to an iPhone with a Dynamic Island. */
  insets?: EdgeInsets;
}

const DEFAULT_INSETS: EdgeInsets = { top: 47, right: 0, bottom: 34, left: 0 };

/**
 * Applies the requested preference on mount, like a user picking it in
 * settings, and reports once the provider has finished its initial storage read.
 */
function ApplyThemePreference({
  preference,
  onReady,
  children,
}: {
  preference: ThemePreference;
  onReady: () => void;
  children: ReactNode;
}) {
  const { setPreference, isReady } = useTheme();
  useEffect(() => {
    void setPreference(preference);
  }, [preference, setPreference]);
  useEffect(() => {
    if (isReady) onReady();
  }, [isReady, onReady]);
  return <>{children}</>;
}

/**
 * Async on purpose: ThemeProvider reads the stored preference asynchronously,
 * so we wait for it to settle inside RNTL's act environment. Callers get a
 * fully themed tree and no "not wrapped in act" noise:
 * `await renderWithProviders(<Thing />)`.
 */
export async function renderWithProviders(
  ui: ReactElement,
  options: RenderWithProvidersOptions = {},
) {
  const { locale = "en", themePreference = "dark", insets = DEFAULT_INSETS } = options;
  // A clone per render: switching language here must not leak into other tests
  // through the shared app instance.
  const testI18n = i18n.cloneInstance({ lng: locale });

  let ready = false;
  const markReady = () => {
    ready = true;
  };

  const result = render(
    <SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 390, height: 844 }, insets }}>
      <I18nextProvider i18n={testI18n}>
        <ThemeProvider>
          <ApplyThemePreference preference={themePreference} onReady={markReady}>
            {ui}
          </ApplyThemePreference>
        </ThemeProvider>
      </I18nextProvider>
    </SafeAreaProvider>,
  );

  await waitFor(() => expect(ready).toBe(true));
  return result;
}
