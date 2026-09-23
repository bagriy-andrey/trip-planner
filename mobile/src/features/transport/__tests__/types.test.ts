import { segmentListStatus } from "../types";
import { makeSegment } from "../hooks/__tests__/testKit";

describe("segmentListStatus", () => {
  it("is 'loading' before the first success", () => {
    expect(segmentListStatus({ segments: undefined, isError: false }, 0)).toBe("loading");
  });

  it("is 'error' when the first load failed (never shown as 'no segments')", () => {
    expect(segmentListStatus({ segments: undefined, isError: true }, 0)).toBe("error");
  });

  it("is 'empty' for a loaded, empty route", () => {
    expect(segmentListStatus({ segments: [], isError: false }, 0)).toBe("empty");
  });

  it("is 'ready' once segments are loaded", () => {
    const segments = [makeSegment()];
    expect(segmentListStatus({ segments, isError: false }, segments.length)).toBe("ready");
  });

  it("a failed REFETCH with data already on screen keeps the data (stays 'ready')", () => {
    const segments = [makeSegment()];
    expect(segmentListStatus({ segments, isError: true }, segments.length)).toBe("ready");
  });
});
