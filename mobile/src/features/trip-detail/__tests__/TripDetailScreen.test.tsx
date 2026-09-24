import { act, fireEvent, screen, userEvent, waitFor, within } from "@testing-library/react-native";
import { findAirportByCode } from "@tripplanner/shared";
import type { Segment, Trip } from "@tripplanner/shared";
import { AccessibilityInfo, ActivityIndicator, Alert } from "react-native";

import { Icon } from "@/components";
import { darkTokens, family } from "@/lib/theme";
import { renderWithProviders } from "@/test-utils/renderWithProviders";
import type { RenderWithProvidersOptions } from "@/test-utils/renderWithProviders";

import { tripKeys } from "@/features/trips";
import { archiveTrip, deleteTrip, getTrip, unarchiveTrip } from "@/features/trips/api";
import { listSegments } from "@/features/transport/api";
import { hotelKeys } from "@/features/hotels";
import { listHotels } from "@/features/hotels/api";
import { makeHotel } from "@/features/hotels/hooks/__tests__/testKit";
import { TripDetailScreen } from "../TripDetailScreen";

jest.mock("@/lib/supabase", () => ({ supabase: { from: jest.fn() } }));
jest.mock("@/features/trips/api", () => ({
  ...jest.requireActual("@/features/trips/api"),
  getTrip: jest.fn(),
  archiveTrip: jest.fn(),
  unarchiveTrip: jest.fn(),
  deleteTrip: jest.fn(),
}));
jest.mock("@/features/transport/api", () => ({
  ...jest.requireActual("@/features/transport/api"),
  listSegments: jest.fn(),
}));

jest.mock("@/features/hotels/api", () => ({
  ...jest.requireActual("@/features/hotels/api"),
  listHotels: jest.fn(),
}));

const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  navigate: jest.fn(),
  back: jest.fn(),
  canGoBack: jest.fn(),
  dismissAll: jest.fn(),
};
jest.mock("expo-router", () => ({ useRouter: () => mockRouter }));

const getTripMock = getTrip as jest.Mock;
const archiveMock = archiveTrip as jest.Mock;
const unarchiveMock = unarchiveTrip as jest.Mock;
const deleteMock = deleteTrip as jest.Mock;
const listSegmentsMock = listSegments as jest.Mock;
const listHotelsMock = listHotels as jest.Mock;

const SIGNED_IN: RenderWithProvidersOptions = { session: { user: {} } };

function makeTrip(overrides: Partial<Trip> = {}): Trip {
  return {
    id: "trip-1",
    destination: "Lisbon",
    place: { kind: "city", placeId: "city-lisbon", countryCode: "PT", timeZone: "Europe/Lisbon", airportCode: "LIS" },
    title: null,
    startDate: "2026-09-26",
    endDate: "2026-10-02",
    archivedAt: null,
    createdAt: "2026-09-01T10:00:00.000Z",
    updatedAt: "2026-09-01T10:00:00.000Z",
    ...overrides,
  };
}

function knownAirport(code: string) {
  const airport = findAirportByCode(code);
  if (airport === undefined) throw new Error(`fixture airport "${code}" missing from directory`);
  return airport;
}

/** A domain segment for the "Транспорт" block tests; every field can be overridden. */
function makeSegment(overrides: Partial<Segment> = {}): Segment {
  return {
    id: "segment-1",
    tripId: "trip-1",
    from: knownAirport("KRK"),
    to: knownAirport("OPO"),
    departureAt: new Date("2026-09-27T08:00:00.000Z"),
    arrivalAt: new Date("2026-09-27T12:00:00.000Z"),
    flightNumber: "LO1234",
    carrierCode: "LO",
    baggageIncluded: true,
    passengers: 2,
    seat: "12A",
    ticketNumber: "1234567890",
    ...overrides,
  };
}

const ARCHIVED_AT = "2026-09-10T10:00:00.000Z";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

let announce: jest.SpyInstance;
let alertSpy: jest.SpyInstance;

beforeEach(() => {
  jest.clearAllMocks();
  for (const mock of [getTripMock, archiveMock, unarchiveMock, deleteMock, listSegmentsMock, listHotelsMock]) mock.mockReset();
  listHotelsMock.mockResolvedValue({ ok: true, data: [] });
  // Default: no segments, so every test not about the transport block keeps seeing the old
  // dashed empty state (AC-74) without opting in explicitly.
  listSegmentsMock.mockResolvedValue({ ok: true, data: [] });
  mockRouter.canGoBack.mockReturnValue(true);
  announce = jest.spyOn(AccessibilityInfo, "announceForAccessibility").mockImplementation(() => undefined);
  alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => undefined);
});

