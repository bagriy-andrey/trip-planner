import { screen, userEvent, within } from "@testing-library/react-native";

import { FONT_FAMILY } from "@/lib/theme";
import { renderWithProviders } from "@/test-utils/renderWithProviders";

import { TripDetailScreen } from "../TripDetailScreen";

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

describe("TripDetailScreen (S7)", () => {
  it("renders the hero with city, status pill and the mono date line", async () => {
    await renderWithProviders(<TripDetailScreen tripId="trip-krakow" />);
    const hero = screen.getByTestId("trip-hero");
    expect(within(hero).getByRole("header", { name: "Kraków" })).toBeOnTheScreen();
    expect(within(hero).getByText("in 5 days")).toBeOnTheScreen();
    const dates = within(hero).getByText(/Sep.*24.*30.*2026 · 6 nights/);
    expect(dates).toHaveStyle({ fontFamily: FONT_FAMILY.mono });
  });

  it("renders the three sections, each with a plus button in its header", async () => {
    await renderWithProviders(<TripDetailScreen tripId="trip-krakow" />);
    expect(screen.getByRole("header", { name: "Flights" })).toBeOnTheScreen();
    expect(screen.getByRole("header", { name: "Hotel" })).toBeOnTheScreen();
    expect(screen.getByRole("header", { name: "Car rental" })).toBeOnTheScreen();
    expect(within(screen.getByTestId("section-flights")).getByRole("button", { name: "Add flight" })).toBeOnTheScreen();
    expect(within(screen.getByTestId("section-hotel")).getByRole("button", { name: "Add hotel" })).toBeOnTheScreen();
    expect(within(screen.getByTestId("section-car")).getAllByRole("button", { name: "Add car" })).toHaveLength(2);
  });

  it("shows flight cards with IATA codes in the mono face, baggage and passenger chips", async () => {
    await renderWithProviders(<TripDetailScreen tripId="trip-krakow" />);
    const outbound = screen.getByTestId("flight-card-flight-outbound");
    expect(within(outbound).getByText("WAW → KRK")).toHaveStyle({ fontFamily: FONT_FAMILY.monoMedium });
    expect(within(outbound).getByText("Baggage included")).toBeOnTheScreen();
    expect(within(outbound).getByText("2 passengers")).toBeOnTheScreen();
    const inbound = screen.getByTestId("flight-card-flight-return");
    expect(within(inbound).getByText("KRK → WAW")).toBeOnTheScreen();
    expect(within(inbound).getByText("No baggage")).toBeOnTheScreen();
  });

  it("shows the hotel with check-in/out and the breakfast chip", async () => {
    await renderWithProviders(<TripDetailScreen tripId="trip-krakow" />);
    const hotel = screen.getByTestId("hotel-card");
    expect(within(hotel).getByText("Old Town Hotel")).toBeOnTheScreen();
    expect(within(hotel).getByText("Check-in")).toBeOnTheScreen();
    expect(within(hotel).getByText("Check-out")).toBeOnTheScreen();
    expect(within(hotel).getByText("Breakfast: 5 of 6 days")).toBeOnTheScreen();
  });

  it("makes the car section the only empty state", async () => {
    await renderWithProviders(<TripDetailScreen tripId="trip-krakow" />);
    expect(within(screen.getByTestId("section-car")).getByText("No car added")).toBeOnTheScreen();
    expect(within(screen.getByTestId("section-flights")).queryByText("No car added")).not.toBeOnTheScreen();
    expect(within(screen.getByTestId("section-hotel")).queryByText("No car added")).not.toBeOnTheScreen();
    expect(screen.getAllByText("No car added")).toHaveLength(1);
  });

  it("goes back from the glass back button", async () => {
    const user = userEvent.setup();
    await renderWithProviders(<TripDetailScreen tripId="trip-krakow" />);
    await user.press(screen.getByRole("button", { name: "Back" }));
    expect(mockRouter.back).toHaveBeenCalledTimes(1);
    expect(mockRouter.push).not.toHaveBeenCalled();
  });

  it("keeps the '...' button pressable but inert, announced and marked 'soon' (Q7)", async () => {
    const user = userEvent.setup();
    await renderWithProviders(<TripDetailScreen tripId="trip-krakow" />);
    const more = screen.getByRole("button", { name: "More actions" });
    expect(more.props.accessibilityHint).toBe("Coming soon");
    expect(within(screen.getByTestId("trip-hero")).getByText("soon")).toBeOnTheScreen();
    await user.press(more);
    expect(mockRouter.push).not.toHaveBeenCalled();
    expect(mockRouter.back).not.toHaveBeenCalled();
    expect(mockRouter.navigate).not.toHaveBeenCalled();
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it("opens the booking forms of the given trip from the plus buttons and the empty state", async () => {
    const user = userEvent.setup();
    await renderWithProviders(<TripDetailScreen tripId="trip-krakow" />);
    await user.press(screen.getByTestId("add-flight"));
    expect(mockRouter.push).toHaveBeenLastCalledWith(
      { pathname: "/trips/[tripId]/flights/new", params: { tripId: "trip-krakow" } },
    );
    await user.press(screen.getByTestId("add-hotel"));
    expect(mockRouter.push).toHaveBeenLastCalledWith(
      { pathname: "/trips/[tripId]/hotels/new", params: { tripId: "trip-krakow" } },
    );
    await user.press(screen.getByTestId("add-car"));
    expect(mockRouter.push).toHaveBeenLastCalledWith(
      { pathname: "/trips/[tripId]/cars/new", params: { tripId: "trip-krakow" } },
    );
    await user.press(screen.getByTestId("car-empty-add"));
    expect(mockRouter.push).toHaveBeenLastCalledWith(
      { pathname: "/trips/[tripId]/cars/new", params: { tripId: "trip-krakow" } },
    );
    expect(mockRouter.push).toHaveBeenCalledTimes(4);
  });

  it("opens the flight form of the pressed flight card", async () => {
    const user = userEvent.setup();
    await renderWithProviders(<TripDetailScreen tripId="trip-krakow" />);
    await user.press(screen.getByTestId("flight-card-flight-outbound"));
    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: "/trips/[tripId]/flights/[flightId]",
      params: { tripId: "trip-krakow", flightId: "flight-outbound" },
    });
  });

  it("renders identically and without throwing for arbitrary trip ids", async () => {
    const trees: string[] = [];
    for (const tripId of ["", "не-существует", "../../etc", "trip-krakow"]) {
      const view = await renderWithProviders(<TripDetailScreen tripId={tripId} />);
      trees.push(JSON.stringify(view.toJSON()));
      view.unmount();
    }
    expect(new Set(trees).size).toBe(1);
  });

  it("cannot be steered to another route by a hostile trip id", async () => {
    const user = userEvent.setup();
    await renderWithProviders(<TripDetailScreen tripId="../../etc" />);
    await user.press(screen.getByTestId("add-flight"));
    expect(mockRouter.push).toHaveBeenCalledWith(
      { pathname: "/trips/[tripId]/flights/new", params: { tripId: "../../etc" } },
    );
  });

  it("gives every button a non-empty accessibility label (AC-19)", async () => {
    await renderWithProviders(<TripDetailScreen tripId="trip-krakow" />);
    const buttons = screen.getAllByRole("button");
    // back, more, 3 pluses, empty-state action.
    expect(buttons).toHaveLength(6);
    for (const button of buttons) {
      expect(String(button.props.accessibilityLabel ?? "").length).toBeGreaterThan(0);
    }
    for (const link of screen.getAllByRole("link")) {
      expect(String(link.props.accessibilityLabel ?? "").length).toBeGreaterThan(0);
    }
  });

  it("uses Russian copy and plural forms in the ru locale (AC-37)", async () => {
    await renderWithProviders(<TripDetailScreen tripId="trip-krakow" />, { locale: "ru" });
    expect(screen.getByRole("header", { name: "Краков" })).toBeOnTheScreen();
    expect(screen.getByRole("header", { name: "Аренда авто" })).toBeOnTheScreen();
    expect(screen.getByText("через 5 дней")).toBeOnTheScreen();
    expect(screen.getByText(/6 ночей/)).toBeOnTheScreen();
    expect(screen.getAllByText("2 пассажира")).toHaveLength(2);
    expect(screen.getByText("Завтрак: 5 из 6 дней")).toBeOnTheScreen();
  });

  it("renders in the light theme too (AC-22)", async () => {
    await renderWithProviders(<TripDetailScreen tripId="trip-krakow" />, { themePreference: "light" });
    expect(screen.getByTestId("trip-detail-screen")).toBeOnTheScreen();
    expect(screen.getByRole("header", { name: "Kraków" })).toBeOnTheScreen();
  });
});
