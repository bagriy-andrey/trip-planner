// Navigation topology (PLAN-01 §1.2, Step 9: SPEC-01 AC-1, 6, 8, 9, 10, 13), route gating
// by session (PLAN-02 Step 7: SPEC-02 AC-1, 20, 21, 24) and the trips routes (PLAN-03 Step 11:
// SPEC-03 AC-30, 44, 62, 75, 76). Runs the REAL route files and layouts through expo-router's
// in-memory navigator (`renderRouter`).
//
// The session is set by mocking the backend auth client (`@/lib/supabase`), never by tapping
// «Sign in»: the real SessionProvider, shell and `Stack.Protected` gating run on top of it.
// Trips data comes from a MOCKED api layer (`@/features/trips/api`) backed by an in-memory store.
//
// Lives in `mobile/__tests__/`, not `mobile/app/__tests__/` as the plan says: expo-router
// treats every file under `app/` as a route (its require.context matches any `.tsx`), so a
// test there would ship in the bundle as a route (see routes.contract.test.ts).
import { router } from "expo-router";
import { act, fireEvent, renderRouter, screen, waitFor, within } from "expo-router/testing-library";
import * as SplashScreen from "expo-splash-screen";
import { Text } from "react-native";

import * as RootLayout from "../app/_layout";
import * as IndexRoute from "../app/index";
import * as OnboardingRoute from "../app/onboarding";
import * as TabsLayout from "../app/(tabs)/_layout";
import * as TripsTab from "../app/(tabs)/trips";
import * as TermsRoute from "../app/legal/terms";
import { i18n } from "@/lib/i18n";
import type { Session } from "@/lib/supabase";
import type { Trip } from "@tripplanner/shared";

import { createTrip, getTrip, listTrips, updateTrip } from "@/features/trips/api";

interface AuthMock {
  getSession: jest.Mock;
  emit: (event: string, session: Session | null) => void;
}