afterEach(() => {
  announce.mockRestore();
  alertSpy.mockRestore();
});

async function renderDetail(trip: Trip | null, tripId = trip?.id ?? "missing") {
  getTripMock.mockResolvedValue(trip === null ? { ok: false, kind: "notFound" } : { ok: true, data: trip });
  const result = await renderWithProviders(<TripDetailScreen tripId={tripId} />, SIGNED_IN);
  await waitFor(() => expect(result.queryClient.isFetching()).toBe(0));
  return result;
}

const openMenu = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.press(await screen.findByRole("button", { name: "More actions" }));
  return screen.getByTestId("trip-actions-menu");
};

const buttonNames = (root: Parameters<typeof within>[0]) =>
  within(root)
    .getAllByRole("button")
    .map((button) => button.props.accessibilityLabel as string);

describe("TripDetailScreen (S7) — header", () => {
  it("shows the place, the status chip and the range with nights in the mono face", async () => {
    await renderDetail(makeTrip());
    const hero = screen.getByTestId("trip-hero");
    const place = within(hero).getByRole("header", { name: "Lisbon" });
    expect(place).toBeOnTheScreen();
    expect(place).not.toHaveStyle({ fontFamily: family.mono });
    expect(within(hero).getByText("in 5 days")).toBeOnTheScreen();
    const dates = within(hero).getByText("Sep 26 – Oct 2, 2026 · 6 nights");
    expect(dates).toHaveStyle({ fontFamily: family.mono });
  });

  it("says \"no date chosen\" (not mono) for a trip without dates", async () => {
    await renderDetail(makeTrip({ startDate: null, endDate: null }));
    const dates = within(screen.getByTestId("trip-hero")).getByText("no date chosen");
    expect(dates).not.toHaveStyle({ fontFamily: family.mono });
    expect(within(screen.getByTestId("trip-hero")).getByText("plan")).toBeOnTheScreen();
  });

  it("resolves the place in the UI language", async () => {
    getTripMock.mockResolvedValue({ ok: true, data: makeTrip() });
    const result = await renderWithProviders(<TripDetailScreen tripId="trip-1" />, { ...SIGNED_IN, locale: "ru" });
    await waitFor(() => expect(result.queryClient.isFetching()).toBe(0));
    expect(within(screen.getByTestId("trip-hero")).getByRole("header", { name: "Лиссабон" })).toBeOnTheScreen();
  });

  it("shows a chip per archive state: archived trips read \"archived\"", async () => {
    await renderDetail(makeTrip({ archivedAt: ARCHIVED_AT }));
    expect(within(screen.getByTestId("trip-hero")).getByText("archived")).toBeOnTheScreen();
  });

  it("uses a real, labelled button for \"…\" and no soon badge", async () => {
    await renderDetail(makeTrip());
    expect(screen.getByRole("button", { name: "More actions" })).toBeOnTheScreen();
    expect(screen.queryByText("Coming soon")).toBeNull();
    expect(screen.queryByText("…")).toBeNull();
  });

  it("goes back with the back button", async () => {
    const user = userEvent.setup();
    await renderDetail(makeTrip());
    await user.press(screen.getByRole("button", { name: "Back" }));
    expect(mockRouter.back).toHaveBeenCalledTimes(1);
  });
});

