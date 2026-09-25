import { act, screen, userEvent, waitFor } from "@testing-library/react-native";

import { deleteCar, getCar, updateCar } from "@/features/cars/api";

import { CAR_ID, makeCar, renderEdit, resetProfileMock } from "./testKit";

jest.mock("@/lib/supabase", () => ({ supabase: { from: jest.fn() } }));
jest.mock("@/features/profile/api", () => ({ ...jest.requireActual("@/features/profile/api"), getProfile: jest.fn() }));
jest.mock("@/features/cars/api", () => ({
  ...jest.requireActual("@/features/cars/api"),
  getCar: jest.fn(),
  updateCar: jest.fn(),
  deleteCar: jest.fn(),
}));

const mockRouter = { push: jest.fn(), replace: jest.fn(), navigate: jest.fn(), back: jest.fn(), dismissTo: jest.fn() };
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

const getCarMock = getCar as jest.Mock;
const updateCarMock = updateCar as jest.Mock;
const deleteCarMock = deleteCar as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  resetProfileMock();
  mockBeforeRemove = null;
  getCarMock.mockResolvedValue({ ok: true, data: makeCar() });
  updateCarMock.mockResolvedValue({ ok: true, data: makeCar() });
  deleteCarMock.mockResolvedValue({ ok: true, data: { id: CAR_ID } });
});

async function openEdit(carId?: string) {
  await renderEdit(carId);
  await screen.findByTestId("car-form-booking-ref");
}