jest.mock("@/lib/supabase", () => {
  let listener: ((event: string, session: unknown) => void) | undefined;
  const auth = {
    getSession: jest.fn(),
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

jest.mock("@/features/trips/api", () => ({
  ...jest.requireActual("@/features/trips/api"),
  listTrips: jest.fn(),
  getTrip: jest.fn(),
  createTrip: jest.fn(),
  updateTrip: jest.fn(),
}));

const auth = (jest.requireMock("@/lib/supabase") as { __auth: AuthMock }).__auth;
const listTripsMock = listTrips as jest.Mock;
const getTripMock = getTrip as jest.Mock;
const createTripMock = createTrip as jest.Mock;
const updateTripMock = updateTrip as jest.Mock;

function makeTrip(overrides: Partial<Trip> & Pick<Trip, "id" | "destination">): Trip {
  return {
    place: { kind: "custom" },
    title: null,
    startDate: null,
    endDate: null,
    archivedAt: null,
    createdAt: "2026-09-01T10:00:00.000Z",
    updatedAt: "2026-09-01T10:00:00.000Z",
    ...overrides,
  };
}

// An open draft (Trips tab) and an archived trip (History tab): neither depends on today's date.
const LISBON = makeTrip({ id: "trip-lisbon", destination: "Lisbon" });
const ROME = makeTrip({ id: "trip-rome", destination: "Rome", archivedAt: "2026-08-01T10:00:00.000Z" });

/** The "server": what the mocked api answers. Reset before every test. */
let store: Trip[] = [];

function resetApi() {
  store = [LISBON, ROME];
  listTripsMock.mockImplementation(async () => ({ ok: true, data: [...store] }));
  getTripMock.mockImplementation(async (id: string) => {
    const found = store.find((trip) => trip.id === id);
    return found === undefined ? { ok: false, kind: "notFound" } : { ok: true, data: found };
  });
  createTripMock.mockImplementation(async (form: { destination: string }) => {
    const created = makeTrip({ id: "trip-new", destination: form.destination });
    store = [created, ...store];
    return { ok: true, data: created };
  });
  updateTripMock.mockImplementation(async (id: string, form: { destination: string }) => {
    store = store.map((trip) => (trip.id === id ? { ...trip, destination: form.destination } : trip));
    return { ok: true, data: store.find((trip) => trip.id === id) };
  });
}

const SESSION: Session = {
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
  },
};

/** What the backend client's stored-session read answers on the next launch. */
function storedSession(session: Session | null) {
  auth.getSession.mockResolvedValue({ data: { session }, error: null });
}

interface NavState {
  routes: readonly { name: string; params?: object; state?: NavState }[];
}

/**
 * Names of the routes in the app's root stack, e.g. ["onboarding"] or
 * ["(tabs)", "trips/[tripId]/index"]. expo-router wraps the app in a synthetic `__root` route.
 */
function rootRouteNames(state: NavState | undefined): string[] {
  const stack = state?.routes[0]?.state;
  return (stack?.routes ?? []).map((route) => route.name);
}

// `expect(screen).toHavePathname` exists at runtime but expo-router ships no typings for it,
// so assertions go through the `getPathname()` of the last `renderRouter` result.
let current: ReturnType<typeof renderRouter>;

const expectPath = (pathname: string) => waitFor(() => expect(current.getPathname()).toBe(pathname));

type Launch = { session: Session | null };

async function renderApp(initialUrl = "/", { session }: Launch = { session: null }) {
  storedSession(session);
  const utils = renderRouter("./app", { initialUrl });
  current = utils;
  // ThemeProvider and SessionProvider read storage asynchronously and the root layout renders
  // nothing until that (and fonts) are ready, so the first screen appears a few ticks later.
  await waitFor(() => expect(screen.getByTestId(/-screen$/)).toBeOnTheScreen());
  return utils;
}

/** Cold start at a trip's details; waits until the trip itself (not its loading state) is shown. */
async function renderDetails(tripId: string) {
  await renderApp(`/trips/${tripId}`, signedIn);
  await waitFor(() => expect(screen.getByTestId("trip-hero")).toBeOnTheScreen());
}

/** The top entry of the root stack: route NAME and params, as the router state holds them. */
function topRoute() {
  const stack = current.getRouterState()?.routes[0]?.state?.routes ?? [];
  const top = stack[stack.length - 1];
  // React Navigation types params as a bare `object`; read the entry without a cast.
  return { name: top?.name, params: Object.fromEntries(Object.entries(top?.params ?? {})) };
}

/** Cold start with a stored session at `/`: lands on the tabs (AC-1). */
const signedIn = { session: SESSION };
const signedOut = { session: null };

const tab = (name: string) => screen.getByRole("button", { name });
const queryTab = (name: string) => screen.queryByRole("button", { name });

/** The session ends while the app runs (revoked, refresh rejected, signed out elsewhere). */
async function endSession() {
  await act(async () => {
    auth.emit("SIGNED_OUT", null);
  });
}

// The layout already declares `reset-password` (gated), but its route file arrives with PLAN-02
// Step 8; until then expo-router warns once per render. Only that message is muted here.
const realWarn = console.warn;
let warnSpy: jest.SpyInstance;

beforeEach(async () => {
  jest.clearAllMocks();
  resetApi();
  warnSpy = jest.spyOn(console, "warn").mockImplementation((...args: unknown[]) => {
    if (typeof args[0] === "string" && args[0].includes('No route named "reset-password"')) return;
    realWarn(...args);
  });
  // Deterministic English strings regardless of what an earlier test switched to.
  await i18n.changeLanguage("en");
});

afterEach(() => {
  warnSpy.mockRestore();
});

describe("start route by session (SPEC-02 AC-1)", () => {
  it("without a session a cold start lands on /onboarding (via the / redirect)", async () => {
    const { getPathname } = await renderApp("/", signedOut);
    expect(getPathname()).toBe("/onboarding");
    expect(screen.getByTestId("onboarding-screen")).toBeOnTheScreen();
  });

  it("with a session a cold start lands on /trips, with no other screen in the stack", async () => {
    const { getPathname, getRouterState } = await renderApp("/", signedIn);
    expect(getPathname()).toBe("/trips");
    expect(screen.getByTestId("trips-screen")).toBeOnTheScreen();
    expect(screen.queryByTestId("onboarding-screen")).not.toBeOnTheScreen();
    // No flash: onboarding was never mounted underneath, the stack is just the tabs.
    expect(rootRouteNames(getRouterState())).toEqual(["(tabs)"]);
  });

  it("an unknown URL falls back to onboarding without a session and to /trips with one", async () => {
    await renderApp("/this/route/does/not/exist", signedOut);
    expect(current.getPathname()).toBe("/onboarding");
  });

  it("an unknown URL falls back to /trips with a session", async () => {
    await renderApp("/this/route/does/not/exist", signedIn);
    expect(current.getPathname()).toBe("/trips");
  });
});

describe("splash and shell while restoring (SPEC-02 AC-2)", () => {
  it("renders no screen and keeps the splash until the stored session has been read", async () => {
    let resolve!: (value: { data: { session: Session | null }; error: null }) => void;
    auth.getSession.mockReturnValue(
      new Promise((res) => {
        resolve = res;
      }),
    );
    current = renderRouter("./app", { initialUrl: "/" });
    // Let fonts, the theme read and the restore chain run until only the session read is pending
    // (expo-router's test renderer uses fake timers, so flush microtasks rather than sleeping).
    for (let tick = 0; tick < 20; tick += 1) {
      await act(async () => {});
    }
    expect(auth.getSession).toHaveBeenCalled();
    expect(screen.queryByTestId(/-screen$/)).not.toBeOnTheScreen();
    expect(SplashScreen.hideAsync).not.toHaveBeenCalled();

    await act(async () => {
      resolve({ data: { session: SESSION }, error: null });
    });
    await waitFor(() => expect(screen.getByTestId("trips-screen")).toBeOnTheScreen());
    expect(SplashScreen.hideAsync).toHaveBeenCalled();
    expect(current.getPathname()).toBe("/trips");
  });
});

describe("navigation topology", () => {
  it("AC-6: «Get started» opens /sign-up and «Sign in» opens /sign-in", async () => {
    await renderApp("/", signedOut);
    fireEvent.press(screen.getByTestId("onboarding-start"));
    await expectPath("/sign-up");
    expect(screen.getByTestId("sign-up-screen")).toBeOnTheScreen();

    act(() => router.back());
    await expectPath("/onboarding");
    fireEvent.press(screen.getByTestId("onboarding-signin"));
    await expectPath("/sign-in");
    expect(screen.getByTestId("sign-in-screen")).toBeOnTheScreen();
  });

  it("the session appearing while on a form (sign-in succeeded) moves the user into the tabs", async () => {
    await renderApp("/sign-in", signedOut);
    await act(async () => {
      auth.emit("SIGNED_IN", SESSION);
    });
    await expectPath("/trips");
    expect(screen.getByTestId("trips-screen")).toBeOnTheScreen();
    expect(rootRouteNames(current.getRouterState())).toEqual(["(tabs)"]);
    expect(router.canGoBack()).toBe(false);
  });

  it("AC-8: the tab bar is visible on /trips, /history and /profile with the active tab marked", async () => {
    await renderApp("/", signedIn);

    for (const [label, path, screenId] of [
      ["Trips", "/trips", "trips-screen"],
      ["History", "/history", "history-screen"],
      ["Profile", "/profile", "profile-screen"],
    ] as const) {
      fireEvent.press(tab(label));
      await expectPath(path);
      expect(screen.getByTestId(screenId)).toBeOnTheScreen();
      // All three tabs stay on screen and only the current one is selected.
      for (const other of ["Trips", "History", "Profile"]) {
        expect(screen.getByRole("button", { name: other, selected: other === label })).toBeOnTheScreen();
      }
    }
  });

  it("AC-9: the tab bar is not shown on the trip details (S7)", async () => {
    await renderDetails("trip-lisbon");
    expect(screen.getByTestId("trip-detail-screen")).toBeOnTheScreen();
    for (const label of ["Trips", "History", "Profile"]) {
      expect(queryTab(label)).not.toBeOnTheScreen();
    }
  });

  it("AC-44: an unknown trip id shows «Trip not found», never another trip", async () => {
    await renderApp("/trips/x", signedIn);
    await waitFor(() => expect(screen.getByTestId("trip-not-found")).toBeOnTheScreen());
    expect(screen.getByText("Trip not found")).toBeOnTheScreen();
    expect(screen.queryByTestId("trip-hero")).not.toBeOnTheScreen();
    expect(getTripMock).toHaveBeenCalledWith("x");
    expect(current.getPathname()).toBe("/trips/x");
  });

  it("AC-44: from «Trip not found» opened by a link, the back button lands on /trips", async () => {
    await renderApp("/trips/x", signedIn);
    await waitFor(() => expect(screen.getByTestId("trip-not-found")).toBeOnTheScreen());
    fireEvent.press(screen.getByTestId("trip-state-back"));
    await expectPath("/trips");
    expect(screen.getByTestId("trips-screen")).toBeOnTheScreen();
  });

  it("AC-10: back from the details returns to the tab it was opened from (/history)", async () => {
    await renderApp("/", signedIn);
    fireEvent.press(tab("History"));
    await expectPath("/history");

    // The card comes from the list the (mocked) api served, not from a bundled fixture.
    fireEvent.press(await screen.findByTestId("trip-card-trip-rome"));
    await expectPath("/trips/trip-rome");
    expect(queryTab("History")).not.toBeOnTheScreen();

    act(() => router.back());
    await expectPath("/history");
    expect(screen.getByTestId("history-screen")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "History", selected: true })).toBeOnTheScreen();
  });

  it("opens the details of a trip from its card on the Trips tab", async () => {
    await renderApp("/", signedIn);
    fireEvent.press(await screen.findByTestId("trip-card-trip-lisbon"));
    await expectPath("/trips/trip-lisbon");
    await waitFor(() => expect(screen.getByTestId("trip-hero")).toBeOnTheScreen());
    expect(getTripMock).toHaveBeenCalledWith("trip-lisbon");
    expect(topRoute()).toEqual({ name: "trips/[tripId]/index", params: { tripId: "trip-lisbon" } });
  });

  it("presents the form routes as modals over the root stack", async () => {
    await renderDetails("trip-lisbon");
    for (const path of [
      "/trips/new",
      "/trips/x/edit",
      "/trips/x/flights/new",
      "/trips/x/flights/abc",
      "/trips/x/hotels/new",
      "/trips/x/hotels/abc",
      "/trips/x/cars/new",
    ] as const) {
      act(() => router.push(path));
      await expectPath(path);
      expect(queryTab("Trips")).not.toBeOnTheScreen();
    }
  });

  it("opens the booking forms of the trip from the S7 buttons (typed object hrefs)", async () => {
    await renderDetails("trip-lisbon");
    fireEvent.press(screen.getByTestId("empty-flight"));
    await expectPath("/trips/trip-lisbon/flights/new");
    act(() => router.back());
    await expectPath("/trips/trip-lisbon");

    fireEvent.press(screen.getByTestId("empty-hotel"));
    await expectPath("/trips/trip-lisbon/hotels/new");
    act(() => router.back());

    fireEvent.press(screen.getByTestId("empty-car"));
    await expectPath("/trips/trip-lisbon/cars/new");
  });

  // What the screens push for tripId "../../etc": expo-router must encode the param so it stays
  // ONE segment (unit tests only check the object handed to the router). `getPathname()` returns
  // the decoded path, so assert on the matched route NAME + its params (AC-76).
  it.each([
    ["/trips/[tripId]", "trips/[tripId]/index"],
    ["/trips/[tripId]/edit", "trips/[tripId]/edit"],
    ["/trips/[tripId]/flights/new", "trips/[tripId]/flights/new"],
    ["/trips/[tripId]/hotels/new", "trips/[tripId]/hotels/new"],
    ["/trips/[tripId]/hotels/[hotelId]", "trips/[tripId]/hotels/[hotelId]"],
    ["/trips/[tripId]/cars/new", "trips/[tripId]/cars/new"],
    ["/trips/[tripId]/route", "trips/[tripId]/route"],
  ] as const)(
    "keeps a hostile trip id inside its own path segment: %s (AC-76)",
    async (pathname, routeName) => {
      await renderDetails("trip-lisbon");
      act(() => router.push({ pathname, params: { tripId: "../../etc" } }));
      await waitFor(() => {
        expect(topRoute().name).toBe(routeName);
        expect(topRoute().params.tripId).toBe("../../etc");
      });
    },
  );

  it("shows «Trip not found» for a hostile id and asks the api for exactly that id (AC-44, AC-76)", async () => {
    await renderDetails("trip-lisbon");
    act(() => router.push({ pathname: "/trips/[tripId]", params: { tripId: "../../etc" } }));
    await waitFor(() => expect(screen.getByTestId("trip-not-found")).toBeOnTheScreen());
    expect(getTripMock).toHaveBeenCalledWith("../../etc");
    expect(screen.queryByTestId("trip-hero")).not.toBeOnTheScreen();
  });
});