describe("TripDetailScreen (S7) — loading, errors, not found", () => {
  it("shows a skeleton with a busy progressbar (no spinner) while loading", async () => {
    const pending = deferred<unknown>();
    getTripMock.mockReturnValue(pending.promise);
    await renderWithProviders(<TripDetailScreen tripId="trip-1" />, SIGNED_IN);
    expect(screen.getByRole("progressbar", { name: "Loading trips" })).toBeOnTheScreen();
    expect(screen.UNSAFE_queryAllByType(ActivityIndicator)).toHaveLength(0);
    expect(screen.queryByTestId("trip-hero")).toBeNull();
    await act(async () => {
      pending.resolve({ ok: true, data: makeTrip() });
    });
    expect(await screen.findByTestId("trip-hero")).toBeOnTheScreen();
  });

  it("shows the load error with Retry, and Retry asks the api again", async () => {
    const user = userEvent.setup();
    getTripMock.mockResolvedValue({ ok: false, kind: "offline" });
    const result = await renderWithProviders(<TripDetailScreen tripId="trip-1" />, SIGNED_IN);
    await screen.findByTestId("trip-load-error");
    expect(screen.getByText("Could not load the trip")).toBeOnTheScreen();
    expect(screen.getByText("No connection. Check your internet and try again")).toBeOnTheScreen();
    expect(screen.queryByTestId("trip-not-found")).toBeNull();

    getTripMock.mockResolvedValue({ ok: true, data: makeTrip() });
    await user.press(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByTestId("trip-hero")).toBeOnTheScreen();
    expect(getTripMock).toHaveBeenCalledTimes(2);
    expect(result.queryClient.isFetching()).toBe(0);
  });

  const HOSTILE_IDS = [
    ["a nonexistent id", "no-such-trip"],
    ["a hostile path-like id", "../../etc"],
    ["another user's id", "someone-elses-trip"],
    ["a deleted trip", "deleted-trip"],
  ] as const;

  it.each(HOSTILE_IDS)("shows the same \"Trip not found\" state for %s and no other trip", async (_name, id) => {
    const user = userEvent.setup();
    await renderDetail(null, id);
    const state = await screen.findByTestId("trip-not-found");
    expect(within(state).getByText("Trip not found")).toBeOnTheScreen();
    expect(within(state).getByText("It may have been deleted, or the link is out of date.")).toBeOnTheScreen();
    expect(screen.queryByTestId("trip-hero")).toBeNull();
    // Exactly the requested id was asked for; nothing else is substituted.
    expect(getTripMock).toHaveBeenCalledTimes(1);
    expect(getTripMock).toHaveBeenCalledWith(id);
    expect(announce).toHaveBeenCalledWith("Trip not found");

    await user.press(within(state).getByRole("button", { name: "Back to trips" }));
    expect(mockRouter.back).toHaveBeenCalledTimes(1);
  });

  it("returns to the Trips tab when there is no history to go back to", async () => {
    const user = userEvent.setup();
    mockRouter.canGoBack.mockReturnValue(false);
    await renderDetail(null, "gone");
    await user.press(await screen.findByRole("button", { name: "Back to trips" }));
    expect(mockRouter.replace).toHaveBeenCalledWith("/trips");
    expect(mockRouter.back).not.toHaveBeenCalled();
  });
});

describe("TripDetailScreen (S7) — booking blocks", () => {
  it("renders three empty blocks with a dashed frame, plus icon and caption, and no cards", async () => {
    await renderDetail(makeTrip());
    expect(screen.getByRole("header", { name: "Transport" })).toBeOnTheScreen();
    expect(screen.getByRole("header", { name: "Hotel" })).toBeOnTheScreen();
    expect(screen.getByRole("header", { name: "Car rental" })).toBeOnTheScreen();

    for (const [testID, caption] of [
      ["empty-flight", "Add flight"],
      ["empty-hotel", "Add hotel"],
      ["empty-car", "Add car"],
    ] as const) {
      const block = screen.getByTestId(testID);
      expect(block).toHaveStyle({ borderStyle: "dashed", borderColor: darkTokens.surfaceBorder });
      expect(within(block).getByText(caption)).toHaveStyle({ color: darkTokens.textSecondary });
      // The plus is an icon (decorative, hidden from assistive tech), never a "+" text glyph.
      expect(within(block).queryByText("+")).toBeNull();
      expect(within(block).UNSAFE_getByType(Icon).props.name).toBe("plus");
    }
    expect(screen.queryByTestId(/card/)).toBeNull();
    expect(screen.queryByText("Memmo Alfama")).toBeNull();
    expect(screen.queryByText(/insurance|documents/i)).toBeNull();
  });

  it("shows ONE add button per empty block (no header plus) and opens the forms with the id as a param", async () => {
    const user = userEvent.setup();
    await renderDetail(makeTrip({ id: "../../etc" }));
    expect(screen.queryByTestId("add-flight")).toBeNull();
    expect(screen.queryByTestId("add-hotel")).toBeNull();
    expect(screen.queryByTestId("add-car")).toBeNull();
    await user.press(within(screen.getByTestId("section-flights")).getByTestId("empty-flight"));
    expect(mockRouter.push).toHaveBeenLastCalledWith({
      pathname: "/trips/[tripId]/flights/new",
      params: { tripId: "../../etc" },
    });
    await user.press(screen.getByTestId("empty-hotel"));
    expect(mockRouter.push).toHaveBeenLastCalledWith({
      pathname: "/trips/[tripId]/hotels/new",
      params: { tripId: "../../etc" },
    });
    await user.press(screen.getByTestId("empty-car"));
    expect(mockRouter.push).toHaveBeenLastCalledWith({
      pathname: "/trips/[tripId]/cars/new",
      params: { tripId: "../../etc" },
    });
  });

  it("gives every button a non-empty accessibility label", async () => {
    await renderDetail(makeTrip());
    for (const button of screen.getAllByRole("button")) {
      expect(String(button.props.accessibilityLabel ?? "").length).toBeGreaterThan(0);
    }
  });
});

