import { screen, userEvent } from "@testing-library/react-native";

import { getProfile } from "@/features/profile/api";
import { getTrip } from "@/features/trips/api";
import { renderWithProviders } from "@/test-utils/renderWithProviders";

import { HotelFormScreen } from "../HotelFormScreen";
import { SIGNED_IN, makeTrip, profileResult } from "./testKit";

jest.mock("@/lib/supabase", () => ({ supabase: { from: jest.fn() } }));
jest.mock("@/features/profile/api", () => ({ ...jest.requireActual("@/features/profile/api"), getProfile: jest.fn() }));
jest.mock("@/features/trips/api", () => ({ ...jest.requireActual("@/features/trips/api"), getTrip: jest.fn() }));
jest.mock("@/features/hotels/api", () => ({ ...jest.requireActual("@/features/hotels/api"), createHotel: jest.fn() }));
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), navigate: jest.fn(), back: jest.fn(), dismissAll: jest.fn() }),
  useNavigation: () => ({ addListener: () => () => undefined }),
}));

beforeEach(() => {
  jest.clearAllMocks();
  (getProfile as jest.Mock).mockResolvedValue(profileResult(null));
  (getTrip as jest.Mock).mockResolvedValue({ ok: true, data: makeTrip() });
});

// A user's own text is free text in ANY script: nothing in the form may filter or reject Cyrillic.
describe.each([
  ["ru", "Отель «Альфама»", "ул. Шевченко, 1, кв. 5\nвторой этаж"],
  ["uk", "Готель «Альфама» — Їжак", "вул. Шевченка, 1, кв. 5\nдругий поверх"],
] as const)("hotel form: Cyrillic text in %s", (locale, name, address) => {
  it("keeps what is typed in the name and address fields", async () => {
    await renderWithProviders(<HotelFormScreen tripId="trip-1" />, { ...SIGNED_IN, locale });
    const nameInput = await screen.findByTestId("hotel-form-name");
    await userEvent.type(nameInput, name);
    expect(screen.getByTestId("hotel-form-name").props.value).toBe(name);

    await userEvent.type(screen.getByTestId("hotel-form-address"), address);
    expect(screen.getByTestId("hotel-form-address").props.value).toBe(address);
  });
});