describe("trip sheets: create, edit (SPEC-03 AC-30, 75)", () => {
  async function fillDestinationAndSubmit(text: string, { noDates }: { noDates: boolean }) {
    fireEvent.changeText(screen.getByTestId("trip-form-destination"), text);
    if (noDates) fireEvent.press(screen.getByRole("checkbox", { name: "No dates yet" }));
    fireEvent.press(screen.getByTestId("trip-form-submit"));
  }

  it("AC-30: creating a trip REPLACES the sheet with the details; back goes to the list, not the sheet", async () => {
    const { getRouterState } = await renderApp("/", signedIn);
    await screen.findByTestId("trip-card-trip-lisbon");
    fireEvent.press(screen.getByTestId("trips-add"));
    await expectPath("/trips/new");
    expect(rootRouteNames(getRouterState())).toEqual(["(tabs)", "trips/new"]);

    await fillDestinationAndSubmit("Porto", { noDates: true });
    await expectPath("/trips/trip-new");
    await waitFor(() => expect(screen.getByTestId("trip-hero")).toBeOnTheScreen());
    expect(createTripMock).toHaveBeenCalledTimes(1);
    // The sheet is gone from the stack: details sit directly over the tabs.
    expect(rootRouteNames(getRouterState())).toEqual(["(tabs)", "trips/[tripId]/index"]);
    expect(topRoute()).toEqual({ name: "trips/[tripId]/index", params: { tripId: "trip-new" } });

    act(() => router.back());
    await expectPath("/trips");
    expect(rootRouteNames(getRouterState())).toEqual(["(tabs)"]);
    expect(screen.queryByTestId("trip-form-screen")).not.toBeOnTheScreen();
    expect(screen.getByTestId("trips-screen")).toBeOnTheScreen();
  });

  it("AC-75: «Edit» in the details menu opens the edit sheet of THAT trip; saving returns to the details", async () => {
    const { getRouterState } = await renderApp("/", signedIn);
    fireEvent.press(await screen.findByTestId("trip-card-trip-lisbon"));
    await waitFor(() => expect(screen.getByTestId("trip-hero")).toBeOnTheScreen());
    fireEvent.press(screen.getByTestId("trip-hero-more"));
    fireEvent.press(await screen.findByTestId("menu-edit"));

    await expectPath("/trips/trip-lisbon/edit");
    expect(topRoute()).toEqual({ name: "trips/[tripId]/edit", params: { tripId: "trip-lisbon" } });
    await waitFor(() => expect(screen.getByTestId("trip-form-destination")).toHaveDisplayValue("Lisbon"));

    await fillDestinationAndSubmit("Lisbon, PT", { noDates: false });
    await expectPath("/trips/trip-lisbon");
    expect(updateTripMock).toHaveBeenCalledWith("trip-lisbon", expect.anything());
    expect(rootRouteNames(getRouterState())).toEqual(["(tabs)", "trips/[tripId]/index"]);
  });

  it("«Cancel» on the edit sheet returns to the details without saving", async () => {
    await renderDetails("trip-lisbon");
    act(() => router.push({ pathname: "/trips/[tripId]/edit", params: { tripId: "trip-lisbon" } }));
    await expectPath("/trips/trip-lisbon/edit");
    await waitFor(() => expect(screen.getByTestId("trip-form-destination")).toBeOnTheScreen());
    fireEvent.press(screen.getByRole("button", { name: "Cancel" }));
    await expectPath("/trips/trip-lisbon");
    expect(updateTripMock).not.toHaveBeenCalled();
  });

  it("editing an unknown trip shows «Trip not found» in the sheet (AC-44)", async () => {
    await renderApp("/trips/x/edit", signedIn);
    await waitFor(() => expect(screen.getByTestId("trip-form-not-found")).toBeOnTheScreen());
    expect(getTripMock).toHaveBeenCalledWith("x");
  });
});