describe("TripDetailScreen (S7) — Hotel block (SPEC-05 AC-35..38)", () => {
  const late = makeHotel({ id: "h-late", name: "Late Inn", checkInDate: "2026-06-20", breakfast: "all" });
  const early = makeHotel({ id: "h-early", name: "Early Inn", checkInDate: "2026-06-10" });

  it("zero hotels: dashed empty state, no header plus (AC-36)", async () => {
    await renderDetail(makeTrip());
    expect(screen.getByTestId("empty-hotel")).toBeOnTheScreen();
    expect(screen.queryByTestId("add-hotel")).toBeNull();
    expect(screen.queryByTestId("hotel-block")).toBeNull();
  });

  it("a failing hotel list keeps the empty state and the screen alive", async () => {
    listHotelsMock.mockResolvedValue({ ok: false, kind: "network" });
    await renderDetail(makeTrip());
    expect(screen.getByTestId("empty-hotel")).toBeOnTheScreen();
    expect(screen.getByTestId("trip-detail-screen")).toBeOnTheScreen();
  });

  it("two hotels: cards by check-in, breakfast chip, header plus visible, no empty state (AC-35, AC-36)", async () => {
    listHotelsMock.mockResolvedValue({ ok: true, data: [late, early] });
    const user = userEvent.setup();
    await renderDetail(makeTrip());
    await screen.findByTestId("hotel-block");
    const names = screen.getAllByText(/^(Early|Late) Inn$/).map((node) => node.props.children);
    expect(names).toEqual(["Early Inn", "Late Inn"]);
    expect(screen.queryByTestId("empty-hotel")).toBeNull();
    expect(screen.getByText(/breakfast/i)).toBeOnTheScreen();
    await user.press(screen.getByTestId("add-hotel"));
    expect(mockRouter.push).toHaveBeenLastCalledWith({ pathname: "/trips/[tripId]/hotels/new", params: { tripId: "trip-1" } });
  });

  it("a tap on a card opens the edit route with the raw id in params (AC-37)", async () => {
    listHotelsMock.mockResolvedValue({ ok: true, data: [early] });
    const user = userEvent.setup();
    await renderDetail(makeTrip());
    await user.press(await screen.findByTestId("hotel-block-hotel-h-early"));
    expect(mockRouter.push).toHaveBeenLastCalledWith({
      pathname: "/trips/[tripId]/hotels/[hotelId]",
      params: { tripId: "trip-1", hotelId: "h-early" },
    });
  });

  it("refreshes after the list is invalidated by a mutation (AC-38)", async () => {
    const result = await renderDetail(makeTrip());
    expect(screen.getByTestId("empty-hotel")).toBeOnTheScreen();
    listHotelsMock.mockResolvedValue({ ok: true, data: [early] });
    await act(async () => {
      await result.queryClient.invalidateQueries({ queryKey: hotelKeys.ofTrip("trip-1") });
    });
    await screen.findByTestId("hotel-block");
    expect(screen.queryByTestId("empty-hotel")).toBeNull();
  });
});

