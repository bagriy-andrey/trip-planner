import { act, screen, userEvent, waitFor } from "@testing-library/react-native";
import type { Segment, Trip } from "@tripplanner/shared";
import { Alert } from "react-native";

import { renderWithProviders } from "@/test-utils/renderWithProviders";

import { createSegment, deleteSegment, getSegment, listSegments, updateSegment } from "@/features/transport/api";
import { getTrip } from "@/features/trips/api";
import { SegmentFormScreen } from "../SegmentFormScreen";

jest.mock("@/lib/supabase", () => ({ supabase: { from: jest.fn() } }));
jest.mock("@/features/trips/api", () => ({
  ...jest.requireActual("@/features/trips/api"),
  getTrip: jest.fn(),
}));
jest.mock("@/features/transport/api", () => ({
  ...jest.requireActual("@/features/transport/api"),
  listSegments: jest.fn(),
  getSegment: jest.fn(),
  createSegment: jest.fn(),
  updateSegment: jest.fn(),
  deleteSegment: jest.fn(),
}));

const mockRouter = { push: jest.fn(), replace: jest.fn(), navigate: jest.fn(), back: jest.fn(), dismissAll: jest.fn() };
jest.mock("expo-router", () => ({
  useRouter: () => mockRouter,
  useNavigation: () => ({ addListener: () => () => undefined }),
}));

const getTripMock = getTrip as jest.Mock;
const listSegmentsMock = listSegments as jest.Mock;
const getSegmentMock = getSegment as jest.Mock;
const createSegmentMock = createSegment as jest.Mock;
const updateSegmentMock = updateSegment as jest.Mock;
const deleteSegmentMock = deleteSegment as jest.Mock;

const SIGNED_IN = { session: { user: {} } } as const;

const KRAKOW_PLACE = {
  kind: "city" as const,
  placeId: "city-krakow",
  countryCode: "PL",
  timeZone: "Europe/Warsaw",
  airportCode: "KRK",
};