describe("the cache never outlives the account (query cache hygiene)", () => {
  it("user B does not see user A's trips while B's own list is still loading", async () => {
    await renderApp("/", signedIn);
    await screen.findByTestId("trip-card-trip-lisbon");
    await endSession();
    await expectPath("/onboarding");

    // B's list request stays pending: whatever is on screen now can only come from a cache.
    let answer!: (value: unknown) => void;
    listTripsMock.mockImplementation(() => new Promise((resolve) => (answer = resolve)));
    await act(async () => {
      auth.emit("SIGNED_IN", { ...SESSION, user: { ...SESSION.user, id: "user-2" } });
    });
    await expectPath("/trips");
    await waitFor(() => expect(listTripsMock).toHaveBeenCalledTimes(2));
    expect(screen.queryByTestId("trip-card-trip-lisbon")).not.toBeOnTheScreen();

    await act(async () => {
      answer({ ok: true, data: [] });
    });
    expect(screen.queryByTestId("trip-card-trip-lisbon")).not.toBeOnTheScreen();
  });
});

describe("the session ends while the app runs (SPEC-02 AC-24; SPEC-01 AC-13 topology)", () => {
  it("from a tab: lands on /onboarding and leaves no tabs in the stack", async () => {
    const { getRouterState } = await renderApp("/", signedIn);
    fireEvent.press(tab("Profile"));
    await expectPath("/profile");

    await endSession();
    await expectPath("/onboarding");
    expect(screen.getByTestId("onboarding-screen")).toBeOnTheScreen();

    expect(rootRouteNames(getRouterState())).toEqual(["onboarding"]);
    expect(router.canGoBack()).toBe(false);
  });

  it("from a tab reached after opening details: also clears the whole stack", async () => {
    const { getRouterState } = await renderApp("/", signedIn);
    fireEvent.press(tab("History"));
    await expectPath("/history");
    fireEvent.press(await screen.findByTestId("trip-card-trip-rome"));
    await expectPath("/trips/trip-rome");
    act(() => router.back());
    await expectPath("/history");
    fireEvent.press(tab("Profile"));
    await expectPath("/profile");
    expect(within(screen.getByTestId("profile-screen")).getByTestId("profile-logout")).toBeOnTheScreen();

    await endSession();
    await expectPath("/onboarding");
    expect(rootRouteNames(getRouterState())).toEqual(["onboarding"]);
  });

  it("from a modal over the trip details: lands on /onboarding", async () => {
    const { getRouterState } = await renderApp("/trips/trip-lisbon", signedIn);
    await waitFor(() => expect(screen.getByTestId("trip-hero")).toBeOnTheScreen());
    act(() => router.push("/trips/trip-lisbon/flights/new"));
    await expectPath("/trips/trip-lisbon/flights/new");

    await endSession();
    await expectPath("/onboarding");
    expect(rootRouteNames(getRouterState())).toEqual(["onboarding"]);
  });

  it("guarded screens cannot be pushed afterwards", async () => {
    await renderApp("/", signedIn);
    await endSession();
    await expectPath("/onboarding");

    act(() => router.push("/trips"));
    await expectPath("/onboarding");
    act(() => router.replace("/profile"));
    await expectPath("/onboarding");
  });
});

