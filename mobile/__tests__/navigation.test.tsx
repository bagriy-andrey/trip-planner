// Navigation topology (PLAN-01 §1.2, Step 9): AC-1, 6, 7, 8, 9, 10, 13. Runs the REAL
// route files and layouts through expo-router's in-memory navigator (`renderRouter`).
//
// Lives in `mobile/__tests__/`, not `mobile/app/__tests__/` as the plan says: expo-router
// treats every file under `app/` as a route (its require.context matches any `.tsx`), so a
// test there would ship in the bundle as a route (see routes.contract.test.ts).
import { router } from "expo-router";
import { act, fireEvent, renderRouter, screen, waitFor, within } from "expo-router/testing-library";

import { i18n } from "@/lib/i18n";

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

async function renderApp(initialUrl = "/") {
  const utils = renderRouter("./app", { initialUrl });
  current = utils;
  // ThemeProvider reads storage asynchronously and the root layout renders nothing until
  // that (and fonts) are ready, so the first screen appears one tick later.
  await waitFor(() => expect(screen.getByTestId(/-screen$/)).toBeOnTheScreen());
  return utils;
}

const tab = (name: string) => screen.getByRole("button", { name });
const queryTab = (name: string) => screen.queryByRole("button", { name });

/** Onboarding -> Sign in -> S2 submit: the real path into the tabs (AC-7). */
async function enterTabs() {
  fireEvent.press(screen.getByTestId("onboarding-signin"));
  await expectPath("/sign-in");
  fireEvent.press(screen.getByTestId("sign-in-submit"));
  await expectPath("/trips");
}

beforeEach(async () => {
  // Deterministic English strings regardless of what an earlier test switched to.
  await i18n.changeLanguage("en");
});

describe("navigation topology", () => {
  it("AC-1: a cold start lands on /onboarding (via the / redirect)", async () => {
    const { getPathname } = await renderApp("/");
    expect(getPathname()).toBe("/onboarding");
    expect(screen.getByTestId("onboarding-screen")).toBeOnTheScreen();
  });

  it("AC-1: an unknown URL falls back to onboarding instead of an error screen", async () => {
    await renderApp("/this/route/does/not/exist");
    expect(current.getPathname()).toBe("/onboarding");
  });

  it("AC-6: «Get started» opens /sign-up and «Sign in» opens /sign-in", async () => {
    await renderApp("/");
    fireEvent.press(screen.getByTestId("onboarding-start"));
    await expectPath("/sign-up");
    expect(screen.getByTestId("sign-up-screen")).toBeOnTheScreen();

    act(() => router.back());
    await expectPath("/onboarding");
    fireEvent.press(screen.getByTestId("onboarding-signin"));
    await expectPath("/sign-in");
    expect(screen.getByTestId("sign-in-screen")).toBeOnTheScreen();
  });

  it("AC-7: «Sign in» enters the tabs on /trips without any validation", async () => {
    await renderApp("/");
    await enterTabs();
    expect(screen.getByTestId("trips-screen")).toBeOnTheScreen();
  });

  it("AC-8: the tab bar is visible on /trips, /history and /profile with the active tab marked", async () => {
    await renderApp("/");
    await enterTabs();

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
    await renderApp("/trips/x");
    expect(screen.getByTestId("trip-detail-screen")).toBeOnTheScreen();
    for (const label of ["Trips", "History", "Profile"]) {
      expect(queryTab(label)).not.toBeOnTheScreen();
    }
  });

  it("AC-10: back from the details returns to the tab it was opened from (/history)", async () => {
    await renderApp("/");
    await enterTabs();
    fireEvent.press(tab("History"));
    await expectPath("/history");

    fireEvent.press(screen.getByTestId("trip-card-trip-rome"));
    await expectPath("/trips/trip-rome");
    expect(queryTab("History")).not.toBeOnTheScreen();

    act(() => router.back());
    await expectPath("/history");
    expect(screen.getByTestId("history-screen")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "History", selected: true })).toBeOnTheScreen();
  });

  it("presents the form routes as modals over the root stack", async () => {
    await renderApp("/trips/x");
    for (const path of [
      "/trips/new",
      "/trips/x/flights/new",
      "/trips/x/flights/abc",
      "/trips/x/hotels/new",
      "/trips/x/cars/new",
    ] as const) {
      act(() => router.push(path));
      await expectPath(path);
      expect(queryTab("Trips")).not.toBeOnTheScreen();
    }
  });

  it("opens the booking forms of the trip from the S7 buttons (typed object hrefs)", async () => {
    await renderApp("/trips/trip-lisbon");
    fireEvent.press(screen.getByTestId("add-flight"));
    await expectPath("/trips/trip-lisbon/flights/new");
    act(() => router.back());
    await expectPath("/trips/trip-lisbon");

    fireEvent.press(screen.getByTestId("flight-card-flight-lisbon-outbound"));
    await expectPath("/trips/trip-lisbon/flights/flight-lisbon-outbound");
    act(() => router.back());

    fireEvent.press(screen.getByTestId("add-hotel"));
    await expectPath("/trips/trip-lisbon/hotels/new");
    act(() => router.back());

    fireEvent.press(screen.getByTestId("add-car"));
    await expectPath("/trips/trip-lisbon/cars/new");
  });

  it("keeps a hostile trip id inside its own path segment", async () => {
    await renderApp("/trips/trip-lisbon");
    // What TripDetailScreen pushes for tripId "../../etc": expo-router must encode the param
    // so it stays ONE segment (the unit test only checks the object handed to the router).
    // `getPathname()` returns the decoded path, so assert on the matched route + its params.
    act(() =>
      router.push({ pathname: "/trips/[tripId]/flights/new", params: { tripId: "../../etc" } }),
    );
    await waitFor(() => {
      const stack = current.getRouterState()?.routes[0]?.state?.routes ?? [];
      const top = stack[stack.length - 1];
      expect(top?.name).toBe("trips/[tripId]/flights/new");
      // React Navigation types params as a bare `object`; read the entry without a cast.
      expect(Object.fromEntries(Object.entries(top?.params ?? {})).tripId).toBe("../../etc");
    });
  });

  it("AC-13: «Sign out» returns to /onboarding and leaves no tabs in the stack", async () => {
    const { getRouterState } = await renderApp("/");
    await enterTabs();
    fireEvent.press(tab("Profile"));
    await expectPath("/profile");

    fireEvent.press(screen.getByTestId("profile-logout"));
    await expectPath("/onboarding");
    expect(screen.getByTestId("onboarding-screen")).toBeOnTheScreen();

    expect(rootRouteNames(getRouterState())).toEqual(["onboarding"]);
    expect(router.canGoBack()).toBe(false);
  });

  it("AC-13: signing out from a tab reached after opening details also clears the stack", async () => {
    const { getRouterState } = await renderApp("/");
    await enterTabs();
    fireEvent.press(tab("History"));
    await expectPath("/history");
    fireEvent.press(screen.getByTestId("trip-card-trip-rome"));
    await expectPath("/trips/trip-rome");
    act(() => router.back());
    await expectPath("/history");
    fireEvent.press(tab("Profile"));
    await expectPath("/profile");

    fireEvent.press(within(screen.getByTestId("profile-screen")).getByTestId("profile-logout"));
    await expectPath("/onboarding");
    expect(rootRouteNames(getRouterState())).toEqual(["onboarding"]);
  });
});
