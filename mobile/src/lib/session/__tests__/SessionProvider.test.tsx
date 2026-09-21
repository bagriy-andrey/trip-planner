// Session lifecycle against a controllable stand-in for the backend auth client. The real
// client is never created here: `@/lib/supabase` and `@/lib/storage` are mocked.
import { act, render, screen } from "@testing-library/react-native";
import { AppState, Text } from "react-native";
import type { AppStateStatus } from "react-native";

import type { Session } from "@/lib/supabase";

import { SessionProvider } from "../SessionProvider";
import { useSession } from "../useSession";
import type { SessionContextValue } from "../useSession";

interface AuthMock {
  getSession: jest.Mock;
  onAuthStateChange: jest.Mock;
  startAutoRefresh: jest.Mock;
  stopAutoRefresh: jest.Mock;
  unsubscribe: jest.Mock;
  /** Delivers a backend auth event to the provider's subscription. */
  emit: (event: string, session: Session | null) => void;
  /** Like the real client: on subscribe, report INITIAL_SESSION (null) from a microtask. */
  initialNullOnSubscribe: { current: boolean };
}

interface StorageMock {
  ensureFreshInstallCleared: jest.Mock;
  clearStoredSession: jest.Mock;
  readStoredSessionUser: jest.Mock;
}

jest.mock("@/lib/supabase", () => {
  let listener: ((event: string, session: unknown) => void) | undefined;
  const unsubscribe = jest.fn();
  const initialNullOnSubscribe = { current: false };
  const auth = {
    getSession: jest.fn(),
    initialNullOnSubscribe,
    onAuthStateChange: jest.fn((callback: (event: string, session: unknown) => void) => {
      listener = callback;
      if (initialNullOnSubscribe.current) queueMicrotask(() => callback("INITIAL_SESSION", null));
      return { data: { subscription: { unsubscribe } } };
    }),
    startAutoRefresh: jest.fn(() => Promise.resolve()),
    stopAutoRefresh: jest.fn(() => Promise.resolve()),
    unsubscribe,
    emit: (event: string, session: unknown) => listener?.(event, session),
  };
  return { __esModule: true, supabase: { auth }, __auth: auth };
});

jest.mock("@/lib/storage", () => ({
  __esModule: true,
  ensureFreshInstallCleared: jest.fn(() => Promise.resolve(false)),
  clearStoredSession: jest.fn(() => Promise.resolve()),
  readStoredSessionUser: jest.fn(() => Promise.resolve(null)),
}));

const auth = (jest.requireMock("@/lib/supabase") as { __auth: AuthMock }).__auth;
const storage = jest.requireMock("@/lib/storage") as StorageMock;