describe("TripDetailScreen (S7) — Транспорт block (PLAN-04 step 10)", () => {
  it("keeps the dashed empty state for zero segments (AC-74)", async () => {
    listSegmentsMock.mockResolvedValue({ ok: true, data: [] });
    await renderDetail(makeTrip());
    expect(screen.getByTestId("empty-flight")).toBeOnTheScreen();
    expect(screen.queryByTestId("transport-block")).toBeNull();
  });

  it("shows one card for a single-segment trip, and the header plus is back (AC-71)", async () => {
    listSegmentsMock.mockResolvedValue({ ok: true, data: [makeSegment()] });
    await renderDetail(makeTrip());
    expect(await screen.findByTestId("transport-block")).toBeOnTheScreen();
    expect(screen.getByTestId("transport-block-segment-segment-1")).toBeOnTheScreen();
    expect(screen.getByTestId("add-flight")).toBeOnTheScreen();
    expect(screen.queryByTestId("empty-flight")).toBeNull();
    expect(screen.getAllByText("KRK")).toHaveLength(1);
  });

  it("shows a card for EACH of four segments on an open route (AC-71, AC-72)", async () => {
    listSegmentsMock.mockResolvedValue({
      ok: true,
      data: [
        makeSegment({ id: "s1", from: knownAirport("KRK"), to: knownAirport("OPO"), departureAt: new Date("2026-09-27T08:00:00.000Z"), arrivalAt: new Date("2026-09-27T10:00:00.000Z") }),
        makeSegment({ id: "s2", from: knownAirport("OPO"), to: knownAirport("BCN"), departureAt: new Date("2026-09-27T13:00:00.000Z"), arrivalAt: new Date("2026-09-27T15:00:00.000Z") }),
        makeSegment({ id: "s3", from: knownAirport("BCN"), to: knownAirport("VIE"), departureAt: new Date("2026-09-27T18:00:00.000Z"), arrivalAt: new Date("2026-09-27T20:00:00.000Z") }),
        makeSegment({ id: "s4", from: knownAirport("VIE"), to: knownAirport("GRO"), departureAt: new Date("2026-09-28T08:00:00.000Z"), arrivalAt: new Date("2026-09-28T10:00:00.000Z") }),
      ],
    });
    await renderDetail(makeTrip());
    expect(await screen.findByTestId("transport-block")).toBeOnTheScreen();
    for (const id of ["s1", "s2", "s3", "s4"]) {
      expect(screen.getByTestId(`transport-block-segment-${id}`)).toBeOnTheScreen();
    }
    expect(screen.getByText("KRK · OPO · BCN · VIE · GRO")).toBeOnTheScreen();
  });

  it("shows the 'not closed' banner and navigates to the route screen on tap (AC-73)", async () => {
    const user = userEvent.setup();
    listSegmentsMock.mockResolvedValue({ ok: true, data: [makeSegment()] }); // KRK -> OPO, never returns: open route.
    await renderDetail(makeTrip());
    const banner = await screen.findByTestId("transport-block-not-closed");
    await user.press(banner);
    expect(mockRouter.push).toHaveBeenCalledWith({ pathname: "/trips/[tripId]/route", params: { tripId: "trip-1" } });
  });

  it("the summary row also navigates to the route screen on tap", async () => {
    const user = userEvent.setup();
    listSegmentsMock.mockResolvedValue({ ok: true, data: [makeSegment()] });
    await renderDetail(makeTrip());
    await user.press(await screen.findByTestId("transport-block-summary"));
    expect(mockRouter.push).toHaveBeenCalledWith({ pathname: "/trips/[tripId]/route", params: { tripId: "trip-1" } });
  });

  it("tapping a segment card opens its edit form with the segment id as a param", async () => {
    const user = userEvent.setup();
    listSegmentsMock.mockResolvedValue({ ok: true, data: [makeSegment({ id: "segment-42" })] });
    await renderDetail(makeTrip());
    await user.press(await screen.findByTestId("transport-block-segment-segment-42"));
    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: "/trips/[tripId]/flights/[flightId]",
      params: { tripId: "trip-1", flightId: "segment-42" },
    });
  });

  it("renders no 'not closed' banner for a closed route", async () => {
    listSegmentsMock.mockResolvedValue({
      ok: true,
      data: [
        makeSegment({ id: "s1", from: knownAirport("KRK"), to: knownAirport("OPO"), departureAt: new Date("2026-09-27T08:00:00.000Z"), arrivalAt: new Date("2026-09-27T10:00:00.000Z") }),
        makeSegment({ id: "s2", from: knownAirport("OPO"), to: knownAirport("KRK"), departureAt: new Date("2026-09-27T13:00:00.000Z"), arrivalAt: new Date("2026-09-27T15:00:00.000Z") }),
      ],
    });
    await renderDetail(makeTrip());
    expect(await screen.findByTestId("transport-block")).toBeOnTheScreen();
    expect(screen.queryByTestId("transport-block-not-closed")).toBeNull();
  });
});