describe("gating of the tabs and trips/* without a session (SPEC-02 AC-20)", () => {
  it.each([
    "/trips",
    "/history",
    "/profile",
    "/trips/x",
    "/trips/new",
    "/trips/x/edit",
    "/trips/x/flights/new",
    "/trips/x/flights/abc",
    "/trips/x/hotels/new",
    "/trips/x/hotels/abc",
    "/trips/x/cars/new",
    "/trips/x/route",
  ])(
    "opening %s (a tripplanner:// link, i.e. the initial URL) leads to /onboarding",
    async (url) => {
      const { getRouterState } = await renderApp(url, signedOut);
      expect(current.getPathname()).toBe("/onboarding");
      expect(screen.getByTestId("onboarding-screen")).toBeOnTheScreen();
      expect(rootRouteNames(getRouterState())).toEqual(["onboarding"]);
      for (const label of ["Trips", "History", "Profile"]) {
        expect(queryTab(label)).not.toBeOnTheScreen();
      }
      // No request leaves the device without a session (SPEC-03 AC-62).
      expect(listTripsMock).not.toHaveBeenCalled();
      expect(getTripMock).not.toHaveBeenCalled();
    },
  );

  it("an in-app push of a guarded route is refused too", async () => {
    await renderApp("/", signedOut);
    act(() => router.push("/trips/x"));
    await expectPath("/onboarding");
    expect(screen.queryByTestId("trip-detail-screen")).not.toBeOnTheScreen();
  });

  it("an in-app push of the edit route is refused too (AC-75)", async () => {
    await renderApp("/", signedOut);
    act(() => router.push({ pathname: "/trips/[tripId]/edit", params: { tripId: "trip-lisbon" } }));
    await expectPath("/onboarding");
    expect(screen.queryByTestId("trip-form-screen")).not.toBeOnTheScreen();
    expect(getTripMock).not.toHaveBeenCalled();
  });
});