function makeTrip(overrides: Partial<Trip> = {}): Trip {
  return {
    id: "trip-1",
    destination: "Somewhere",
    // Free-text/no-dates by default: most tests are not exercising the first-segment prefill
    // (AC-38 has its own describe block with an explicit city trip) and a pre-populated "from"
    // field would break plain `userEvent.type` (it appends, it does not replace).
    place: { kind: "custom" },
    title: null,
    startDate: null,
    endDate: null,
    archivedAt: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeSegment(overrides: Partial<Segment> = {}): Segment {
  return {
    id: "segment-1",
    tripId: "trip-1",
    from: { id: "airport-krk", kind: "airport", iata: "KRK", ru: "Аэропорт «Краков»", en: "Krakow Airport", cityId: "city-krakow", countryCode: "PL", timeZone: "Europe/Warsaw", isPrimary: true },
    to: { id: "airport-opo", kind: "airport", iata: "OPO", ru: "Аэропорт «Порту»", en: "Porto Airport", cityId: "city-porto", countryCode: "PT", timeZone: "Europe/Lisbon", isPrimary: true },
    departureAt: new Date("2026-06-15T08:00:00.000Z"),
    arrivalAt: new Date("2026-06-15T12:00:00.000Z"),
    flightNumber: "LO1234",
    carrierCode: "LO",
    baggageIncluded: true,
    passengers: 2,
    seat: "12A",
    ticketNumber: "1234567890",
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  getTripMock.mockResolvedValue({ ok: true, data: makeTrip() });
  listSegmentsMock.mockResolvedValue({ ok: true, data: [] });
  createSegmentMock.mockResolvedValue({ ok: true, data: makeSegment({ id: "segment-new" }) });
  updateSegmentMock.mockResolvedValue({ ok: true, data: makeSegment() });
  deleteSegmentMock.mockResolvedValue({ ok: true, data: { id: "segment-1" } });
});

async function renderCreate(tripOverrides: Partial<Trip> = {}, segments: Segment[] = []) {
  getTripMock.mockResolvedValue({ ok: true, data: makeTrip(tripOverrides) });
  listSegmentsMock.mockResolvedValue({ ok: true, data: segments });
  await renderWithProviders(<SegmentFormScreen tripId="trip-1" />, SIGNED_IN);
  await screen.findByTestId("segment-form-flight-number");
}

async function renderEdit(segment: Segment = makeSegment()) {
  getSegmentMock.mockResolvedValue({ ok: true, data: segment });
  await renderWithProviders(<SegmentFormScreen tripId="trip-1" segmentId={segment.id} />, SIGNED_IN);
  await screen.findByTestId("segment-form-flight-number");
}

const saveNextButton = () => screen.getByRole("button", { name: "Save and add next" });
const saveButton = () => screen.getByRole("button", { name: "Save" });

describe("SegmentFormScreen — field order and composition (AC-25)", () => {
  it("renders exactly the fields from the design spec, in order", async () => {
    await renderCreate();
    const json = JSON.stringify(screen.toJSON());
    const order = [
      "segment-form-flight-number",
      "segment-form-from",
      "segment-form-to",
      "segment-form-departure",
      "segment-form-arrival",
      "segment-form-baggage",
      "segment-form-passengers",
      "segment-form-seat",
      "segment-form-ticket",
    ];
    const positions = order.map((id) => json.indexOf(`"${id}"`));
    for (const position of positions) expect(position).toBeGreaterThan(-1);
    for (let i = 1; i < positions.length; i++) {
      expect(positions[i]).toBeGreaterThan(positions[i - 1]!);
    }
    // No round-trip checkbox, no transport-mode picker, no currency/price fields (spec stop-list).
    expect(screen.queryByText(/round.?trip/i)).not.toBeOnTheScreen();
  });
});

describe("SegmentFormScreen — save button gating (AC-26)", () => {
  it("stays disabled until the four required values are filled", async () => {
    await renderCreate();
    expect(saveButton()).toBeDisabled();

    await userEvent.type(screen.getByTestId("segment-form-from"), "KRK");
    await userEvent.press(await screen.findByTestId("airport-suggestion-airport-krk"));
    expect(saveButton()).toBeDisabled();

    await userEvent.type(screen.getByTestId("segment-form-to"), "OPO");
    await userEvent.press(await screen.findByTestId("airport-suggestion-airport-opo"));
    expect(saveButton()).toBeDisabled();

    await userEvent.press(screen.getByTestId("segment-form-departure-date"));
    expect(saveButton()).toBeDisabled();

    await userEvent.press(screen.getByTestId("segment-form-departure-time"));
    expect(saveButton()).toBeEnabled();
  });
});

describe("SegmentFormScreen — airport field (AC-33, AC-34)", () => {
  it("shows the directory hint and keeps save disabled for free text ('Kozyatin')", async () => {
    await renderCreate();
    await userEvent.type(screen.getByTestId("segment-form-from"), "Kozyatin");
    expect(screen.getByText("Choose an airport from the list; you can search by code")).toBeOnTheScreen();
    expect(saveNextButton()).toBeDisabled();
  });

  it("only a tapped suggestion counts as a selection, never typed text alone", async () => {
    await renderCreate();
    await userEvent.type(screen.getByTestId("segment-form-from"), "KRK");
    await screen.findByTestId("airport-suggestion-airport-krk");
    // Typed but not tapped: still shows the hint, not selected.
    expect(screen.getByText("Choose an airport from the list; you can search by code")).toBeOnTheScreen();
  });
});

describe("SegmentFormScreen — first-segment prefill (AC-38)", () => {
  it("prefills the departure airport and date for a city trip with no segments yet", async () => {
    await renderCreate({ place: KRAKOW_PLACE, startDate: "2026-06-15", endDate: "2026-06-20" });
    expect(screen.getByTestId("segment-form-from").props.value).toBe("Krakow Airport · KRK");
  });

  it("prefills nothing for a custom/free-text trip", async () => {
    await renderCreate();
    expect(screen.getByTestId("segment-form-from").props.value).toBe("");
  });

  it("does not prefill once the trip already has a segment", async () => {
    await renderCreate({ place: KRAKOW_PLACE, startDate: "2026-06-15", endDate: "2026-06-20" }, [makeSegment()]);
    expect(screen.getByTestId("segment-form-from").props.value).toBe("");
  });
});

async function fillMinimalSegment() {
  await userEvent.type(screen.getByTestId("segment-form-from"), "KRK");
  await userEvent.press(await screen.findByTestId("airport-suggestion-airport-krk"));
  await userEvent.type(screen.getByTestId("segment-form-to"), "OPO");
  await userEvent.press(await screen.findByTestId("airport-suggestion-airport-opo"));
  await userEvent.press(screen.getByTestId("segment-form-departure-date"));
  await userEvent.press(screen.getByTestId("segment-form-departure-time"));
}

describe("SegmentFormScreen — Save (AC-45)", () => {
  it("saves then returns to where the screen was opened from", async () => {
    await renderCreate();
    await fillMinimalSegment();
    await userEvent.press(saveButton());
    await waitFor(() => expect(createSegmentMock).toHaveBeenCalledTimes(1));
    expect(mockRouter.back).toHaveBeenCalledTimes(1);
  });
});

describe("SegmentFormScreen — header and buttons", () => {
  it("has a close cross and no Done in the header; Save is the primary and add-next the secondary", async () => {
    await renderCreate();
    expect(screen.queryByRole("button", { name: "Done" })).not.toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeOnTheScreen();
    expect(saveButton()).toBeOnTheScreen();
    expect(saveNextButton()).toBeOnTheScreen();
  });
});

describe("SegmentFormScreen — departure rules", () => {
  it("opens the departure calendar on the trip start when it is later than today (no earlier day is offered)", async () => {
    // With an existing segment nothing is prefilled, so the picker's start day is the calendar floor.
    await renderCreate({ startDate: "2026-12-01", endDate: "2026-12-10" }, [makeSegment()]);
    await fillMinimalSegment();
    expect(screen.getByTestId("segment-form-departure-date").props.accessibilityLabel).toContain("Dec 1, 2026");
    expect(saveButton()).toBeEnabled();
  });

  it("clears a chosen departure time and disables Save again", async () => {
    await renderCreate();
    await fillMinimalSegment();
    expect(saveButton()).toBeEnabled();
    await userEvent.press(screen.getByTestId("segment-form-departure-time-clear"));
    expect(saveButton()).toBeDisabled();
  });

  it("clears an arrival time again", async () => {
    await renderCreate();
    await userEvent.press(screen.getByTestId("segment-form-arrival-time"));
    await userEvent.press(screen.getByTestId("segment-form-arrival-time-clear"));
    expect(screen.queryByTestId("segment-form-arrival-time-clear")).toBeNull();
  });

  it("accepts a departure on or after the trip start", async () => {
    await renderCreate({ startDate: "2026-09-21", endDate: "2026-09-30" }, [makeSegment()]);
    await fillMinimalSegment();
    expect(screen.queryByText("Departure is before the trip starts")).not.toBeOnTheScreen();
    expect(saveButton()).toBeEnabled();
  });
});

describe("SegmentFormScreen — double tap (AC-46)", () => {
  it("results in exactly one api call", async () => {
    let resolveCreate!: (value: unknown) => void;
    createSegmentMock.mockReturnValue(new Promise((resolve) => (resolveCreate = resolve)));
    await renderCreate();
    await fillMinimalSegment();
    const button = saveNextButton();
    await userEvent.press(button);
    await userEvent.press(button);
    resolveCreate({ ok: true, data: makeSegment({ id: "segment-new" }) });
    await waitFor(() => expect(createSegmentMock).toHaveBeenCalledTimes(1));
  });
});

describe("SegmentFormScreen — save and add next (AC-41..AC-44)", () => {
  it("prefills 'from' with the just-saved segment's arrival airport and the date from arrival", async () => {
    createSegmentMock.mockResolvedValueOnce({
      ok: true,
      data: makeSegment({ id: "segment-new", arrivalAt: new Date("2026-06-15T16:00:00.000Z") }),
    });
    await renderCreate();
    await fillMinimalSegment();
    await userEvent.press(saveNextButton());
    await waitFor(() => expect(createSegmentMock).toHaveBeenCalledTimes(1));
    // "from" continues from the previous segment's arrival airport (OPO); "to" is nudged back to
    // the route's own start (KRK, since the route isn't closed yet).
    await waitFor(() => expect(screen.getByTestId("segment-form-from").props.value).toBe("Porto Airport · OPO"));
    expect(screen.getByTestId("segment-form-to").props.value).toBe("Krakow Airport · KRK");
  });

  it("an error leaves the user in the form with input preserved and a one-tap retry (AC-83)", async () => {
    createSegmentMock.mockRejectedValueOnce(new (jest.requireActual("@/features/trips/api").TripApiError)("offline"));
    createSegmentMock.mockResolvedValueOnce({ ok: true, data: makeSegment({ id: "segment-new" }) });
    await renderCreate();
    await fillMinimalSegment();
    await userEvent.press(saveNextButton());
    await screen.findByTestId("segment-form-error");
    expect(screen.getByTestId("segment-form-from").props.value).toBe("Krakow Airport · KRK");
    await userEvent.press(saveNextButton());
    await waitFor(() => expect(createSegmentMock).toHaveBeenCalledTimes(2));
  });
});

describe("SegmentFormScreen — edit mode (AC-76, AC-77)", () => {
  it("prefills every field, including a deliberately empty arrival", async () => {
    await renderEdit(makeSegment({ arrivalAt: null }));
    expect(screen.getByTestId("segment-form-flight-number").props.value).toBe("LO1234");
    expect(screen.getByTestId("segment-form-from").props.value).toBe("Krakow Airport · KRK");
    expect(screen.getByTestId("segment-form-to").props.value).toBe("Porto Airport · OPO");
    expect(screen.getByTestId("segment-form-seat").props.value).toBe("12A");
    expect(screen.getByTestId("segment-form-ticket").props.value).toBe("1234567890");
    // The empty-state button, not a resolved DatePicker: its label carries no date value.
    expect(screen.getByTestId("segment-form-arrival-date").props.accessibilityLabel).toBe("Arrival date");
  });

  it("saves through update, not create, even for a segment that already departed, and has no 'add next'", async () => {
    await renderEdit();
    expect(screen.queryByRole("button", { name: "Save and add next" })).not.toBeOnTheScreen();
    await userEvent.press(saveButton());
    await waitFor(() => expect(updateSegmentMock).toHaveBeenCalledTimes(1));
    expect(createSegmentMock).not.toHaveBeenCalled();
  });
});

describe("SegmentFormScreen — delete (AC-78, AC-79)", () => {
  it("asks for confirmation via the on-screen overlay, not a system Alert", async () => {
    const alertSpy = jest.spyOn(Alert, "alert");
    await renderEdit();
    await userEvent.press(screen.getByTestId("segment-form-delete"));
    expect(screen.getByTestId("segment-form-delete-confirm")).toBeOnTheScreen();
    expect(alertSpy).not.toHaveBeenCalled();
    expect(deleteSegmentMock).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  it("deletes only after the explicit confirm, then returns", async () => {
    await renderEdit();
    await userEvent.press(screen.getByTestId("segment-form-delete"));
    await userEvent.press(screen.getByTestId("segment-form-delete-confirm-button"));
    await waitFor(() => expect(deleteSegmentMock).toHaveBeenCalledWith("trip-1", "segment-1"));
    expect(mockRouter.back).toHaveBeenCalledTimes(1);
  });

  it("create mode never offers delete", async () => {
    await renderCreate();
    expect(screen.queryByTestId("segment-form-delete")).not.toBeOnTheScreen();
  });
});

describe("SegmentFormScreen — segment not found (AC-80, AC-81)", () => {
  it.each(["missing-segment", "not-a-uuid", "someone-elses-segment"])(
    "shows 'Segment not found' for a bad id (%s)",
    async (segmentId) => {
      getSegmentMock.mockResolvedValue({ ok: false, kind: "notFound" });
      await renderWithProviders(<SegmentFormScreen tripId="trip-1" segmentId={segmentId} />, SIGNED_IN);
      expect(await screen.findByTestId("segment-form-not-found")).toBeOnTheScreen();
      expect(screen.getByText("Segment not found")).toBeOnTheScreen();
    },
  );
});

describe("SegmentFormScreen — unsaved changes (AC-40)", () => {
  it("closes without confirmation when nothing changed", async () => {
    await renderEdit();
    await userEvent.press(screen.getByRole("button", { name: "Cancel" }));
    expect(mockRouter.back).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId("segment-form-unsaved")).not.toBeOnTheScreen();
  });

  it("asks for confirmation once a field changed", async () => {
    await renderEdit();
    await userEvent.type(screen.getByTestId("segment-form-seat"), "9C");
    await userEvent.press(screen.getByRole("button", { name: "Cancel" }));
    expect(mockRouter.back).not.toHaveBeenCalled();
    expect(screen.getByTestId("segment-form-unsaved")).toBeOnTheScreen();
    await userEvent.press(screen.getByTestId("segment-form-unsaved-discard"));
    expect(mockRouter.back).toHaveBeenCalledTimes(1);
  });
});

describe("SegmentFormScreen — carrier recognition (AC-23, AC-24)", () => {
  it("shows the recognized carrier line for a known designator, no api call", async () => {
    await renderCreate();
    await userEvent.type(screen.getByTestId("segment-form-flight-number"), "LO1234");
    await waitFor(() =>
      expect(screen.getByTestId("segment-form-flight-number-carrier")).toHaveTextContent(
        "LOT Polish Airlines — from the directory, offline",
      ),
    );
    expect(createSegmentMock).not.toHaveBeenCalled();
  });

  it("shows a neutral line for an unrecognized code", async () => {
    await renderCreate();
    await userEvent.type(screen.getByTestId("segment-form-flight-number"), "ZZ999");
    await waitFor(() =>
      expect(screen.getByTestId("segment-form-flight-number-carrier")).toHaveTextContent("Airline not recognized"),
    );
  });
});
