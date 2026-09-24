import { act, screen, userEvent, waitFor } from "@testing-library/react-native";

import { deleteHotel, getHotel, updateHotel } from "@/features/hotels/api";
import { renderWithProviders } from "@/test-utils/renderWithProviders";

import { HotelFormScreen } from "../HotelFormScreen";
import { HOTEL_ID, SIGNED_IN, makeHotel } from "./testKit";

jest.mock("@/lib/supabase", () => ({ supabase: { from: jest.fn() } }));
jest.mock("@/features/hotels/api", () => ({
  ...jest.requireActual("@/features/hotels/api"),
  getHotel: jest.fn(),
  updateHotel: jest.fn(),
  deleteHotel: jest.fn(),
}));

const mockRouter = { push: jest.fn(), replace: jest.fn(), navigate: jest.fn(), back: jest.fn(), dismissAll: jest.fn() };
let mockBeforeRemove: ((event: { preventDefault: () => void }) => void) | null = null;
jest.mock("expo-router", () => ({
  useRouter: () => mockRouter,
  useNavigation: () => ({
    addListener: (_name: string, handler: (event: { preventDefault: () => void }) => void) => {
      mockBeforeRemove = handler;
      return () => {
        mockBeforeRemove = null;
      };
    },
  }),
}));

const getHotelMock = getHotel as jest.Mock;
const updateHotelMock = updateHotel as jest.Mock;
const deleteHotelMock = deleteHotel as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockBeforeRemove = null;
  getHotelMock.mockResolvedValue({ ok: true, data: makeHotel() });
  updateHotelMock.mockResolvedValue({ ok: true, data: makeHotel() });
  deleteHotelMock.mockResolvedValue({ ok: true, data: { id: HOTEL_ID } });
});

async function renderEdit(hotelId: string = HOTEL_ID) {
  await renderWithProviders(<HotelFormScreen tripId="trip-1" hotelId={hotelId} />, SIGNED_IN);
}

