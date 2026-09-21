import { render, waitFor } from "@testing-library/react-native";
import { useEffect } from "react";
import type { ReactElement, ReactNode } from "react";
import { I18nextProvider } from "react-i18next";
import { SafeAreaProvider } from "react-native-safe-area-context";
import type { EdgeInsets } from "react-native-safe-area-context";

import { i18n } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";
import { SessionContext } from "@/lib/session";
import type { SessionContextValue, SessionStatus, SessionUser } from "@/lib/session";
import { ThemeProvider, useTheme } from "@/lib/theme";
import type { ThemePreference } from "@/lib/theme";

/** The session a screen under test sees — no backend client, no mocks of it (see `session`). */
export interface TestSession {
  /** Defaults to "signedIn" when a `user` is given, else "signedOut". */
  status?: SessionStatus;
  /** Only meaningful for `signedIn`; missing fields get fixed fake values. */
  user?: { id?: string; email?: string; displayName?: string | null };
  /** Replace to assert or drive the recovery-flow hold (default: a no-op hold). */
  holdGating?: SessionContextValue["holdGating"];
}

/** A complete fake account; `displayName: null` leaves `display_name` out of the metadata. */
export function makeTestUser({
  id = "user-1",
  email = "anna@example.com",
  displayName = "Anna",
}: NonNullable<TestSession["user"]> = {}): SessionUser {
  return {
    id,
    email,
    aud: "authenticated",
    app_metadata: {},
    user_metadata: displayName === null ? {} : { display_name: displayName },
    created_at: "2026-01-01T00:00:00.000Z",
  };
}

function buildSessionValue(session: TestSession): SessionContextValue {
  const status = session.status ?? (session.user ? "signedIn" : "signedOut");
  const user = status === "signedIn" ? makeTestUser(session.user) : null;
  return {
    status,
    user,
    isRoutedAsSignedIn: status === "signedIn",
    holdGating: session.holdGating ?? (() => () => undefined),
  };
}

export interface RenderWithProvidersOptions {
  /**
   * Static session for screen tests (`{ status: "signedIn" }`, `{ user: { displayName: null } }`,
   * `{ status: "restoring" }`). Defaults to signed out. It replaces `SessionProvider`, so tests
   * never need to mock the backend client just to render a screen.
   */
  session?: TestSession;
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
  const { locale = "en", themePreference = "dark", insets = DEFAULT_INSETS, session = {} } = options;
  const sessionValue = buildSessionValue(session);
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
          <SessionContext.Provider value={sessionValue}>
            <ApplyThemePreference preference={themePreference} onReady={markReady}>
              {ui}
            </ApplyThemePreference>
          </SessionContext.Provider>
        </ThemeProvider>
      </I18nextProvider>
    </SafeAreaProvider>,
  );

  await waitFor(() => expect(ready).toBe(true));
  return result;
}
