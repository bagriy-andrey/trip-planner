import { describe, expect, it } from "vitest";
import {
  FLIGHT_NUMBER_PATTERN,
  findAirline,
  normalizeFlightNumber,
  parseFlightNumber,
} from "../../index";

describe("normalizeFlightNumber / parseFlightNumber (AC-21)", () => {
  it.each(["lo 1234", "LO-1234", "LO1234"])(
    '"%s" normalizes to LO1234, designator LO, LOT Polish Airlines',
    (input) => {
      const parsed = parseFlightNumber(input);
      expect(parsed.normalized).toBe("LO1234");
      expect(parsed.designator).toBe("LO");
      expect(parsed.valid).toBe(true);
      expect(findAirline(parsed.designator ?? "")?.name).toBe("LOT Polish Airlines");
    },
  );

  it.each(["LO1", "LO1234", "BA667A", "9W123", "U2101"])("%s is valid", (input) => {
    expect(parseFlightNumber(input).valid).toBe(true);
    expect(FLIGHT_NUMBER_PATTERN.test(normalizeFlightNumber(input))).toBe(true);
  });

  it.each(["LO", "LO12345", "LOT400", "L", "LO12AB"])("%s is invalid", (input) => {
    expect(parseFlightNumber(input).valid).toBe(false);
  });

  it("an empty string is valid (flight number is optional, AC-22)", () => {
    const parsed = parseFlightNumber("");
    expect(parsed.valid).toBe(true);
    expect(parsed.normalized).toBe("");
    expect(parsed.designator).toBeNull();
  });

  it("a whitespace-only string normalizes to empty and is valid", () => {
    const parsed = parseFlightNumber("   ");
    expect(parsed.valid).toBe(true);
    expect(parsed.normalized).toBe("");
  });

  it("an invalid input still returns a normalized value with a null designator", () => {
    const parsed = parseFlightNumber("LO12345");
    expect(parsed.valid).toBe(false);
    expect(parsed.normalized).toBe("LO12345");
    expect(parsed.designator).toBeNull();
  });
});

describe("findAirline (AC-22)", () => {
  it("returns undefined for an unknown designator", () => {
    expect(findAirline("ZZ")).toBeUndefined();
  });

  it("is case-insensitive", () => {
    expect(findAirline("lo")?.name).toBe("LOT Polish Airlines");
  });
});
