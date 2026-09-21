import { screen, userEvent, within } from "@testing-library/react-native";

import { family } from "@/lib/theme";
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
    await renderWithProviders(<TripDetailScreen tripId="trip-lisbon" />);
    const hero = screen.getByTestId("trip-hero");
    expect(within(hero).getByRole("header", { name: "Lisbon" })).toBeOnTheScreen();
    expect(within(hero).getByText("in 5 days")).toBeOnTheScreen();
    const dates = within(hero).getByText("Sep 25 – Oct 1, 2026 · 6 nights");
    expect(dates).toHaveStyle({ fontFamily: family.mono });
  });

  it("renders the three sections, each with a plus button in its header", async () => {
    await renderWithProviders(<TripDetailScreen tripId="trip-lisbon" />);
    expect(screen.getByRole("header", { name: "Flights" })).toBeOnTheScreen();
    expect(screen.getByRole("header", { name: "Hotel" })).toBeOnTheScreen();
    expect(screen.getByRole("header", { name: "Car rental" })).toBeOnTheScreen();
    expect(within(screen.getByTestId("section-flights")).getByRole("button", { name: "Add flight" })).toBeOnTheScreen();
    expect(within(screen.getByTestId("section-hotel")).getByRole("button", { name: "Add hotel" })).toBeOnTheScreen();
    expect(within(screen.getByTestId("section-car")).getAllByRole("button", { name: "Add car" })).toHaveLength(2);
  });

  it("shows flight cards with IATA codes in the mono face, baggage and passenger chips", async () => {
    await renderWithProviders(<TripDetailScreen tripId="trip-lisbon" />);
    const outbound = screen.getByTestId("flight-card-flight-lisbon-outbound");
    expect(within(outbound).getByText("WAW")).toHaveStyle({ fontFamily: family.mono });
    expect(within(outbound).getByText("LIS")).toHaveStyle({ fontFamily: family.mono });
    expect(within(outbound).getByText("Baggage included")).toBeOnTheScreen();
    expect(within(outbound).getByText("2 passengers")).toBeOnTheScreen();
    const inbound = screen.getByTestId("flight-card-flight-lisbon-return");
    expect(within(inbound).getByLabelText(/LIS to WAW/)).toBeOnTheScreen();
    expect(within(inbound).getByText("No baggage")).toBeOnTheScreen();
  });

  it("shows the hotel with check-in/out and the breakfast chip", async () => {
    await renderWithProviders(<TripDetailScreen tripId="trip-lisbon" />);
    const hotel = screen.getByTestId("hotel-card");
    expect(within(hotel).getByText("Memmo Alfama")).toBeOnTheScreen();
    expect(within(hotel).getByText("Check-in")).toBeOnTheScreen();
    expect(within(hotel).getByText("Check-out")).toBeOnTheScreen();
    expect(within(hotel).getByText("Breakfast: 6 of 6 days")).toBeOnTheScreen();
  });

  it("makes the car section the only empty state", async () => {
    await renderWithProviders(<TripDetailScreen tripId="trip-lisbon" />);
    expect(within(screen.getByTestId("section-car")).getByText("No car added")).toBeOnTheScreen();
    expect(within(screen.getByTestId("section-flights")).queryByText("No car added")).not.toBeOnTheScreen();
    expect(within(screen.getByTestId("section-hotel")).queryByText("No car added")).not.toBeOnTheScreen();
    expect(screen.getAllByText("No car added")).toHaveLength(1);
  });

  it("goes back from the glass back button", async () => {
    const user = userEvent.setup();
    await renderWithProviders(<TripDetailScreen tripId="trip-lisbon" />);
    await user.press(screen.getByRole("button", { name: "Back" }));
    expect(mockRouter.back).toHaveBeenCalledTimes(1);
    expect(mockRouter.push).not.toHaveBeenCalled();
  });

  it("keeps the '...' button pressable but inert, announced and marked 'soon' (Q7)", async () => {
    const user = userEvent.setup();
    await renderWithProviders(<TripDetailScreen tripId="trip-lisbon" />);
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
    await renderWithProviders(<TripDetailScreen tripId="trip-lisbon" />);
    await user.press(screen.getByTestId("add-flight"));
    expect(mockRouter.push).toHaveBeenLastCalledWith(
      { pathname: "/trips/[tripId]/flights/new", params: { tripId: "trip-lisbon" } },
    );
    await user.press(screen.getByTestId("add-hotel"));
    expect(mockRouter.push).toHaveBeenLastCalledWith(
      { pathname: "/trips/[tripId]/hotels/new", params: { tripId: "trip-lisbon" } },
    );
    await user.press(screen.getByTestId("add-car"));
    expect(mockRouter.push).toHaveBeenLastCalledWith(
      { pathname: "/trips/[tripId]/cars/new", params: { tripId: "trip-lisbon" } },
    );
    await user.press(screen.getByTestId("car-empty-add"));
    expect(mockRouter.push).toHaveBeenLastCalledWith(
      { pathname: "/trips/[tripId]/cars/new", params: { tripId: "trip-lisbon" } },
    );
    expect(mockRouter.push).toHaveBeenCalledTimes(4);
  });

  it("opens the flight form of the pressed flight card", async () => {
    const user = userEvent.setup();
    await renderWithProviders(<TripDetailScreen tripId="trip-lisbon" />);
    await user.press(screen.getByTestId("flight-card-flight-lisbon-outbound"));
    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: "/trips/[tripId]/flights/[flightId]",
      params: { tripId: "trip-lisbon", flightId: "flight-lisbon-outbound" },
    });
  });

  it("renders identically and without throwing for arbitrary trip ids", async () => {
    const trees: string[] = [];
    for (const tripId of ["", "не-существует", "../../etc", "trip-lisbon"]) {
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
    await renderWithProviders(<TripDetailScreen tripId="trip-lisbon" />);
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
    await renderWithProviders(<TripDetailScreen tripId="trip-lisbon" />, { locale: "ru" });
    expect(screen.getByRole("header", { name: "Лиссабон" })).toBeOnTheScreen();
    expect(screen.getByRole("header", { name: "Аренда авто" })).toBeOnTheScreen();
    expect(screen.getByText("через 5 дней")).toBeOnTheScreen();
    expect(screen.getByText(/6 ночей/)).toBeOnTheScreen();
    expect(screen.getAllByText("2 пассажира")).toHaveLength(2);
    expect(screen.getByText("Завтрак: 6 из 6 дней")).toBeOnTheScreen();
  });

  it("renders in the light theme too (AC-22)", async () => {
    await renderWithProviders(<TripDetailScreen tripId="trip-lisbon" />, { themePreference: "light" });
    expect(screen.getByTestId("trip-detail-screen")).toBeOnTheScreen();
    expect(screen.getByRole("header", { name: "Lisbon" })).toBeOnTheScreen();
  });

  it("shows each flight at the local time of its departure airport, not UTC", async () => {
    await renderWithProviders(<TripDetailScreen tripId="trip-lisbon" />);
    // 04:10Z is 06:10 in Warsaw (CEST); 15:35Z is 16:35 in Lisbon (WEST).
    expect(within(screen.getByTestId("flight-card-flight-lisbon-outbound")).getByText("Sep 25 · 6:10 AM")).toBeOnTheScreen();
    expect(within(screen.getByTestId("flight-card-flight-lisbon-return")).getByText("Oct 1 · 4:35 PM")).toBeOnTheScreen();
  });

  it("shows the trip that was opened, not one fixed sample", async () => {
    await renderWithProviders(<TripDetailScreen tripId="trip-rome" />);
    expect(screen.getByRole("header", { name: "Rome" })).toBeOnTheScreen();
    expect(screen.getByText("completed")).toBeOnTheScreen();
    expect(within(screen.getByTestId("flight-card-flight-rome-outbound")).getByLabelText(/WAW to FCO/)).toBeOnTheScreen();
    expect(within(screen.getByTestId("hotel-card")).getByText("Hotel Artemide")).toBeOnTheScreen();
  });

  it("omits the breakfast chip when no breakfast is included", async () => {
    await renderWithProviders(<TripDetailScreen tripId="trip-barcelona" />);
    expect(within(screen.getByTestId("hotel-card")).getByText("Hotel Casa Bonay")).toBeOnTheScreen();
    expect(screen.queryByText(/Breakfast/)).not.toBeOnTheScreen();
  });

  it("renders a draft trip without dates, flights or a hotel", async () => {
    await renderWithProviders(<TripDetailScreen tripId="trip-tokyo" />);
    const hero = screen.getByTestId("trip-hero");
    expect(within(hero).getByRole("header", { name: "Tokyo" })).toBeOnTheScreen();
    expect(within(hero).getByText("plan · no date yet")).toBeOnTheScreen();
    expect(within(hero).queryByText(/20\d\d/)).not.toBeOnTheScreen();
    expect(screen.queryAllByTestId(/^flight-card-/)).toHaveLength(0);
    expect(screen.queryByTestId("hotel-card")).not.toBeOnTheScreen();
  });
});
