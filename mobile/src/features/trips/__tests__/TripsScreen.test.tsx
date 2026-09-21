import { act, screen, userEvent, waitFor, within } from "@testing-library/react-native";
import { coverIndexOf } from "@tripplanner/shared";
import type { Trip } from "@tripplanner/shared";
import { AccessibilityInfo, ActivityIndicator, StyleSheet } from "react-native";

import { coverColors, darkTokens, family, layout } from "@/lib/theme";
import { renderWithProviders } from "@/test-utils/renderWithProviders";
import type { RenderWithProvidersOptions } from "@/test-utils/renderWithProviders";

import { listTrips } from "../api";
import { makeTrip } from "../hooks/__tests__/testKit";
import { TripsScreen } from "../TripsScreen";

jest.mock("@/lib/supabase", () => ({ supabase: { from: jest.fn() } }));
jest.mock("../api", () => ({ ...jest.requireActual("../api"), listTrips: jest.fn() }));

const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  navigate: jest.fn(),
  back: jest.fn(),
  dismissAll: jest.fn(),
};
jest.mock("expo-router", () => ({ useRouter: () => mockRouter }));

const listTripsMock = listTrips as jest.Mock;

// Today is 2026-09-21 (the render helper's default).
const soon = makeTrip({ id: "soon", destination: "Lisbon", startDate: "2026-09-25", endDate: "2026-10-01" });
const later = makeTrip({ id: "later", destination: "Barcelona", startDate: "2026-10-16", endDate: "2026-10-22" });
const undated = makeTrip({ id: "undated", destination: "Tokyo", createdAt: "2026-09-02T10:00:00.000Z" });
const past = makeTrip({ id: "past", destination: "Rome", startDate: "2026-08-01", endDate: "2026-08-05" });
const archived = makeTrip({
  id: "archived",
  destination: "Vienna",
  startDate: "2026-11-05",
  endDate: "2026-11-08",
  archivedAt: "2026-09-10T10:00:00.000Z",
});
const MIXED = [later, past, undated, archived, soon];

const SIGNED_IN: RenderWithProvidersOptions = { session: { user: {} } };

// VirtualizedList re-plans its window on a timer (`updateCellsBatchingPeriod`, 50 ms) after data
// arrives; letting it run inside `act` keeps that update from landing outside of it.
const LIST_BATCH_MS = 60;

async function renderTrips(data: readonly Trip[], options: RenderWithProvidersOptions = SIGNED_IN) {
  listTripsMock.mockResolvedValue({ ok: true, data });
  const result = await renderWithProviders(<TripsScreen />, options);
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, LIST_BATCH_MS));
  });
  return result;
}

const cardIds = () => screen.getAllByTestId(/^trip-card-[^-]+$/).map((node) => node.props.testID as string);

beforeEach(() => {
  jest.clearAllMocks();
  listTripsMock.mockReset();
});

