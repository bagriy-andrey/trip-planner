// «Sign out» end to end through the REAL route files, root layout, SessionProvider and the real
// `signOut` API module; only the backend auth client is faked (SPEC-02 AC-22, AC-23).
// Gating, not the profile screen, moves the user to /onboarding.
import { router } from "expo-router";
import { act, fireEvent, renderRouter, screen, waitFor } from "expo-router/testing-library";

import { i18n } from "@/lib/i18n";
import type { Session } from "@/lib/supabase";

interface AuthMock {
  getSession: jest.Mock;
  signOut: jest.Mock;
  emit: (event: string, session: Session | null) => void;
}

jest.mock("@/lib/supabase", () => {
  let listener: ((event: string, session: unknown) => void) | undefined;
  const auth = {
    getSession: jest.fn(),
    // Like supabase-js: the local session is dropped (and SIGNED_OUT emitted) whatever the
    // server answered; a failing server surfaces as `{ error }` or a thrown network error.
    signOut: jest.fn(),
    onAuthStateChange: jest.fn((callback: (event: string, session: unknown) => void) => {
      listener = callback;
      return { data: { subscription: { unsubscribe: jest.fn() } } };
    }),
    startAutoRefresh: jest.fn(() => Promise.resolve()),
    stopAutoRefresh: jest.fn(() => Promise.resolve()),
    emit: (event: string, session: unknown) => listener?.(event, session),
  };
  return { __esModule: true, supabase: { auth }, __auth: auth };
});

jest.mock("@/features/profile/api", () => ({
  ...jest.requireActual("@/features/profile/api"),
  getProfile: jest.fn(async () => ({ ok: true, data: jest.requireActual("@tripplanner/shared").EMPTY_PROFILE })),
  saveProfile: jest.fn(),
}));

const auth = (jest.requireMock("@/lib/supabase") as { __auth: AuthMock }).__auth;

const SESSION: Session = {
  access_token: "access-token-value",
  refresh_token: "refresh-token-value",
  token_type: "bearer",
  expires_in: 3600,
  user: {
    id: "user-1",
    aud: "authenticated",
    app_metadata: {},
    user_metadata: { display_name: "Anna Kowalska" },
    created_at: "2026-01-01T00:00:00.000Z",
    email: "anna.kowalska@example.com",
  },
};

let current: ReturnType<typeof renderRouter>;

async function openProfile() {
  auth.getSession.mockResolvedValue({ data: { session: SESSION }, error: null });
  current = renderRouter("./app", { initialUrl: "/profile" });
  await waitFor(() => expect(screen.getByTestId("profile-screen")).toBeOnTheScreen());
}

const endLocalSession = () => auth.emit("SIGNED_OUT", null);

// The API module logs the (expected) failed server call in dev; only that line is muted.
const realWarn = console.warn;
let warnSpy: jest.SpyInstance;

beforeEach(async () => {
  jest.clearAllMocks();
  warnSpy = jest.spyOn(console, "warn").mockImplementation((...args: unknown[]) => {
    if (args[0] === "[auth]") return;
    realWarn(...args);
  });
  await i18n.changeLanguage("en");
});

afterEach(() => {
  warnSpy.mockRestore();
});

describe("«Sign out» on the profile", () => {
  it("shows the account of the session, then ends it and lands on /onboarding with no way back (AC-22, AC-25)", async () => {
    auth.signOut.mockImplementation(async () => {
      endLocalSession();
      return { error: null };
    });
    await openProfile();
    expect(screen.getByTestId("profile-name")).toHaveTextContent("Anna Kowalska");
    expect(screen.getByTestId("profile-email")).toHaveTextContent("anna.kowalska@example.com");

    await act(async () => {
      fireEvent.press(screen.getByRole("button", { name: "Sign out" }));
    });

    expect(auth.signOut).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(current.getPathname()).toBe("/onboarding"));
    expect(screen.getByTestId("onboarding-screen")).toBeOnTheScreen();
    expect(router.canGoBack()).toBe(false);
  });

  it("still signs the user out when the server answers with an error (AC-23)", async () => {
    // First call (global scope) fails; the fallback (`scope: "local"`) drops the session.
    auth.signOut.mockImplementation(async (options?: { scope?: string }) => {
      if (options?.scope === "local") {
        endLocalSession();
        return { error: null };
      }
      return { error: { name: "AuthApiError", message: "server exploded", status: 500 } };
    });
    await openProfile();

    await act(async () => {
      fireEvent.press(screen.getByRole("button", { name: "Sign out" }));
    });

    await waitFor(() => expect(current.getPathname()).toBe("/onboarding"));
    expect(auth.signOut).toHaveBeenCalledWith({ scope: "local" });
    expect(router.canGoBack()).toBe(false);
  });

  it("still signs the user out when there is no network at all (AC-23)", async () => {
    auth.signOut.mockImplementation(async (options?: { scope?: string }) => {
      if (options?.scope === "local") {
        endLocalSession();
        return { error: null };
      }
      throw new TypeError("Network request failed");
    });
    await openProfile();

    await act(async () => {
      fireEvent.press(screen.getByRole("button", { name: "Sign out" }));
    });

    await waitFor(() => expect(current.getPathname()).toBe("/onboarding"));
    expect(screen.getByTestId("onboarding-screen")).toBeOnTheScreen();
  });
});