function fakeSession(overrides: Partial<Session["user"]> = {}): Session {
  return {
    access_token: "access-token-value",
    refresh_token: "refresh-token-value",
    token_type: "bearer",
    expires_in: 3600,
    user: {
      id: "user-1",
      aud: "authenticated",
      app_metadata: {},
      user_metadata: { display_name: "Anna" },
      created_at: "2026-01-01T00:00:00.000Z",
      email: "anna@example.com",
      ...overrides,
    },
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

let latest: SessionContextValue | undefined;

function Probe() {
  const value = useSession();
  latest = value;
  return (
    <Text testID="probe">
      {value.status}|{value.user?.email ?? "-"}|{String(value.isRoutedAsSignedIn)}
    </Text>
  );
}

const probeText = () => screen.getByTestId("probe").props.children.join("") as string;

function current(): SessionContextValue {
  if (!latest) throw new Error("Probe has not rendered");
  return latest;
}

async function renderProvider() {
  const utils = render(
    <SessionProvider>
      <Probe />
    </SessionProvider>,
  );
  // Let the restore chain (cleanup -> subscribe -> getSession) settle.
  await act(async () => {});
  return utils;
}

/** Captures the AppState "change" handler the provider registers. */
function captureAppState() {
  const remove = jest.fn();
  let handler: ((state: AppStateStatus) => void) | undefined;
  jest.spyOn(AppState, "addEventListener").mockImplementation((_type, callback) => {
    handler = callback;
    return { remove };
  });
  return {
    remove,
    change: (state: AppStateStatus) =>
      act(() => {
        handler?.(state);
      }),
  };
}

const originalAppState = Object.getOwnPropertyDescriptor(AppState, "currentState");

/** `currentState` is a plain data property on the RN mock, so it is redefined, not spied. */
function setCurrentAppState(state: AppStateStatus) {
  Object.defineProperty(AppState, "currentState", { value: state, configurable: true, writable: true });
}

beforeEach(() => {
  latest = undefined;
  jest.clearAllMocks();
  auth.initialNullOnSubscribe.current = false;
  auth.getSession.mockResolvedValue({ data: { session: null }, error: null });
  storage.ensureFreshInstallCleared.mockResolvedValue(false);
  storage.clearStoredSession.mockResolvedValue(undefined);
  storage.readStoredSessionUser.mockResolvedValue(null);
});

afterEach(() => {
  jest.restoreAllMocks();
  if (originalAppState) Object.defineProperty(AppState, "currentState", originalAppState);
});

describe("restoring (AC-2, AC-3, AC-9)", () => {
  it("is `restoring` until the stored session has been read, then signedOut when there is none (AC-3)", async () => {
    const pending = deferred<{ data: { session: Session | null }; error: null }>();
    auth.getSession.mockReturnValue(pending.promise);

    render(
      <SessionProvider>
        <Probe />
      </SessionProvider>,
    );
    await act(async () => {});
    expect(probeText()).toBe("restoring|-|false");

    await act(async () => {
      pending.resolve({ data: { session: null }, error: null });
    });
    expect(probeText()).toBe("signedOut|-|false");
    // Silent: no error is surfaced, nothing to wipe when the store is simply empty.
    expect(storage.clearStoredSession).not.toHaveBeenCalled();
  });

  it("restores a stored session as signedIn with its user", async () => {
    auth.getSession.mockResolvedValue({ data: { session: fakeSession() }, error: null });
    await renderProvider();
    expect(probeText()).toBe("signedIn|anna@example.com|true");
    expect(current().user?.user_metadata).toEqual({ display_name: "Anna" });
  });

  it("clears the fresh-install leftovers BEFORE the session is first read (AC-6)", async () => {
    const order: string[] = [];
    storage.ensureFreshInstallCleared.mockImplementation(async () => {
      order.push("cleanup");
      return true;
    });
    auth.getSession.mockImplementation(async () => {
      order.push("getSession");
      return { data: { session: null }, error: null };
    });
    auth.onAuthStateChange.mockImplementationOnce(() => {
      order.push("subscribe");
      return { data: { subscription: { unsubscribe: auth.unsubscribe } } };
    });
    await renderProvider();
    expect(order).toEqual(["cleanup", "subscribe", "getSession"]);
  });

  it("makes no network call while restoring (AC-9)", async () => {
    const fetchSpy = jest.fn();
    const originalFetch = globalThis.fetch;
    globalThis.fetch = fetchSpy as unknown as typeof fetch;
    try {
      auth.getSession.mockResolvedValue({ data: { session: fakeSession() }, error: null });
      await renderProvider();
    } finally {
      globalThis.fetch = originalFetch;
    }
    expect(fetchSpy).not.toHaveBeenCalled();
    // The only backend call on the restore path is the local session read.
    expect(auth.getSession).toHaveBeenCalledTimes(1);
  });

  it("finishes restoring even when the fresh-install cleanup throws", async () => {
    storage.ensureFreshInstallCleared.mockRejectedValue(new Error("boom"));
    await renderProvider();
    expect(probeText()).toBe("signedOut|-|false");
  });
});

describe("a rejected or unreadable session (AC-3, AC-4)", () => {
  it("goes signedOut and wipes the local remnants when the token refresh is rejected", async () => {
    auth.getSession.mockResolvedValue({
      data: { session: null },
      error: { name: "AuthApiError", message: "Invalid Refresh Token", status: 400 },
    });
    await renderProvider();
    expect(probeText()).toBe("signedOut|-|false");
    expect(storage.clearStoredSession).toHaveBeenCalledTimes(1);
  });

  it("goes signedOut and wipes the remnants when reading the session throws", async () => {
    auth.getSession.mockRejectedValue(new Error("unreadable"));
    await renderProvider();
    expect(probeText()).toBe("signedOut|-|false");
    expect(storage.clearStoredSession).toHaveBeenCalledTimes(1);
  });

  const OFFLINE = { name: "AuthRetryableFetchError", message: "Network request failed", status: 0 };

  it("opens signed in from the stored session when the refresh failed only because the device is offline (AC-9)", async () => {
    // The real client ALSO reports INITIAL_SESSION(null) here; that must not settle the state.
    auth.initialNullOnSubscribe.current = true;
    auth.getSession.mockResolvedValue({ data: { session: null }, error: OFFLINE });
    storage.readStoredSessionUser.mockResolvedValue({ user: fakeSession().user });
    await renderProvider();
    expect(probeText()).toBe("signedIn|anna@example.com|true");
    expect(storage.clearStoredSession).not.toHaveBeenCalled();

    // Back online, the client's own refresh may still be rejected by the server: that ends it.
    act(() => auth.emit("SIGNED_OUT", null));
    expect(probeText()).toBe("signedOut|-|false");
  });

  it("goes signedOut, without wiping anything, when offline and nothing usable is stored", async () => {
    auth.initialNullOnSubscribe.current = true;
    auth.getSession.mockResolvedValue({ data: { session: null }, error: OFFLINE });
    storage.readStoredSessionUser.mockResolvedValue(null);
    await renderProvider();
    expect(probeText()).toBe("signedOut|-|false");
    expect(storage.clearStoredSession).not.toHaveBeenCalled();
  });

  it("an empty store with the client's INITIAL_SESSION(null) still ends signedOut (AC-3)", async () => {
    auth.initialNullOnSubscribe.current = true;
    auth.getSession.mockResolvedValue({ data: { session: null }, error: null });
    await renderProvider();
    expect(probeText()).toBe("signedOut|-|false");
  });

  it("does not trust a stored user that has no id", async () => {
    auth.getSession.mockResolvedValue({ data: { session: null }, error: OFFLINE });
    storage.readStoredSessionUser.mockResolvedValue({ user: { email: "x@y.z" } });
    await renderProvider();
    expect(probeText()).toBe("signedOut|-|false");
  });
});

describe("auth events while running (AC-24)", () => {
  it("goes signedOut when the session ends during use", async () => {
    auth.getSession.mockResolvedValue({ data: { session: fakeSession() }, error: null });
    await renderProvider();
    expect(probeText()).toBe("signedIn|anna@example.com|true");

    act(() => auth.emit("SIGNED_OUT", null));
    expect(probeText()).toBe("signedOut|-|false");
    expect(current().user).toBeNull();
  });

  it("signs in on SIGNED_IN and follows user updates", async () => {
    await renderProvider();
    act(() => auth.emit("SIGNED_IN", fakeSession()));
    expect(probeText()).toBe("signedIn|anna@example.com|true");

    act(() => auth.emit("USER_UPDATED", fakeSession({ email: "new@example.com" })));
    expect(probeText()).toBe("signedIn|new@example.com|true");
  });

  it("ignores a stale getSession result once an event has settled the state", async () => {
    const pending = deferred<{ data: { session: Session | null }; error: null }>();
    auth.getSession.mockReturnValue(pending.promise);
    render(
      <SessionProvider>
        <Probe />
      </SessionProvider>,
    );
    await act(async () => {});
    act(() => auth.emit("SIGNED_OUT", null));
    await act(async () => {
      pending.resolve({ data: { session: fakeSession() }, error: null });
    });
    expect(probeText()).toBe("signedOut|-|false");
  });

  it("unsubscribes on unmount and does not update afterwards", async () => {
    const { unmount } = await renderProvider();
    unmount();
    expect(auth.unsubscribe).toHaveBeenCalledTimes(1);
  });

  it("unsubscribes even when unmounted before the restore finished", async () => {
    const pending = deferred<void>();
    storage.ensureFreshInstallCleared.mockReturnValue(pending.promise);
    const { unmount } = render(
      <SessionProvider>
        <Probe />
      </SessionProvider>,
    );
    unmount();
    await act(async () => {
      pending.resolve();
    });
    expect(auth.onAuthStateChange).not.toHaveBeenCalled();
    expect(auth.getSession).not.toHaveBeenCalled();
  });
});

describe("token auto-refresh follows the foreground (AC-5)", () => {
  it("starts on mount, stops in the background and resumes on return to the foreground", async () => {
    const appState = captureAppState();
    setCurrentAppState("active");
    await renderProvider();
    expect(auth.startAutoRefresh).toHaveBeenCalledTimes(1);

    await appState.change("background");
    expect(auth.stopAutoRefresh).toHaveBeenCalledTimes(1);

    await appState.change("active");
    expect(auth.startAutoRefresh).toHaveBeenCalledTimes(2);

    await appState.change("inactive");
    expect(auth.stopAutoRefresh).toHaveBeenCalledTimes(2);
  });

  it("does not start when the app launches in the background, and stops + detaches on unmount", async () => {
    const appState = captureAppState();
    setCurrentAppState("background");
    const { unmount } = await renderProvider();
    expect(auth.startAutoRefresh).not.toHaveBeenCalled();

    unmount();
    expect(appState.remove).toHaveBeenCalledTimes(1);
    expect(auth.stopAutoRefresh).toHaveBeenCalled();
  });
});

describe("holdGating (recovery-flow contract)", () => {
  it("turns route gating off while held and back on at release, without touching status", async () => {
    auth.getSession.mockResolvedValue({ data: { session: fakeSession() }, error: null });
    await renderProvider();
    expect(current().isRoutedAsSignedIn).toBe(true);

    let release!: () => void;
    act(() => {
      release = current().holdGating();
    });
    expect(probeText()).toBe("signedIn|anna@example.com|false");
    expect(current().status).toBe("signedIn");

    act(() => release());
    expect(probeText()).toBe("signedIn|anna@example.com|true");
  });

  it("covers the recovery session that opens mid-flow: signed out -> hold -> SIGNED_IN -> release", async () => {
    await renderProvider();
    let release!: () => void;
    act(() => {
      release = current().holdGating();
    });
    act(() => auth.emit("SIGNED_IN", fakeSession()));
    // The session exists, yet gating still sees "not signed in" (the form must stay open).
    expect(probeText()).toBe("signedIn|anna@example.com|false");

    act(() => release());
    expect(current().isRoutedAsSignedIn).toBe(true);
  });

  it("is idempotent per release and counts overlapping holds", async () => {
    auth.getSession.mockResolvedValue({ data: { session: fakeSession() }, error: null });
    await renderProvider();
    let first!: () => void;
    let second!: () => void;
    act(() => {
      first = current().holdGating();
      second = current().holdGating();
    });
    act(() => first());
    act(() => first()); // a second call of the same release must not eat the other hold
    expect(current().isRoutedAsSignedIn).toBe(false);
    act(() => second());
    expect(current().isRoutedAsSignedIn).toBe(true);
  });

  it("never lets a signed-out user through, held or not", async () => {
    await renderProvider();
    expect(current().isRoutedAsSignedIn).toBe(false);
    let release!: () => void;
    act(() => {
      release = current().holdGating();
    });
    expect(current().isRoutedAsSignedIn).toBe(false);
    act(() => release());
    expect(current().isRoutedAsSignedIn).toBe(false);
  });

  it("keeps the hold identity stable across renders", async () => {
    await renderProvider();
    const first = current().holdGating;
    act(() => auth.emit("SIGNED_IN", fakeSession()));
    expect(current().holdGating).toBe(first);
  });
});

describe("useSession", () => {
  it("throws outside a provider", () => {
    const spy = jest.spyOn(console, "error").mockImplementation(() => undefined);
    expect(() => render(<Probe />)).toThrow(/SessionProvider/);
    spy.mockRestore();
  });
});
