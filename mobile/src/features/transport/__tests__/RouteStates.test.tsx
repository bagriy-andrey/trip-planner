import { fireEvent, screen } from "@testing-library/react-native";

import { renderWithProviders } from "@/test-utils/renderWithProviders";

import { RouteEmpty, RouteLoadError, RouteLoading, RouteTripNotFound } from "../components/RouteStates";

describe("RouteStates", () => {
  it("loading: a progressbar with a busy state, visually distinct from the error state", async () => {
    await renderWithProviders(<RouteLoading />);
    const loading = screen.getByTestId("route-loading");
    expect(loading.props.accessibilityState).toMatchObject({ busy: true });
    expect(screen.queryByTestId("route-load-error")).toBeNull();
  });

  it("error: shows a message and an explicit 'Retry' that calls back", async () => {
    const onRetry = jest.fn();
    await renderWithProviders(<RouteLoadError kind="offline" onRetry={onRetry} />);
    expect(screen.getByTestId("route-load-error")).toBeTruthy();
    fireEvent.press(screen.getByTestId("route-load-retry"));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("empty: renders with no warning content at all", async () => {
    await renderWithProviders(<RouteEmpty />);
    expect(screen.getByTestId("route-empty")).toBeTruthy();
    expect(screen.queryByText(/warn/i)).toBeNull();
  });

  it("trip not found: same shell as S7's TripNotFound, optional 'back to trips' action", async () => {
    const onLeave = jest.fn();
    await renderWithProviders(<RouteTripNotFound onLeave={onLeave} />);
    expect(screen.getByText("Trip not found")).toBeTruthy();
    fireEvent.press(screen.getByTestId("route-not-found-back"));
    expect(onLeave).toHaveBeenCalledTimes(1);
  });

  it("trip not found: renders without an action when none is wired yet", async () => {
    await renderWithProviders(<RouteTripNotFound />);
    expect(screen.queryByTestId("route-not-found-back")).toBeNull();
  });
});
