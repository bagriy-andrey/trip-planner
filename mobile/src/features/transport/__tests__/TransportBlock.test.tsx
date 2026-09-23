import { fireEvent, screen } from "@testing-library/react-native";

import { renderWithProviders } from "@/test-utils/renderWithProviders";

import { TransportBlock } from "../components/TransportBlock";

import { route, seg } from "./routeFixtures";

describe("TransportBlock", () => {
  it("renders one card per segment, in departure order (AC-72)", async () => {
    const view = route([
      seg("a", "KRK", "OPO", "2026-06-01T08:00:00Z", "2026-06-01T10:00:00Z"),
      seg("b", "OPO", "BCN", "2026-06-01T13:00:00Z", "2026-06-01T15:00:00Z"),
      seg("c", "BCN", "KRK", "2026-06-01T18:00:00Z", "2026-06-01T20:00:00Z"),
    ]);
    await renderWithProviders(
      <TransportBlock route={view} locale="en" onSegmentPress={jest.fn()} onOpenRoute={jest.fn()} testID="tb" />,
    );
    expect(screen.getByTestId("tb-segment-a")).toBeTruthy();
    expect(screen.getByTestId("tb-segment-b")).toBeTruthy();
    expect(screen.getByTestId("tb-segment-c")).toBeTruthy();
  });

  it("reports a segment id on tap", async () => {
    const view = route([seg("a", "KRK", "OPO", "2026-06-01T08:00:00Z", "2026-06-01T10:00:00Z")]);
    const onSegmentPress = jest.fn();
    await renderWithProviders(
      <TransportBlock
        route={view}
        locale="en"
        onSegmentPress={onSegmentPress}
        onOpenRoute={jest.fn()}
        testID="tb"
      />,
    );
    fireEvent.press(screen.getByTestId("tb-segment-a"));
    expect(onSegmentPress).toHaveBeenCalledWith("a");
  });

  it("the summary row shows the route codes and opens the route screen on tap", async () => {
    const view = route([
      seg("a", "KRK", "OPO", "2026-06-01T08:00:00Z", "2026-06-01T10:00:00Z"),
      seg("b", "OPO", "BCN", "2026-06-01T13:00:00Z", "2026-06-01T15:00:00Z"),
    ]);
    const onOpenRoute = jest.fn();
    await renderWithProviders(
      <TransportBlock route={view} locale="en" onSegmentPress={jest.fn()} onOpenRoute={onOpenRoute} testID="tb" />,
    );
    expect(screen.getByText("KRK · OPO · BCN")).toBeTruthy();
    fireEvent.press(screen.getByTestId("tb-summary"));
    expect(onOpenRoute).toHaveBeenCalledTimes(1);
  });

  it("shows the 'not closed' banner only when the route is open, and it also opens the route screen", async () => {
    const open = route([seg("a", "KRK", "OPO", "2026-06-01T08:00:00Z", "2026-06-01T10:00:00Z")]);
    expect(open.closed).toBe(false);
    const onOpenRoute = jest.fn();
    await renderWithProviders(
      <TransportBlock route={open} locale="en" onSegmentPress={jest.fn()} onOpenRoute={onOpenRoute} testID="tb" />,
    );
    fireEvent.press(screen.getByTestId("tb-not-closed"));
    expect(onOpenRoute).toHaveBeenCalledTimes(1);
  });

  it("renders no banner for a closed route", async () => {
    const closed = route([
      seg("a", "KRK", "OPO", "2026-06-01T08:00:00Z", "2026-06-01T10:00:00Z"),
      seg("b", "OPO", "KRK", "2026-06-01T13:00:00Z", "2026-06-01T15:00:00Z"),
    ]);
    expect(closed.closed).toBe(true);
    await renderWithProviders(
      <TransportBlock route={closed} locale="en" onSegmentPress={jest.fn()} onOpenRoute={jest.fn()} testID="tb" />,
    );
    expect(screen.queryByTestId("tb-not-closed")).toBeNull();
  });

  it("returns null (no card) when there is no nearest segment", async () => {
    const empty = route([]);
    await renderWithProviders(
      <TransportBlock route={empty} locale="en" onSegmentPress={jest.fn()} onOpenRoute={jest.fn()} testID="tb" />,
    );
    expect(screen.queryByTestId("tb")).toBeNull();
    expect(screen.queryByTestId("tb-segment")).toBeNull();
  });
});
