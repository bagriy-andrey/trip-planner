import { screen } from "@testing-library/react-native";

import { renderWithProviders } from "@/test-utils/renderWithProviders";

import { WarningRow } from "../components/WarningRow";
import type { ChainWarning } from "../components/WarningRow";

const CASES: Array<{ name: string; warning: ChainWarning; contains: string }> = [
  {
    name: "layover.risky",
    warning: { id: "layover.risky", beforeSegmentId: "a", afterSegmentId: "b", durationMs: 60_000 },
    contains: "1 h 30",
  },
  {
    name: "airport.mismatch",
    warning: {
      id: "airport.mismatch",
      beforeSegmentId: "a",
      afterSegmentId: "b",
      arrivalAirportCode: "BCN",
      departureAirportCode: "GRO",
    },
    contains: "airport",
  },
  {
    name: "segments.overlap",
    warning: { id: "segments.overlap", beforeSegmentId: "a", afterSegmentId: "b" },
    contains: "overlap",
  },
  {
    name: "segment.outsideTripDates",
    warning: { id: "segment.outsideTripDates", segmentId: "a", field: "departure" },
    contains: "trip",
  },
];

describe("WarningRow", () => {
  it.each(CASES)("renders a distinct, non-empty description for $name", async ({ warning, contains }) => {
    await renderWithProviders(<WarningRow warning={warning} testID="warning" />);
    const label = screen.getByTestId("warning").props.accessibilityLabel as string;
    expect(label.length).toBeGreaterThan(0);
    expect(label.toLowerCase()).toEqual(expect.stringContaining(contains));
  });

  it("gives each of the four kinds a different text", async () => {
    const labels = new Set<string>();
    for (const { warning } of CASES) {
      const { unmount } = await renderWithProviders(<WarningRow warning={warning} testID="warning" />);
      labels.add(screen.getByTestId("warning").props.accessibilityLabel as string);
      unmount();
    }
    expect(labels.size).toBe(CASES.length);
  });
});