describe("gating of the auth screens with a session (SPEC-02 AC-21)", () => {
  it.each(["/onboarding", "/sign-in", "/sign-up", "/forgot-password", "/reset-password"])(
    "opening %s while signed in leads to /trips",
    async (url) => {
      const { getRouterState } = await renderApp(url, signedIn);
      expect(current.getPathname()).toBe("/trips");
      expect(screen.getByTestId("trips-screen")).toBeOnTheScreen();
      expect(rootRouteNames(getRouterState())).toEqual(["(tabs)"]);
    },
  );

  it("an in-app push of an auth screen is refused while signed in", async () => {
    await renderApp("/", signedIn);
    act(() => router.push("/sign-in"));
    await expectPath("/trips");
    expect(screen.queryByTestId("sign-in-screen")).not.toBeOnTheScreen();
  });

  it.each([
    ["/legal/terms", "legal-terms-screen"],
    ["/legal/privacy", "legal-privacy-screen"],
  ])("%s stays reachable WITHOUT a session", async (url, testId) => {
    await renderApp(url, signedOut);
    expect(current.getPathname()).toBe(url);
    expect(screen.getByTestId(testId)).toBeOnTheScreen();
  });

  it.each([
    ["/legal/terms", "legal-terms-screen"],
    ["/legal/privacy", "legal-privacy-screen"],
  ])("%s stays reachable WITH a session", async (url, testId) => {
    await renderApp(url, signedIn);
    expect(current.getPathname()).toBe(url);
    expect(screen.getByTestId(testId)).toBeOnTheScreen();
  });

  it("signing in while a legal page is open keeps it open (legal is in neither group)", async () => {
    await renderApp("/legal/terms", signedOut);
    await act(async () => {
      auth.emit("SIGNED_IN", SESSION);
    });
    expect(current.getPathname()).toBe("/legal/terms");
    expect(screen.getByTestId("legal-terms-screen")).toBeOnTheScreen();
  });
});