describe("CarFormScreen edit (AC-30)", () => {
  it("shows the stored values as they are and keeps Save active; the delete link is there", async () => {
    await openEdit();
    expect(screen.getByTestId("car-form-booking-ref").props.value).toBe("RES-1");
    expect(screen.getByTestId("car-form-company").props.value).toBe("Hertz");
    expect(screen.getByTestId("car-form-dates-field").props.accessibilityLabel).toBe("Rental dates: Aug 19 – 27, 2026");
    expect(screen.getByTestId("car-form-pickup-time-value").props.accessibilityLabel).toContain("11:00");
    expect(screen.getByTestId("car-form-return-time-value").props.accessibilityLabel).toContain("09:30");
    expect(screen.getByRole("button", { name: "Save" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Delete rental" })).toBeOnTheScreen();
  });

  it("does not prefill the home currency when the rental has none", async () => {
    resetProfileMock("EUR");
    await openEdit();
    expect(screen.getByTestId("car-form-cost-currency").props.accessibilityLabel).toBe("Currency: No currency selected");
  });

  it("saves changes through update, without a source, and closes", async () => {
    await openEdit();
    await userEvent.type(screen.getByTestId("car-form-company"), " II");
    await userEvent.press(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(updateCarMock).toHaveBeenCalledTimes(1));
    expect(updateCarMock.mock.calls[0]?.slice(0, 2)).toEqual(["trip-1", CAR_ID]);
    expect(updateCarMock.mock.calls[0]?.[2]).toMatchObject({ company: "Hertz II" });
    expect(updateCarMock.mock.calls[0]?.[2]).not.toHaveProperty("source");
    await waitFor(() => expect(mockRouter.back).toHaveBeenCalledTimes(1));
  });
});

describe("CarFormScreen edit — More (AC-14)", () => {
  it("is collapsed when extra driver, deposit and notes are empty, and expands with a flipped chevron", async () => {
    await openEdit();
    const toggle = screen.getByRole("button", { name: "Additional fields", expanded: false });
    expect(screen.queryByTestId("car-form-notes")).not.toBeOnTheScreen();
    await userEvent.press(toggle);
    expect(screen.getByRole("button", { name: "Additional fields", expanded: true })).toBeOnTheScreen();
    expect(screen.getByTestId("car-form-notes")).toBeOnTheScreen();
    expect(screen.getByTestId("car-form-deposit")).toBeOnTheScreen();
    expect(screen.getByRole("switch", { name: "Extra driver", checked: false })).toBeOnTheScreen();
    expect(screen.getByTestId("car-form-more-chevron").props.style).toMatchObject({ transform: [{ rotate: "180deg" }] });
  });

  it.each([
    ["extra driver", { extraDriver: true }],
    ["notes", { notes: "near the lift" }],
    ["deposit", { money: { currency: "EUR", cost: null, deposit: "300.00" } }],
  ] as const)("starts expanded when %s is filled", async (_name, overrides) => {
    getCarMock.mockResolvedValue({ ok: true, data: makeCar(overrides as never) });
    await openEdit();
    expect(screen.getByTestId("car-form-notes")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Additional fields", expanded: true })).toBeOnTheScreen();
  });
});

describe("CarFormScreen delete (AC-31)", () => {
  it("asks on screen first, then deletes and dismisses to the trip screen", async () => {
    await openEdit();
    await userEvent.press(screen.getByTestId("car-form-delete"));
    expect(screen.getByText("The rental \"Hertz\" will be deleted permanently.")).toBeOnTheScreen();
    expect(deleteCarMock).not.toHaveBeenCalled();
    await userEvent.press(screen.getByTestId("car-form-delete-confirm-button"));
    await waitFor(() => expect(deleteCarMock).toHaveBeenCalledWith("trip-1", CAR_ID));
    await waitFor(() =>
      expect(mockRouter.dismissTo).toHaveBeenCalledWith({ pathname: "/trips/[tripId]", params: { tripId: "trip-1" } }),
    );
    expect(mockRouter.back).not.toHaveBeenCalled();
  });

  it("still dismisses when the form has unsaved changes (the leave guard steps aside)", async () => {
    await openEdit();
    await userEvent.type(screen.getByTestId("car-form-company"), "x");
    await waitFor(() => expect(mockBeforeRemove).not.toBeNull());
    await userEvent.press(screen.getByTestId("car-form-delete"));
    await userEvent.press(screen.getByTestId("car-form-delete-confirm-button"));
    await waitFor(() => expect(mockRouter.dismissTo).toHaveBeenCalledTimes(1));
    expect(mockBeforeRemove).toBeNull();
  });

  it("cancelling leaves the rental alone", async () => {
    await openEdit();
    await userEvent.press(screen.getByTestId("car-form-delete"));
    await userEvent.press(screen.getByTestId("car-form-delete-cancel"));
    expect(screen.queryByTestId("car-form-delete-confirm")).not.toBeOnTheScreen();
    expect(deleteCarMock).not.toHaveBeenCalled();
  });

  it("shows a failed delete inside the overlay and keeps it open", async () => {
    deleteCarMock.mockResolvedValue({ ok: false, kind: "timeout" });
    await openEdit();
    await userEvent.press(screen.getByTestId("car-form-delete"));
    await userEvent.press(screen.getByTestId("car-form-delete-confirm-button"));
    expect(await screen.findByTestId("car-form-delete-error")).toBeOnTheScreen();
    expect(mockRouter.dismissTo).not.toHaveBeenCalled();
  });

  it("reads a rental already deleted elsewhere as 'not found'", async () => {
    deleteCarMock.mockResolvedValue({ ok: false, kind: "notFound" });
    await openEdit();
    await userEvent.press(screen.getByTestId("car-form-delete"));
    await userEvent.press(screen.getByTestId("car-form-delete-confirm-button"));
    expect(await screen.findByTestId("car-form-not-found")).toBeOnTheScreen();
  });
});

describe("CarFormScreen not found (AC-32)", () => {
  it("shows one 'Rental not found' state with a way back", async () => {
    getCarMock.mockResolvedValue({ ok: false, kind: "notFound" });
    await renderEdit("not-a-uuid");
    expect(await screen.findByTestId("car-form-not-found")).toBeOnTheScreen();
    expect(screen.getByText("Rental not found")).toBeOnTheScreen();
    await userEvent.press(screen.getByText("Back to trip"));
    expect(mockRouter.back).toHaveBeenCalledTimes(1);
  });

  it("offers a retry on a load failure", async () => {
    getCarMock.mockResolvedValueOnce({ ok: false, kind: "offline" });
    await renderEdit();
    await userEvent.press(await screen.findByTestId("car-form-retry-load", undefined, { timeout: 8000 }));
    expect(await screen.findByTestId("car-form-booking-ref")).toBeOnTheScreen();
  });
});

describe("CarFormScreen leaving with unsaved changes (AC-35)", () => {
  it("closes at once when nothing changed", async () => {
    await openEdit();
    await userEvent.press(screen.getByRole("button", { name: "Cancel" }));
    expect(mockRouter.back).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId("car-form-unsaved")).not.toBeOnTheScreen();
  });

  it("asks first when changed, and discards on confirm", async () => {
    await openEdit();
    await userEvent.type(screen.getByTestId("car-form-company"), "x");
    await userEvent.press(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.getByText("Discard changes?")).toBeOnTheScreen();
    expect(mockRouter.back).not.toHaveBeenCalled();
    await userEvent.press(screen.getByTestId("car-form-unsaved-discard"));
    expect(mockRouter.back).toHaveBeenCalledTimes(1);
  });

  it("intercepts the swipe (beforeRemove) while dirty", async () => {
    await openEdit();
    expect(mockBeforeRemove).toBeNull();
    await userEvent.type(screen.getByTestId("car-form-company"), "x");
    const preventDefault = jest.fn();
    await waitFor(() => expect(mockBeforeRemove).not.toBeNull());
    act(() => mockBeforeRemove?.({ preventDefault }));
    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(await screen.findByTestId("car-form-unsaved")).toBeOnTheScreen();
  });
});