describe("TripsScreen (S4) — list", () => {
  it("shows only non-archived trips that have not ended, nearest first, undated last (AC-35)", async () => {
    await renderTrips(MIXED);
    await screen.findByTestId("trip-card-soon");
    expect(cardIds()).toEqual(["trip-card-soon", "trip-card-later", "trip-card-undated"]);
    expect(screen.queryByTestId("trip-card-past")).not.toBeOnTheScreen();
    expect(screen.queryByTestId("trip-card-archived")).not.toBeOnTheScreen();
    // ONE request feeds the list.
    expect(listTripsMock).toHaveBeenCalledTimes(1);
  });

  it("renders the title, the avatar, the cards and the add button", async () => {
    await renderTrips(MIXED);
    await screen.findByTestId("trip-card-soon");
    expect(screen.getByRole("header", { name: "Trips" })).toBeOnTheScreen();
    expect(screen.getByTestId("trips-avatar")).toBeOnTheScreen();
    expect(screen.getByTestId("trips-add")).toBeOnTheScreen();
  });

  it("puts the accent chip on exactly one trip: the nearest one (AC-23)", async () => {
    await renderTrips(MIXED);
    await screen.findByTestId("trip-card-soon");
    const chips = ["soon", "later", "undated"].map((id) => screen.getByTestId(`trip-card-${id}-status`));
    const accented = chips.filter((chip) => StyleSheet.flatten(chip.props.style).backgroundColor === darkTokens.accent);
    expect(accented).toHaveLength(1);
    expect(accented[0]).toBe(screen.getByTestId("trip-card-soon-status"));
    expect(within(screen.getByTestId("trip-card-soon")).getByText("in 4 days")).toBeOnTheScreen();
    expect(within(screen.getByTestId("trip-card-later")).getByText("in 25 days")).toBeOnTheScreen();
    expect(within(screen.getByTestId("trip-card-undated")).getByText("plan")).toBeOnTheScreen();
  });

  it("gives nobody the accent chip when no trip has dates (AC-23)", async () => {
    await renderTrips([undated, makeTrip({ id: "other", destination: "Oslo" })]);
    await screen.findByTestId("trip-card-undated-status");
    for (const chip of screen.getAllByTestId(/-status$/)) {
      expect(StyleSheet.flatten(chip.props.style).backgroundColor).toBe(darkTokens.divider);
    }
  });

  it("reads a trip that is already under way as 'today' on the accent chip", async () => {
    const underWay = makeTrip({ id: "now", destination: "Nice", startDate: "2026-09-19", endDate: "2026-09-24" });
    await renderTrips([underWay, later]);
    const card = await screen.findByTestId("trip-card-now");
    expect(within(card).getByText("today")).toBeOnTheScreen();
    expect(screen.getByTestId("trip-card-now-status")).toHaveStyle({ backgroundColor: darkTokens.accent });
  });

  it("moves a trip out of the list when its end date passes, without a new request (AC-35)", async () => {
    await renderTrips([soon], { ...SIGNED_IN, today: "2026-10-02" });
    await screen.findByTestId("trips-empty");
    expect(screen.queryByTestId("trip-card-soon")).not.toBeOnTheScreen();
    expect(listTripsMock).toHaveBeenCalledTimes(1);
  });

  it("keeps a trip that ends today (the last day still counts)", async () => {
    await renderTrips([soon], { ...SIGNED_IN, today: "2026-10-01" });
    expect(await screen.findByTestId("trip-card-soon")).toBeOnTheScreen();
  });

  it("uses Russian copy and the directory name in the UI language", async () => {
    const lisbon = makeTrip({
      id: "pt",
      destination: "Lisbon",
      place: { kind: "city", placeId: "city-lisbon", countryCode: "PT", timeZone: "Europe/Lisbon", airportCode: "LIS" },
      startDate: "2026-09-26",
      endDate: "2026-10-01",
    });
    await renderTrips([lisbon, undated], { ...SIGNED_IN, locale: "ru" });
    const card = await screen.findByTestId("trip-card-pt");
    expect(within(card).getByText("Лиссабон")).toBeOnTheScreen();
    expect(within(card).getByText("через 5 дней")).toBeOnTheScreen();
    expect(within(screen.getByTestId("trip-card-undated")).getByText("дата не выбрана")).toBeOnTheScreen();
    expect(screen.getByRole("header", { name: "Поездки" })).toBeOnTheScreen();
  });

  it("draws the dates in the mono role and the place name and chip in the text roles (AC-68)", async () => {
    await renderTrips([soon, undated]);
    const card = await screen.findByTestId("trip-card-soon");
    const range = within(card).getByText(/^Sep 25/);
    expect(range).toHaveStyle({ fontFamily: family.mono });
    expect(within(card).getByText("Lisbon")).not.toHaveStyle({ fontFamily: family.mono });
    expect(within(card).getByText("in 4 days")).not.toHaveStyle({ fontFamily: family.mono });
    // "no date chosen" is a note, not ticket data.
    const placeholder = within(screen.getByTestId("trip-card-undated")).getByText("no date chosen");
    expect(placeholder).not.toHaveStyle({ fontFamily: family.mono });
    expect(placeholder).toHaveStyle({ color: darkTokens.textTertiary });
  });

  it("does not dim the card or its cover with opacity (N-2)", async () => {
    await renderTrips([soon]);
    const card = await screen.findByTestId("trip-card-soon");
    expect(StyleSheet.flatten(card.props.style).opacity).toBe(1);
    const backing = within(card).getByTestId("trip-cover-backing");
    expect(StyleSheet.flatten(backing.props.style).opacity).toBeUndefined();
    expect(backing).toHaveStyle({ backgroundColor: coverColors[coverIndexOf("soon", coverColors.length)] });
  });

  it("keeps a trip's cover colour when its place is renamed or the language changes (AC-38)", async () => {
    const colorOf = () =>
      StyleSheet.flatten(
        within(screen.getByTestId("trip-card-soon")).getByTestId("trip-cover-backing").props.style,
      ).backgroundColor;
    const first = await renderTrips([soon]);
    await screen.findByTestId("trip-card-soon");
    const before = colorOf();
    first.unmount();

    const renamed = { ...soon, destination: "Porto", title: "Surf week" };
    await renderTrips([renamed], { ...SIGNED_IN, locale: "ru" });
    await screen.findByTestId("trip-card-soon");
    expect(colorOf()).toBe(before);
  });
});

