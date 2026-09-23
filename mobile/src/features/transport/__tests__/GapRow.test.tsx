import { screen } from "@testing-library/react-native";

import { renderWithProviders } from "@/test-utils/renderWithProviders";

import { GapRow } from "../components/GapRow";

import { route, seg } from "./routeFixtures";

describe("GapRow", () => {
  it("renders an ordinary layover with its duration, no 'risky' word", async () => {
    const view = route([
      seg("a", "KRK", "OPO", "2026-06-01T08:00:00Z", "2026-06-01T10:00:00Z"),
      seg("b", "OPO", "BCN", "2026-06-01T13:00:00Z"),
    ]);
    const gap = view.gaps[0]!;
    expect(gap.kind).toBe("layover");
    expect(gap.risky).toBe(false);
    await renderWithProviders(<GapRow gap={gap} locale="en" testID="gap" />);
    expect(screen.getByTestId("gap").props.accessibilityLabel).not.toEqual(expect.stringContaining("risky"));
  });

  it("renders a RISKY layover with the word 'risky' (never colour alone)", async () => {
    const view = route([
      seg("a", "KRK", "OPO", "2026-06-01T08:00:00Z", "2026-06-01T10:00:00Z"),
      seg("b", "OPO", "BCN", "2026-06-01T10:30:00Z"),
    ]);
    const gap = view.gaps[0]!;
    expect(gap.risky).toBe(true);
    await renderWithProviders(<GapRow gap={gap} locale="en" testID="gap" />);
    const label = screen.getByTestId("gap").props.accessibilityLabel as string;
    expect(label).toEqual(expect.stringContaining("risky"));
    expect(screen.getByText("risky")).toBeTruthy();
  });

  it("renders a stopover as 'N days in <city>' when it crosses a calendar day", async () => {
    const view = route([
      seg("a", "KRK", "OPO", "2026-06-01T08:00:00Z", "2026-06-01T10:00:00Z"),
      seg("b", "OPO", "BCN", "2026-06-06T08:00:00Z"),
    ]);
    const gap = view.gaps[0]!;
    expect(gap.kind).toBe("stopover");
    expect(gap.days).toBeGreaterThan(0);
    await renderWithProviders(<GapRow gap={gap} locale="en" testID="gap" />);
    const label = screen.getByTestId("gap").props.accessibilityLabel as string;
    expect(label).toEqual(expect.stringContaining("day"));
    expect(label).toEqual(expect.stringContaining("Porto"));
  });

  it("renders a same-day stopover (AC-53) as duration, not '0 days'", async () => {
    const view = route([
      seg("a", "KRK", "OPO", "2026-06-01T06:00:00Z", "2026-06-01T09:00:00Z"),
      seg("b", "OPO", "BCN", "2026-06-01T20:00:00Z"),
    ]);
    const gap = view.gaps[0]!;
    expect(gap.kind).toBe("stopover");
    expect(gap.days).toBeUndefined();
    await renderWithProviders(<GapRow gap={gap} locale="en" testID="gap" />);
    const label = screen.getByTestId("gap").props.accessibilityLabel as string;
    expect(label).not.toEqual(expect.stringContaining("0 day"));
    expect(label).toEqual(expect.stringContaining("Porto"));
  });
});