describe("HotelFormScreen edit (AC-31)", () => {
  it("shows the saved dates range and optional times and keeps Save active", async () => {
    await renderEdit();
    await screen.findByTestId("hotel-form-name");
    expect(screen.getByTestId("hotel-form-name").props.value).toBe("Casa Alfama");
    expect(screen.getByTestId("hotel-form-city").props.value).toBe("Lisbon");
    expect(screen.getByTestId("hotel-form-dates-field").props.accessibilityLabel).toMatch(/Jun 15.*18, 2026/);
    expect(screen.getByTestId("hotel-form-check-in-time-value").props.accessibilityLabel).toContain("15:00");
    expect(screen.getByTestId("hotel-form-check-out-time-value").props.accessibilityLabel).toContain("11:00");
    expect(screen.getByText("3 nights — calculated from dates")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Save" })).toBeEnabled();
  });

  it("saves changes through update and closes", async () => {
    await renderEdit();
    await screen.findByTestId("hotel-form-name");
    await userEvent.type(screen.getByTestId("hotel-form-name"), " II");
    await userEvent.press(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(updateHotelMock).toHaveBeenCalledTimes(1));
    expect(updateHotelMock.mock.calls[0]?.slice(0, 2)).toEqual(["trip-1", HOTEL_ID]);
    expect(updateHotelMock.mock.calls[0]?.[2]).toMatchObject({ name: "Casa Alfama II" });
    await waitFor(() => expect(mockRouter.back).toHaveBeenCalledTimes(1));
  });
});

describe("HotelFormScreen delete (AC-32)", () => {
  it("asks on screen first, then deletes and closes", async () => {
    await renderEdit();
    await userEvent.press(await screen.findByTestId("hotel-form-delete"));
    expect(screen.getByText("The hotel “Casa Alfama” will be permanently deleted.")).toBeOnTheScreen();
    expect(deleteHotelMock).not.toHaveBeenCalled();
    await userEvent.press(screen.getByTestId("hotel-form-delete-confirm-button"));
    await waitFor(() => expect(deleteHotelMock).toHaveBeenCalledWith("trip-1", HOTEL_ID));
    await waitFor(() => expect(mockRouter.back).toHaveBeenCalledTimes(1));
  });

  it("cancelling leaves the hotel alone", async () => {
    await renderEdit();
    await userEvent.press(await screen.findByTestId("hotel-form-delete"));
    await userEvent.press(screen.getByTestId("hotel-form-delete-cancel"));
    expect(screen.queryByTestId("hotel-form-delete-confirm")).not.toBeOnTheScreen();
    expect(deleteHotelMock).not.toHaveBeenCalled();
  });

  it("shows a failed delete inside the overlay and keeps it open", async () => {
    deleteHotelMock.mockResolvedValue({ ok: false, kind: "timeout" });
    await renderEdit();
    await userEvent.press(await screen.findByTestId("hotel-form-delete"));
    await userEvent.press(screen.getByTestId("hotel-form-delete-confirm-button"));
    expect(await screen.findByTestId("hotel-form-delete-error")).toBeOnTheScreen();
    expect(mockRouter.back).not.toHaveBeenCalled();
  });

  it("reads a hotel already deleted elsewhere as 'not found', not as an error", async () => {
    deleteHotelMock.mockResolvedValue({ ok: false, kind: "notFound" });
    await renderEdit();
    await userEvent.press(await screen.findByTestId("hotel-form-delete"));
    await userEvent.press(screen.getByTestId("hotel-form-delete-confirm-button"));
    expect(await screen.findByTestId("hotel-form-not-found")).toBeOnTheScreen();
  });
});

describe("HotelFormScreen not found (AC-33)", () => {
  it("shows one 'Hotel not found' state with a way back", async () => {
    getHotelMock.mockResolvedValue({ ok: false, kind: "notFound" });
    await renderEdit("not-a-uuid");
    expect(await screen.findByTestId("hotel-form-not-found")).toBeOnTheScreen();
    expect(screen.getByText("Hotel not found")).toBeOnTheScreen();
    await userEvent.press(screen.getByTestId("hotel-form-not-found-back"));
    expect(mockRouter.back).toHaveBeenCalledTimes(1);
  });

  it("offers a retry on a load failure", async () => {
    getHotelMock.mockResolvedValueOnce({ ok: false, kind: "offline" });
    await renderEdit();
    await userEvent.press(await screen.findByTestId("hotel-form-retry-load", undefined, { timeout: 8000 }));
    expect(await screen.findByTestId("hotel-form-name")).toBeOnTheScreen();
  });
});

describe("HotelFormScreen leaving with unsaved changes (AC-41)", () => {
  it("closes at once when nothing changed", async () => {
    await renderEdit();
    await screen.findByTestId("hotel-form-name");
    await userEvent.press(screen.getByRole("button", { name: "Cancel" }));
    expect(mockRouter.back).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId("hotel-form-unsaved")).not.toBeOnTheScreen();
  });

  it("asks first when changed, and discards on confirm", async () => {
    await renderEdit();
    await screen.findByTestId("hotel-form-name");
    await userEvent.type(screen.getByTestId("hotel-form-name"), "x");
    await userEvent.press(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.getByText("Close without saving?")).toBeOnTheScreen();
    expect(mockRouter.back).not.toHaveBeenCalled();
    await userEvent.press(screen.getByTestId("hotel-form-unsaved-discard"));
    expect(mockRouter.back).toHaveBeenCalledTimes(1);
  });

  it("intercepts the swipe (beforeRemove) while dirty", async () => {
    await renderEdit();
    await screen.findByTestId("hotel-form-name");
    expect(mockBeforeRemove).toBeNull();
    await userEvent.type(screen.getByTestId("hotel-form-name"), "x");
    const preventDefault = jest.fn();
    await waitFor(() => expect(mockBeforeRemove).not.toBeNull());
    act(() => mockBeforeRemove?.({ preventDefault }));
    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(await screen.findByTestId("hotel-form-unsaved")).toBeOnTheScreen();
  });
});
