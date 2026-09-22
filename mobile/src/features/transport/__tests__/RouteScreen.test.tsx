import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import type { Trip } from "@tripplanner/shared";

import { renderWithProviders } from "@/test-utils/renderWithProviders";
import type { RenderWithProvidersOptions } from "@/test-utils/renderWithProviders";

import { getTrip } from "@/features/trips/api";
import { listSegments } from "@/features/transport/api";
import { RouteScreen } from "../RouteScreen";

import { seg } from "./routeFixtures";

jest.mock("@/lib/supabase", () => ({ supabase: { from: jest.fn() } }));
jest.mock("@/features/trips/api", () => ({
  ...jest.requireActual("@/features/trips/api"),
  getTrip: jest.fn(),
}));
jest.mock("@/features/transport/api", () => ({
  ...jest.requireActual("@/features/transport/api"),
  listSegments: jest.fn(),
}));

const getTripMock = getTrip as jest.Mock;
const listSegmentsMock = listSegments as jest.Mock;

const SIGNED_IN: RenderWithProvidersOptions = { session: { user: {} } };

function makeTrip(overrides: Partial<Trip> = {}): Trip {
  return {
    id: "trip-1",
    destination: "Porto",
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

function noop() {}

describe("RouteScreen", () => {
  beforeEach(() => {
    getTripMock.mockReset();
    listSegmentsMock.mockReset();
  });

  it("shows the loading state while the trip is still in flight", async () => {
    getTripMock.mockReturnValue(new Promise(noop));
    listSegmentsMock.mockReturnValue(new Promise(noop));
    await renderWithProviders(
      <RouteScreen
        tripId="trip-1"
        onBack={jest.fn()}
        onAddSegment={jest.fn()}
        onSegmentPress={jest.fn()}
        onAddFromNotClosed={jest.fn()}
      />,
      SIGNED_IN,
    );
    expect(screen.getByTestId("route-loading")).toBeTruthy();
  });

  it("shows 'trip not found' for an unknown/foreign tripId (AC-70), and it leaves via onBack", async () => {
    getTripMock.mockResolvedValue({ ok: false, kind: "notFound" });
    listSegmentsMock.mockResolvedValue({ ok: true, data: [] });
    const onBack = jest.fn();
    await renderWithProviders(
      <RouteScreen
        tripId="ghost"
        onBack={onBack}
        onAddSegment={jest.fn()}
        onSegmentPress={jest.fn()}
        onAddFromNotClosed={jest.fn()}
      />,
      SIGNED_IN,
    );
    await waitFor(() => expect(screen.getByTestId("route-not-found")).toBeTruthy());
    fireEvent.press(screen.getByTestId("route-not-found-back"));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("shows a load error with 'Retry' when the trip fails for another reason", async () => {
    getTripMock.mockResolvedValue({ ok: false, kind: "offline" });
    listSegmentsMock.mockResolvedValue({ ok: true, data: [] });
    await renderWithProviders(
      <RouteScreen
        tripId="trip-1"
        onBack={jest.fn()}
        onAddSegment={jest.fn()}
        onSegmentPress={jest.fn()}
        onAddFromNotClosed={jest.fn()}
      />,
      SIGNED_IN,
    );
    await waitFor(() => expect(screen.getByTestId("route-load-error")).toBeTruthy());
  });

  it("shows the empty state for a trip with no segments", async () => {
    getTripMock.mockResolvedValue({ ok: true, data: makeTrip() });
    listSegmentsMock.mockResolvedValue({ ok: true, data: [] });
    await renderWithProviders(
      <RouteScreen
        tripId="trip-1"
        onBack={jest.fn()}
        onAddSegment={jest.fn()}
        onSegmentPress={jest.fn()}
        onAddFromNotClosed={jest.fn()}
      />,
      SIGNED_IN,
    );
    await waitFor(() => expect(screen.getByTestId("route-empty")).toBeTruthy());
  });

  it("renders the chain and the 'not closed' card for an open route, and reports the tap", async () => {
    getTripMock.mockResolvedValue({ ok: true, data: makeTrip() });
    listSegmentsMock.mockResolvedValue({
      ok: true,
      data: [seg("a", "KRK", "OPO", "2026-06-01T08:00:00Z", "2026-06-01T10:00:00Z")],
    });
    const onAddFromNotClosed = jest.fn();
    await renderWithProviders(
      <RouteScreen
        tripId="trip-1"
        onBack={jest.fn()}
        onAddSegment={jest.fn()}
        onSegmentPress={jest.fn()}
        onAddFromNotClosed={onAddFromNotClosed}
      />,
      SIGNED_IN,
    );
    await waitFor(() => expect(screen.getByTestId("route-chain")).toBeTruthy());
    expect(screen.getByTestId("route-not-closed")).toBeTruthy();
    fireEvent.press(screen.getByTestId("route-not-closed-add"));
    expect(onAddFromNotClosed).toHaveBeenCalledTimes(1);
  });

  it("reports the add-segment tap from the header", async () => {
    getTripMock.mockResolvedValue({ ok: true, data: makeTrip() });
    listSegmentsMock.mockResolvedValue({ ok: true, data: [] });
    const onAddSegment = jest.fn();
    await renderWithProviders(
      <RouteScreen
        tripId="trip-1"
        onBack={jest.fn()}
        onAddSegment={onAddSegment}
        onSegmentPress={jest.fn()}
        onAddFromNotClosed={jest.fn()}
      />,
      SIGNED_IN,
    );
    await waitFor(() => expect(screen.getByTestId("route-empty")).toBeTruthy());
    fireEvent.press(screen.getByTestId("route-add"));
    expect(onAddSegment).toHaveBeenCalledTimes(1);
  });
});