describe("TripsScreen (S4) — states", () => {
  it("shows skeleton cards of the card's height while loading, and no spinner (AC-39)", async () => {
    listTripsMock.mockReturnValue(new Promise(() => undefined));
    await renderWithProviders(<TripsScreen />, SIGNED_IN);
    const skeletons = await screen.findAllByTestId("trips-skeleton", { includeHiddenElements: true });
    expect(skeletons.length).toBeGreaterThan(0);
    for (const skeleton of skeletons) {
      expect(StyleSheet.flatten(skeleton.props.style).minHeight).toBe(layout.coverHeight);
    }
    expect(screen.UNSAFE_queryByType(ActivityIndicator)).toBeNull();
    expect(screen.getByLabelText("Loading trips")).toBeOnTheScreen();
    expect(screen.queryByTestId("trips-empty")).not.toBeOnTheScreen();
    expect(screen.queryByTestId("trips-error")).not.toBeOnTheScreen();
  });

  it("the empty list gives a short text and a hint at the '+', with no illustration (AC-40)", async () => {
    await renderTrips([past, archived]);
    const empty = await screen.findByTestId("trips-empty");
    expect(within(empty).getByText("No trips yet")).toBeOnTheScreen();
    expect(within(empty).getByText("Add your first one with the button at the bottom right")).toBeOnTheScreen();
    expect(within(empty).queryByRole("button")).not.toBeOnTheScreen();
    expect(within(empty).queryByRole("image")).not.toBeOnTheScreen();
    expect(screen.getByTestId("trips-add")).toBeOnTheScreen();
    expect(screen.queryByTestId("trips-skeleton")).not.toBeOnTheScreen();
  });

  it("a failed load shows the message and 'Retry', never the empty state; Retry calls the api again (AC-41)", async () => {
    const user = userEvent.setup();
    listTripsMock.mockResolvedValueOnce({ ok: false, kind: "offline" });
    await renderWithProviders(<TripsScreen />, SIGNED_IN);
    const error = await screen.findByTestId("trips-error");
    expect(within(error).getByText("Could not load your trips")).toBeOnTheScreen();
    expect(within(error).getByText("No connection. Check your internet and try again")).toBeOnTheScreen();
    expect(screen.queryByTestId("trips-empty")).not.toBeOnTheScreen();
    expect(screen.queryByText("No trips yet")).not.toBeOnTheScreen();
    expect(listTripsMock).toHaveBeenCalledTimes(1);

    listTripsMock.mockResolvedValueOnce({ ok: true, data: [soon] });
    await user.press(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByTestId("trip-card-soon")).toBeOnTheScreen();
    expect(listTripsMock).toHaveBeenCalledTimes(2);
    expect(screen.queryByTestId("trips-error")).not.toBeOnTheScreen();
  });

  it("maps each failure kind to its own message, an unknown one to the generic text", async () => {
    listTripsMock.mockResolvedValue({ ok: false, kind: "timeout" });
    await renderWithProviders(<TripsScreen />, SIGNED_IN);
    expect(await screen.findByText("The server is taking too long. Try again")).toBeOnTheScreen();
  });
});

describe("TripsScreen (S4) — announcements (AC-71)", () => {
  let announce: jest.SpyInstance;
  beforeEach(() => {
    announce = jest.spyOn(AccessibilityInfo, "announceForAccessibility").mockImplementation(() => undefined);
  });
  afterEach(() => announce.mockRestore());

  it("announces the loaded list with its count, once", async () => {
    await renderTrips(MIXED);
    await screen.findByTestId("trip-card-soon");
    expect(announce).toHaveBeenCalledTimes(1);
    expect(announce).toHaveBeenCalledWith("Trips loaded: 3 trips");
  });

  it("announces with the Russian plural form", async () => {
    await renderTrips([soon, later, undated], { ...SIGNED_IN, locale: "ru" });
    await screen.findByTestId("trip-card-soon");
    expect(announce).toHaveBeenCalledWith("Поездки загружены: 3 поездки");
  });

  it("announces the empty state and the error, but not the loading", async () => {
    await renderTrips([]);
    await screen.findByTestId("trips-empty");
    expect(announce).toHaveBeenCalledTimes(1);
    expect(announce).toHaveBeenCalledWith("No trips yet");
  });

  it("announces a failed load", async () => {
    listTripsMock.mockResolvedValue({ ok: false, kind: "unknown" });
    await renderWithProviders(<TripsScreen />, SIGNED_IN);
    await screen.findByTestId("trips-error");
    expect(announce).toHaveBeenCalledTimes(1);
    expect(announce).toHaveBeenCalledWith("Could not load your trips");
  });
});

