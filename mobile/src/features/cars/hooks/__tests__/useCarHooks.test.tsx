import { act, waitFor } from "@testing-library/react-native";
import type { QueryClient } from "@tanstack/react-query";
import { parseCarForm } from "@tripplanner/shared";
import type { CarFormValue } from "@tripplanner/shared";

import { createQueryClient } from "@/lib/query";
import { renderWithProviders } from "@/test-utils/renderWithProviders";
import type { TestSession } from "@/test-utils/renderWithProviders";

import { createCar, getCar, listCars, TripApiError } from "../../api";
import { carKeys } from "../queryKeys";
import { useCarMutations } from "../useCarMutations";
import type { CarMutations } from "../useCarMutations";
import { useCarQuery } from "../useCarQuery";
import type { CarQueryResult } from "../useCarQuery";
import { useCarsQuery } from "../useCarsQuery";
import type { CarsQueryResult } from "../useCarsQuery";
import { makeCar } from "./testKit";

jest.mock("@/lib/supabase", () => ({ supabase: { from: jest.fn() } }));
jest.mock("../../api", () => ({
  ...jest.requireActual("../../api"),
  listCars: jest.fn(),
  getCar: jest.fn(),
  createCar: jest.fn(),
}));

const listMock = listCars as jest.Mock;
const getMock = getCar as jest.Mock;
const createMock = createCar as jest.Mock;

const SIGNED_IN: TestSession = { status: "signedIn" };
const TRIP_ID = "trip-7";
const car = makeCar({ id: "car-1" });

function formOf(): CarFormValue {
  const parsed = parseCarForm({
    bookingRef: "RES-1",
    pickupPlace: "Lisbon Airport",
    pickupDate: "2026-08-19",
    pickupTime: "11:00",
    returnDate: "2026-08-27",
    returnTime: "09:30",
    returnSamePlace: true,
  } as never);
  if (!parsed.ok) throw new Error("fixture form invalid");
  return parsed.value;
}

const clients: QueryClient[] = [];
function client(): QueryClient {
  const c = createQueryClient();
  clients.push(c);
  return c;
}

beforeEach(() => {
  listMock.mockReset();
  getMock.mockReset();
  createMock.mockReset();
});
afterEach(() => {
  clients.splice(0).forEach((c) => c.clear());
});

function Cars({ sink }: { sink: { current: CarsQueryResult | undefined } }) {
  sink.current = useCarsQuery(TRIP_ID);
  return null;
}
function OneCar({ sink }: { sink: { current: CarQueryResult | undefined } }) {
  sink.current = useCarQuery(TRIP_ID, "car-1");
  return null;
}
function Mutations({ sink }: { sink: { current: CarMutations | undefined } }) {
  sink.current = useCarMutations();
  return null;
}

describe("useCarsQuery", () => {
  it("loads the list; a failure surfaces a TripApiError", async () => {
    listMock.mockResolvedValue({ ok: true, data: [car] });
    const sink: { current: CarsQueryResult | undefined } = { current: undefined };
    await renderWithProviders(<Cars sink={sink} />, { session: SIGNED_IN, queryClient: client() });
    await waitFor(() => expect(sink.current?.cars).toEqual([car]));

    listMock.mockResolvedValue({ ok: false, kind: "network" });
    const bad: { current: CarsQueryResult | undefined } = { current: undefined };
    await renderWithProviders(<Cars sink={bad} />, { session: SIGNED_IN, queryClient: client() });
    await waitFor(() => expect(bad.current?.isError).toBe(true));
    expect(bad.current?.error).toBeInstanceOf(TripApiError);
  });
});

describe("useCarQuery", () => {
  it("serves the record from the list cache without a request (AC-49a)", async () => {
    const qc = client();
    qc.setQueryData(carKeys.ofTrip(TRIP_ID), [car]);
    getMock.mockReturnValue(new Promise(() => undefined));
    const sink: { current: CarQueryResult | undefined } = { current: undefined };
    await renderWithProviders(<OneCar sink={sink} />, { session: SIGNED_IN, queryClient: qc });
    expect(sink.current?.car).toEqual(car);
    expect(sink.current?.isPending).toBe(false);
  });

  it("notFound comes through as an error kind", async () => {
    getMock.mockResolvedValue({ ok: false, kind: "notFound" });
    const sink: { current: CarQueryResult | undefined } = { current: undefined };
    await renderWithProviders(<OneCar sink={sink} />, { session: SIGNED_IN, queryClient: client() });
    await waitFor(() => expect(sink.current?.error?.kind).toBe("notFound"));
  });
});

describe("useCarMutations", () => {
  it("create invalidates the trip's cars", async () => {
    createMock.mockResolvedValue({ ok: true, data: car });
    const qc = client();
    const spy = jest.spyOn(qc, "invalidateQueries");
    const sink: { current: CarMutations | undefined } = { current: undefined };
    await renderWithProviders(<Mutations sink={sink} />, { session: SIGNED_IN, queryClient: qc });
    await act(async () => {
      await sink.current?.create.mutateAsync({ tripId: TRIP_ID, form: formOf() });
    });
    expect(spy).toHaveBeenCalledWith({ queryKey: carKeys.ofTrip(TRIP_ID) });
  });

  it("without a session nothing is sent (denied)", async () => {
    const sink: { current: CarMutations | undefined } = { current: undefined };
    await renderWithProviders(<Mutations sink={sink} />, {
      session: { status: "signedOut" },
      queryClient: client(),
    });
    let caught: unknown;
    await act(async () => {
      caught = await sink.current
        ?.create.mutateAsync({ tripId: TRIP_ID, form: formOf() })
        .catch((error: unknown) => error);
    });
    expect((caught as TripApiError).kind).toBe("denied");
    expect(createMock).not.toHaveBeenCalled();
  });
});
