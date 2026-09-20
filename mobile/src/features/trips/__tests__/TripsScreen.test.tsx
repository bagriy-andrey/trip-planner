import { screen, userEvent, within } from "@testing-library/react-native";

import { FONT_FAMILY } from "@/lib/theme";
import { MOCK_NOW } from "@/mocks";
import { renderWithProviders } from "@/test-utils/renderWithProviders";

import { TripCard } from "../components/TripCard";
import { TripsScreen } from "../TripsScreen";

const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  navigate: jest.fn(),
  back: jest.fn(),
  dismissAll: jest.fn(),
};
jest.mock("expo-router", () => ({ useRouter: () => mockRouter }));

beforeEach(() => {
  jest.clearAllMocks();
});

describe("TripsScreen (S4)", () => {
  it("renders the title, the avatar button, the four mock trip cards and the add button", async () => {
    await renderWithProviders(<TripsScreen />);
    expect(screen.getByRole("header", { name: "Trips" })).toBeOnTheScreen();
    expect(screen.getByTestId("trips-avatar")).toBeOnTheScreen();
    for (const id of ["trip-lisbon", "trip-barcelona", "trip-vienna", "trip-tokyo"]) {
      expect(screen.getByTestId(`trip-card-${id}`)).toBeOnTheScreen();
    }
    expect(screen.getByTestId("trips-add")).toBeOnTheScreen();
  });

  it("marks the nearest trip with an accent pill 'in 5 days' and the draft as undated", async () => {
    await renderWithProviders(<TripsScreen />);
    const nearest = screen.getByTestId("trip-card-trip-lisbon");
    expect(within(nearest).getByText("in 5 days")).toBeOnTheScreen();
    const draft = screen.getByTestId("trip-card-trip-tokyo");
    expect(within(draft).getByText("plan · no date yet")).toBeOnTheScreen();
    // A draft has no dates to show.
    expect(within(draft).queryByText(/20\d\d/)).not.toBeOnTheScreen();
  });

  it("uses Russian plural forms and copy in the ru locale (AC-37)", async () => {
    await renderWithProviders(<TripsScreen />, { locale: "ru" });
    expect(screen.getByText("через 5 дней")).toBeOnTheScreen();
    expect(screen.getByText("план · дата не выбрана")).toBeOnTheScreen();
    expect(screen.getByRole("header", { name: "Поездки" })).toBeOnTheScreen();
  });

  it("draws dates in the mono role (AC-38)", async () => {
    await renderWithProviders(<TripsScreen />);
    const nearest = screen.getByTestId("trip-card-trip-lisbon");
    const range = within(nearest).getByText("Sep 25 – Oct 1, 2026");
    expect(range).toHaveStyle({ fontFamily: FONT_FAMILY.mono });
  });

  it("shows the real destinations and their dates in the right order", async () => {
    await renderWithProviders(<TripsScreen />);
    // ICU pads ranges with thin / no-break spaces; compare with plain ones.
    const labels = screen
      .getAllByRole("button")
      .map((button) => String(button.props.accessibilityLabel).replace(/\s/g, " "));
    expect(labels.slice(1, 5)).toEqual([
      "Lisbon, Sep 25 – Oct 1, 2026, in 5 days",
      "Barcelona, Oct 16 – 22, 2026, in 26 days",
      "Vienna, Nov 5 – 8, 2026, in 46 days",
      "Tokyo, plan · no date yet",
    ]);
  });

  it("truncates a very long city name to one line without throwing", async () => {
    const trip = {
      id: "long",
      city: "Llanfairpwllgwyngyllgogerychwyrndrobwllllantysiliogogogoch and the surrounding Anglesey coast",
      start: null,
      end: null,
      status: "draft",
      coverIndex: 0,
    } as const;
    await renderWithProviders(<TripCard trip={trip} locale="en" now={MOCK_NOW} onPress={jest.fn()} />);
    expect(screen.getByText(trip.city).props.numberOfLines).toBe(1);
  });

  it("gives the avatar, the add button and every card a non-empty accessibility label (AC-19)", async () => {
    await renderWithProviders(<TripsScreen />);
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(6);
    for (const button of buttons) {
      expect(String(button.props.accessibilityLabel ?? "").length).toBeGreaterThan(0);
    }
    expect(screen.getByRole("button", { name: "Open profile" })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "New trip" })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: /^Lisbon, .*in 5 days$/ })).toBeOnTheScreen();
  });

  it("switches to the profile tab (navigate, not push) from the avatar (Q1)", async () => {
    const user = userEvent.setup();
    await renderWithProviders(<TripsScreen />);
    await user.press(screen.getByRole("button", { name: "Open profile" }));
    expect(mockRouter.navigate).toHaveBeenCalledTimes(1);
    expect(mockRouter.navigate).toHaveBeenCalledWith("/profile");
    expect(mockRouter.push).not.toHaveBeenCalled();
  });

  it("opens the new-trip modal from the floating button", async () => {
    const user = userEvent.setup();
    await renderWithProviders(<TripsScreen />);
    await user.press(screen.getByRole("button", { name: "New trip" }));
    expect(mockRouter.push).toHaveBeenCalledTimes(1);
    expect(mockRouter.push).toHaveBeenCalledWith("/trips/new");
  });

  it("opens the trip details from a card", async () => {
    const user = userEvent.setup();
    await renderWithProviders(<TripsScreen />);
    await user.press(screen.getByTestId("trip-card-trip-barcelona"));
    expect(mockRouter.push).toHaveBeenCalledTimes(1);
    expect(mockRouter.push).toHaveBeenCalledWith("/trips/trip-barcelona");
  });
});
