import { screen, userEvent, waitFor, within } from "@testing-library/react-native";
import { EMPTY_PROFILE, searchCityOptions } from "@tripplanner/shared";
import type { Profile } from "@tripplanner/shared";

import { renderWithProviders } from "@/test-utils/renderWithProviders";

import { getProfile, saveProfile } from "../api";
import { ProfileScreen } from "../ProfileScreen";

jest.mock("expo-router", () => ({ useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }) }));
jest.mock("@/features/auth", () => ({ signOut: jest.fn() }));
jest.mock("@/lib/supabase", () => ({ supabase: { from: jest.fn() } }));
jest.mock("../api", () => ({
  ...jest.requireActual("../api"),
  getProfile: jest.fn(),
  saveProfile: jest.fn(),
}));

const mockLoad = getProfile as jest.Mock;
const mockSave = saveProfile as jest.Mock;
const SESSION = { user: { id: "user-1", email: "a@example.com", displayName: "Anna" } };
const KRAKOW = searchCityOptions("Krak", "en", null)[0]!;

function seed(over: Partial<Profile> = {}) {
  mockLoad.mockResolvedValue({ ok: true, data: { ...EMPTY_PROFILE, ...over } });
  // The server echoes the merged profile back.
  mockSave.mockImplementation(async (_id: string, patch: Partial<Profile>, current: Profile) => ({
    ok: true,
    data: { ...current, ...patch },
  }));
}

async function openScreen() {
  await renderWithProviders(<ProfileScreen />, { session: SESSION });
  await waitFor(() => expect(screen.getByTestId("row-citizenship")).toBeEnabled());
}

/** The list is virtualized: find the row through the search field. */
async function pick(query: string, key: string) {
  await userEvent.type(screen.getByTestId("profile-picker-search"), query);
  await userEvent.press(screen.getByTestId(`profile-picker-item-${key}`));
}

beforeEach(() => {
  jest.clearAllMocks();
  seed();
});

describe("Profile pickers", () => {
  it.each([
    ["row-citizenship", "Citizenship"],
    ["row-residence", "Country of residence"],
    ["row-homeCity", "City"],
    ["row-homeAirport", "Home airport"],
    ["row-homeCurrency", "Currency"],
  ])("opens the sheet of %s with its title (AC-15)", async (rowId, title) => {
    await openScreen();
    await userEvent.press(screen.getByTestId(rowId));
    expect(screen.getAllByRole("header", { name: title }).length).toBeGreaterThan(0);
  });

  it("hides the screen behind the open sheet from accessibility (AC-44)", async () => {
    await openScreen();
    await userEvent.press(screen.getByTestId("row-citizenship"));
    expect(screen.queryByRole("button", { name: "Sign out" })).toBeNull();
  });

  it("a choice updates the row at once (AC-31)", async () => {
    await openScreen();
    await userEvent.press(screen.getByTestId("row-citizenship"));
    await pick("Portugal", "PT");
    await waitFor(() => expect(within(screen.getByTestId("row-citizenship")).getByText("Portugal")).toBeOnTheScreen());
    expect(mockSave).toHaveBeenCalledTimes(1);
  });

  it("'Not specified' clears the value (US-6)", async () => {
    seed({ citizenship: "PT" });
    await openScreen();
    await userEvent.press(screen.getByTestId("row-citizenship"));
    await userEvent.press(screen.getByTestId("profile-picker-none"));
    await waitFor(() => expect(within(screen.getByTestId("row-citizenship")).getByText("Not specified")).toBeOnTheScreen());
  });

  it("a city with an empty country fills in the country and the city together (US-1)", async () => {
    await openScreen();
    await userEvent.press(screen.getByTestId("row-homeCity"));
    await pick(KRAKOW.en, KRAKOW.id);
    await waitFor(() => expect(within(screen.getByTestId("row-homeCity")).getByText(KRAKOW.en)).toBeOnTheScreen());
    expect(within(screen.getByTestId("row-residence")).getByText("Poland")).toBeOnTheScreen();
    expect(mockSave).toHaveBeenCalledTimes(1);
  });

  it("changing the country clears an unrelated city (US-5)", async () => {
    seed({ residence: "PL", homeCityId: KRAKOW.id });
    await openScreen();
    await userEvent.press(screen.getByTestId("row-residence"));
    await pick("Portugal", "PT");
    await waitFor(() => expect(within(screen.getByTestId("row-residence")).getByText("Portugal")).toBeOnTheScreen());
    expect(within(screen.getByTestId("row-homeCity")).getByText("Not specified")).toBeOnTheScreen();
  });

  it("a country without listed cities shows the hint instead of a list (AC-26)", async () => {
    seed({ residence: "AD" });
    await openScreen();
    await userEvent.press(screen.getByTestId("row-homeCity"));
    expect(screen.getByText("No cities in the list for this country yet")).toBeOnTheScreen();
  });

  it("a failed save rolls back and shows the message under the right card (AC-31)", async () => {
    mockSave.mockResolvedValue({ ok: false, kind: "offline" });
    await openScreen();
    await userEvent.press(screen.getByTestId("row-homeCurrency"));
    await userEvent.press(screen.getByTestId("profile-picker-item-EUR"));
    await waitFor(() => expect(screen.getByTestId("save-error-settings")).toBeOnTheScreen());
    expect(within(screen.getByTestId("row-homeCurrency")).getByText("Not specified")).toBeOnTheScreen();
    expect(screen.queryByTestId("save-error-aboutMe")).toBeNull();
  });
});
