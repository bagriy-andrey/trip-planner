import { fireEvent, screen } from "@testing-library/react-native";

import { renderWithProviders } from "@/test-utils/renderWithProviders";

import { SegmentCard } from "../components/SegmentCard";

import { seg } from "./routeFixtures";

describe("SegmentCard", () => {
  it("shows the codes and the flight number in mono, and reports a tap by segment id", async () => {
    const segment = seg("s1", "KRK", "OPO", "2026-06-01T08:00:00Z");
    const onPress = jest.fn();
    await renderWithProviders(<SegmentCard segment={segment} locale="en" onPress={onPress} testID="card" />);

    expect(screen.getByText("KRK")).toBeTruthy();
    expect(screen.getByText("OPO")).toBeTruthy();
    expect(screen.getByText("LO123")).toBeTruthy();

    fireEvent.press(screen.getByTestId("card"));
    expect(onPress).toHaveBeenCalledWith("s1");
  });

  it("has a non-empty accessible label carrying the route and the date/time", async () => {
    const segment = seg("s1", "KRK", "OPO", "2026-06-01T08:00:00Z");
    await renderWithProviders(<SegmentCard segment={segment} locale="en" onPress={jest.fn()} testID="card" />);
    const card = screen.getByTestId("card");
    expect(card.props.accessibilityLabel).toEqual(expect.stringContaining("KRK"));
    expect(card.props.accessibilityLabel).toEqual(expect.stringContaining("LO123"));
  });

  it("omits the flight number line when there is none", async () => {
    const segment = seg("s1", "KRK", "OPO", "2026-06-01T08:00:00Z", null, { flightNumber: null });
    await renderWithProviders(<SegmentCard segment={segment} locale="en" onPress={jest.fn()} testID="card" />);
    expect(screen.queryByText("LO123")).toBeNull();
  });
});