describe("TripDetailScreen (S7) — the \"…\" menu", () => {
  it("offers Edit and Move to archive for a live trip, and nothing else", async () => {
    const user = userEvent.setup();
    await renderDetail(makeTrip());
    const menu = await openMenu(user);
    expect(buttonNames(menu)).toEqual(["Edit", "Move to archive"]);
    expect(screen.queryByText("Delete permanently")).toBeNull();
  });

  it("offers Edit, Restore and Delete permanently for an archived trip", async () => {
    const user = userEvent.setup();
    await renderDetail(makeTrip({ archivedAt: ARCHIVED_AT }));
    const menu = await openMenu(user);
    expect(buttonNames(menu)).toEqual(["Edit", "Restore from archive", "Delete permanently"]);
  });

  it("never offers deletion for a live trip: not while archiving, not after a failure", async () => {
    const user = userEvent.setup();
    await renderDetail(makeTrip());
    const inFlight = deferred<unknown>();
    archiveMock.mockReturnValueOnce(inFlight.promise);
    await openMenu(user);
    await user.press(screen.getByRole("button", { name: "Move to archive" }));
    expect(screen.queryByText("Delete permanently")).toBeNull();
    await act(async () => {
      inFlight.resolve({ ok: false, kind: "offline" });
    });
    await screen.findByTestId("trip-actions-error");
    expect(screen.queryByText("Delete permanently")).toBeNull();
    expect(screen.queryByTestId("menu-delete")).toBeNull();
    expect(deleteMock).not.toHaveBeenCalled();
  });

  it("closes on the backdrop without changing anything", async () => {
    const user = userEvent.setup();
    await renderDetail(makeTrip());
    await openMenu(user);
    await user.press(screen.getByTestId("trip-sheet-backdrop"));
    expect(screen.queryByTestId("trip-actions-menu")).toBeNull();
    expect(archiveMock).not.toHaveBeenCalled();
  });

  it("Edit opens the edit route with the id as a param", async () => {
    const user = userEvent.setup();
    await renderDetail(makeTrip());
    await openMenu(user);
    await user.press(screen.getByRole("button", { name: "Edit" }));
    expect(mockRouter.push).toHaveBeenCalledWith({ pathname: "/trips/[tripId]/edit", params: { tripId: "trip-1" } });
    expect(screen.queryByTestId("trip-actions-menu")).toBeNull();
  });

  it("makes the screen behind an open sheet inaccessible and restores it on close", async () => {
    const user = userEvent.setup();
    await renderDetail(makeTrip());
    await openMenu(user);
    expect(screen.queryByRole("header", { name: "Transport" })).toBeNull();
    await user.press(screen.getByTestId("trip-sheet-backdrop"));
    expect(screen.getByRole("header", { name: "Transport" })).toBeOnTheScreen();
  });
});