describe("TripsScreen (S4) — interaction", () => {
  it("opens the trip with an OBJECT href whose param is the raw id (N-3, AC-76)", async () => {
    const user = userEvent.setup();
    await renderTrips([soon, later]);
    await user.press(await screen.findByTestId("trip-card-later"));
    expect(mockRouter.push).toHaveBeenCalledTimes(1);
    expect(mockRouter.push).toHaveBeenCalledWith({ pathname: "/trips/[tripId]", params: { tripId: "later" } });
  });

  it("keeps a hostile id a parameter — no path splicing, no pre-encoding (AC-76)", async () => {
    const user = userEvent.setup();
    const hostile = makeTrip({ id: "../../etc", destination: "Evil", startDate: "2026-09-25", endDate: "2026-09-26" });
    await renderTrips([hostile]);
    await user.press(await screen.findByTestId("trip-card-../../etc"));
    expect(mockRouter.push).toHaveBeenCalledWith({ pathname: "/trips/[tripId]", params: { tripId: "../../etc" } });
  });

  it("gives every interactive element a non-empty label, a role and at least 44pt (AC-70)", async () => {
    await renderTrips([soon, undated]);
    await screen.findByTestId("trip-card-soon");
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(4);
    for (const button of buttons) {
      expect(String(button.props.accessibilityLabel ?? "").length).toBeGreaterThan(0);
    }
    expect(screen.getByRole("button", { name: "Open profile" })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "New trip" })).toBeOnTheScreen();
    // One phrase per card: place, status, dates (ICU pads ranges with thin spaces).
    const labelOf = (id: string) =>
      String(screen.getByTestId(`trip-card-${id}`).props.accessibilityLabel).replace(/\s/g, " ");
    expect(labelOf("soon")).toBe("Lisbon, in 4 days, Sep 25 – Oct 1, 2026");
    expect(labelOf("undated")).toBe("Tokyo, plan, no date chosen");
    expect(StyleSheet.flatten(screen.getByTestId("trip-card-soon").props.style).minHeight).toBeGreaterThanOrEqual(
      layout.minTouch,
    );
  });

  it("gives the Retry action a label, the button role and a 44pt target (AC-70)", async () => {
    listTripsMock.mockResolvedValue({ ok: false, kind: "unknown" });
    await renderWithProviders(<TripsScreen />, SIGNED_IN);
    const retry = await screen.findByRole("button", { name: "Retry" });
    expect(StyleSheet.flatten(retry.props.style).minHeight).toBeGreaterThanOrEqual(layout.minTouch);
  });

  it("switches to the profile tab (navigate, not push) from the avatar (Q1)", async () => {
    const user = userEvent.setup();
    await renderTrips([soon]);
    await user.press(screen.getByRole("button", { name: "Open profile" }));
    expect(mockRouter.navigate).toHaveBeenCalledTimes(1);
    expect(mockRouter.navigate).toHaveBeenCalledWith("/profile");
    expect(mockRouter.push).not.toHaveBeenCalled();
  });

  it("takes the avatar initial from the session's display name, upper-cased (AC-27)", async () => {
    await renderTrips([], { session: { user: { displayName: "  zoe Adler " } } });
    const avatar = screen.getByTestId("trips-avatar");
    expect(within(avatar).getByText("Z", { includeHiddenElements: true })).toBeOnTheScreen();
  });

  it("falls back to the email's local part for the initial (AC-26)", async () => {
    await renderTrips([], { session: { user: { email: "bruno.k@example.com", displayName: null } } });
    const avatar = screen.getByTestId("trips-avatar");
    expect(within(avatar).getByText("B", { includeHiddenElements: true })).toBeOnTheScreen();
  });

  it("opens the new-trip modal from the floating button", async () => {
    const user = userEvent.setup();
    await renderTrips([soon]);
    await user.press(screen.getByRole("button", { name: "New trip" }));
    expect(mockRouter.push).toHaveBeenCalledTimes(1);
    expect(mockRouter.push).toHaveBeenCalledWith("/trips/new");
  });
});

describe("TripsScreen (S4) — many trips", () => {
  it("renders 200 generated trips through a windowed FlatList, not 200 cards (Non-functional)", async () => {
    const many = Array.from({ length: 200 }, (_, index) =>
      makeTrip({
        id: `trip-${String(index).padStart(3, "0")}`,
        destination: `Place ${index}`,
        startDate: "2026-10-01",
        endDate: "2026-10-05",
        createdAt: `2026-09-01T10:${String(index % 60).padStart(2, "0")}:00.000Z`,
      }),
    );
    await renderTrips(many);
    await screen.findAllByTestId(/^trip-card-trip-\d+$/);
    const rendered = screen.getAllByTestId(/^trip-card-trip-\d+$/);
    expect(rendered.length).toBeGreaterThan(0);
    expect(rendered.length).toBeLessThan(40);
    // The first ones in list order are the ones drawn.
    expect(rendered[0]?.props.testID).toBe("trip-card-trip-000");
    await waitFor(() => expect(listTripsMock).toHaveBeenCalledTimes(1));
    await act(async () => undefined);
  });
});