// `/reset-password` (S10b) is added by PLAN-02 Step 8, which owns `app/reset-password.tsx`.
// Its gating is declared in the root layout already, so it is proven here on an in-memory route
// tree that reuses the REAL layout, index and tabs and adds a stub at that path. Once the real
// route exists, add "/reset-password" to the auth-screens list above.
describe("gating of /reset-password with a session (SPEC-02 AC-21), on an in-memory route", () => {
  const routes = {
    _layout: RootLayout,
    index: IndexRoute,
    onboarding: OnboardingRoute,
    "(tabs)/_layout": TabsLayout,
    "(tabs)/trips": TripsTab,
    "legal/terms": TermsRoute,
    "reset-password": () => <Text testID="reset-password-screen">reset</Text>,
  };

  async function renderHarness(initialUrl: string, launch: Launch) {
    storedSession(launch.session);
    const warn = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    // The layout declares screens for routes this tree does not have (sign-in, ...): expo-router
    // warns about each one; that noise is not the subject here.
    current = renderRouter(routes, { initialUrl });
    await waitFor(() => expect(screen.getByTestId(/-screen$/)).toBeOnTheScreen());
    warn.mockRestore();
    return current;
  }

  it("is reachable without a session", async () => {
    await renderHarness("/reset-password", signedOut);
    expect(current.getPathname()).toBe("/reset-password");
    expect(screen.getByTestId("reset-password-screen")).toBeOnTheScreen();
  });

  it("leads to /trips with a session", async () => {
    await renderHarness("/reset-password", signedIn);
    expect(current.getPathname()).toBe("/trips");
    expect(screen.queryByTestId("reset-password-screen")).not.toBeOnTheScreen();
  });

  it("is refused for an in-app push while signed in", async () => {
    await renderHarness("/", signedIn);
    act(() => router.push("/reset-password"));
    await expectPath("/trips");
  });
});