describe("TripDetailScreen (S7) — archive and restore", () => {
  it("archives, keeps the screen open and working, and announces the result", async () => {
    const user = userEvent.setup();
    await renderDetail(makeTrip());
    archiveMock.mockResolvedValue({ ok: true, data: makeTrip({ archivedAt: ARCHIVED_AT }) });
    getTripMock.mockResolvedValue({ ok: true, data: makeTrip({ archivedAt: ARCHIVED_AT }) });
    await openMenu(user);
    await user.press(screen.getByRole("button", { name: "Move to archive" }));

    await waitFor(() => expect(within(screen.getByTestId("trip-hero")).getByText("archived")).toBeOnTheScreen());
    expect(archiveMock).toHaveBeenCalledTimes(1);
    expect(archiveMock).toHaveBeenCalledWith("trip-1");
    expect(screen.getByTestId("trip-hero")).toBeOnTheScreen();
    expect(screen.queryByTestId("trip-not-found")).toBeNull();
    expect(mockRouter.back).not.toHaveBeenCalled();
    expect(announce).toHaveBeenCalledWith("Trip moved to the archive");
    expect(screen.queryByTestId("trip-actions-menu")).toBeNull();

    // Still working: the menu now offers the archived composition.
    const menu = await openMenu(user);
    expect(buttonNames(menu)).toEqual(["Edit", "Restore from archive", "Delete permanently"]);
  });

  it.each([
    ["future dates", { startDate: "2026-10-05", endDate: "2026-10-09" }, "in 14 days"],
    ["past dates", { startDate: "2026-08-01", endDate: "2026-08-05" }, "completed"],
    ["no dates", { startDate: null, endDate: null }, "plan"],
  ] as const)("restores an archived trip by its dates (%s)", async (_name, dates, chip) => {
    const user = userEvent.setup();
    await renderDetail(makeTrip({ ...dates, archivedAt: ARCHIVED_AT }));
    const restored = makeTrip({ ...dates });
    unarchiveMock.mockResolvedValue({ ok: true, data: restored });
    getTripMock.mockResolvedValue({ ok: true, data: restored });
    await openMenu(user);
    await user.press(screen.getByRole("button", { name: "Restore from archive" }));

    await waitFor(() => expect(within(screen.getByTestId("trip-hero")).getByText(chip)).toBeOnTheScreen());
    expect(unarchiveMock).toHaveBeenCalledWith("trip-1");
    expect(announce).toHaveBeenCalledWith("Trip restored from the archive");
    expect(mockRouter.back).not.toHaveBeenCalled();
    const menu = await openMenu(user);
    expect(buttonNames(menu)).toEqual(["Edit", "Move to archive"]);
  });

  it("sends exactly one request for a double tap on Move to archive", async () => {
    const user = userEvent.setup();
    await renderDetail(makeTrip());
    const inFlight = deferred<unknown>();
    archiveMock.mockReturnValue(inFlight.promise);
    await openMenu(user);
    const item = screen.getByRole("button", { name: "Move to archive" });
    fireEvent.press(item);
    fireEvent.press(item);
    await act(async () => {
      inFlight.resolve({ ok: true, data: makeTrip({ archivedAt: ARCHIVED_AT }) });
    });
    expect(archiveMock).toHaveBeenCalledTimes(1);
  });

  it("keeps the state and shows the failure on screen (not an alert); one tap retries", async () => {
    const user = userEvent.setup();
    await renderDetail(makeTrip());
    archiveMock.mockResolvedValueOnce({ ok: false, kind: "offline" });
    await openMenu(user);
    await user.press(screen.getByRole("button", { name: "Move to archive" }));

    const error = await screen.findByTestId("trip-actions-error");
    expect(error).toHaveTextContent("No connection. Check your internet and try again");
    expect(announce).toHaveBeenCalledWith("No connection. Check your internet and try again");
    expect(alertSpy).not.toHaveBeenCalled();
    // Unchanged: still not archived, the menu is still the live one, the sheet is still open.
    expect(within(screen.getByTestId("trip-actions-menu")).getByRole("button", { name: "Move to archive" })).toBeOnTheScreen();

    archiveMock.mockResolvedValueOnce({ ok: true, data: makeTrip({ archivedAt: ARCHIVED_AT }) });
    getTripMock.mockResolvedValue({ ok: true, data: makeTrip({ archivedAt: ARCHIVED_AT }) });
    await user.press(screen.getByRole("button", { name: "Move to archive" }));
    await waitFor(() => expect(within(screen.getByTestId("trip-hero")).getByText("archived")).toBeOnTheScreen());
    expect(archiveMock).toHaveBeenCalledTimes(2);
  });

  it("switches to \"Trip not found\" when the trip vanished under the action", async () => {
    const user = userEvent.setup();
    await renderDetail(makeTrip());
    archiveMock.mockResolvedValue({ ok: false, kind: "notFound" });
    getTripMock.mockResolvedValue({ ok: false, kind: "notFound" });
    await openMenu(user);
    await user.press(screen.getByRole("button", { name: "Move to archive" }));
    expect(await screen.findByTestId("trip-not-found")).toBeOnTheScreen();
  });
});

describe("TripDetailScreen (S7) — delete permanently", () => {
  const archivedTrip = () => makeTrip({ archivedAt: ARCHIVED_AT });

  async function askForDeletionWithClient(user: ReturnType<typeof userEvent.setup>) {
    const { queryClient } = await renderDetail(archivedTrip());
    await openMenu(user);
    await user.press(screen.getByRole("button", { name: "Delete permanently" }));
    return { queryClient, sheet: screen.getByTestId("confirm-delete-sheet") };
  }

  async function askForDeletion(user: ReturnType<typeof userEvent.setup>) {
    return (await askForDeletionWithClient(user)).sheet;
  }

  it("asks first, names the irreversibility, and calls nothing before the confirm", async () => {
    const user = userEvent.setup();
    const sheet = await askForDeletion(user);
    expect(within(sheet).getByRole("header", { name: "Delete this trip permanently?" })).toBeOnTheScreen();
    expect(within(sheet).getByText(/can't be restored/)).toBeOnTheScreen();
    expect(within(sheet).getByText(/Lisbon/)).toBeOnTheScreen();
    expect(deleteMock).not.toHaveBeenCalled();
    expect(alertSpy).not.toHaveBeenCalled();

    // Cancel: nothing is deleted and the screen stays.
    await user.press(within(sheet).getByRole("button", { name: "Cancel" }));
    expect(screen.queryByTestId("confirm-delete-sheet")).toBeNull();
    expect(deleteMock).not.toHaveBeenCalled();
    expect(screen.getByTestId("trip-hero")).toBeOnTheScreen();
  });

  it("names the trip by its own title when it has one", async () => {
    const user = userEvent.setup();
    await renderDetail(makeTrip({ archivedAt: ARCHIVED_AT, title: "Summer 26" }));
    await openMenu(user);
    await user.press(screen.getByRole("button", { name: "Delete permanently" }));
    expect(within(screen.getByTestId("confirm-delete-sheet")).getByText(/Summer 26/)).toBeOnTheScreen();
  });

  it("deletes once after the confirm, then returns to the list the user came from", async () => {
    const user = userEvent.setup();
    const sheet = await askForDeletion(user);
    deleteMock.mockResolvedValue({ ok: true, data: { id: "trip-1" } });
    await user.press(within(sheet).getByRole("button", { name: "Delete permanently" }));

    await waitFor(() => expect(mockRouter.back).toHaveBeenCalledTimes(1));
    expect(deleteMock).toHaveBeenCalledTimes(1);
    expect(deleteMock).toHaveBeenCalledWith("trip-1");
    expect(announce).toHaveBeenCalledWith("Trip deleted");
    // The open screen never flashes "not found" on the way out.
    expect(screen.queryByTestId("trip-not-found")).toBeNull();
  });

  it("sends exactly one request for a double tap on the confirm", async () => {
    const user = userEvent.setup();
    const sheet = await askForDeletion(user);
    const inFlight = deferred<unknown>();
    deleteMock.mockReturnValue(inFlight.promise);
    const confirm = within(sheet).getByRole("button", { name: "Delete permanently" });
    fireEvent.press(confirm);
    fireEvent.press(confirm);
    expect(await screen.findByTestId("confirm-delete-spinner")).toBeOnTheScreen();
    await act(async () => {
      inFlight.resolve({ ok: true, data: { id: "trip-1" } });
    });
    expect(deleteMock).toHaveBeenCalledTimes(1);
  });

  it("keeps the confirmation and the trip when the delete fails, and retries in one tap", async () => {
    const user = userEvent.setup();
    const sheet = await askForDeletion(user);
    deleteMock.mockResolvedValueOnce({ ok: false, kind: "timeout" });
    await user.press(within(sheet).getByRole("button", { name: "Delete permanently" }));

    expect(await screen.findByTestId("confirm-delete-error")).toHaveTextContent(
      "The server is taking too long. Try again",
    );
    expect(mockRouter.back).not.toHaveBeenCalled();
    expect(alertSpy).not.toHaveBeenCalled();

    deleteMock.mockResolvedValueOnce({ ok: true, data: { id: "trip-1" } });
    await user.press(screen.getByRole("button", { name: "Delete permanently" }));
    await waitFor(() => expect(mockRouter.back).toHaveBeenCalledTimes(1));
    expect(deleteMock).toHaveBeenCalledTimes(2);
  });

  it("does not delete a trip that stopped being archived while the confirmation was open", async () => {
    const user = userEvent.setup();
    const { queryClient, sheet } = await askForDeletionWithClient(user);
    // Restored from another device and refetched while the confirmation is on screen.
    act(() => {
      queryClient.setQueryData(tripKeys.one("trip-1"), makeTrip());
    });
    await user.press(within(sheet).getByRole("button", { name: "Delete permanently" }));
    expect(deleteMock).not.toHaveBeenCalled();
  });
});
