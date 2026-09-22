import { describe, expect, it } from "vitest";
import { AIRLINES, AIRLINE_DESIGNATOR_PATTERN, airlineRecordSchema, type AirlineRecord } from "../../index";

const airlines: readonly AirlineRecord[] = AIRLINES;

describe("airline directory volume and shape (AC-19)", () => {
  it("has at least 400 records", () => {
    expect(airlines.length).toBeGreaterThanOrEqual(400);
  });

  it("every record has exactly three fields and parses with airlineRecordSchema", () => {
    for (const airline of airlines) {
      expect(Object.keys(airline).sort()).toEqual(["countryCode", "designator", "name"]);
      const result = airlineRecordSchema.safeParse(airline);
      expect(result.success, airline.designator).toBe(true);
    }
  });
});

describe("designator uniqueness and format (AC-20)", () => {
  it("has a unique designator per airline, matching ^[A-Z0-9]{2}$", () => {
    const designators = airlines.map((a) => a.designator);
    expect(new Set(designators).size).toBe(designators.length);
    for (const designator of designators) {
      expect(designator).toMatch(AIRLINE_DESIGNATOR_PATTERN);
      expect(designator).toMatch(/^[A-Z0-9]{2}$/);
    }
  });

  it("includes an alphanumeric designator case (9W)", () => {
    expect(airlines.some((a) => a.designator === "9W")).toBe(true);
  });

  it("never lists the same airline name twice", () => {
    const names = airlines.map((a) => a.name.toLowerCase());
    expect(new Set(names).size).toBe(names.length);
  });
});

describe("content spot checks (hand-verified data)", () => {
  it.each([
    ["LO", "LOT Polish Airlines", "PL"],
    ["BA", "British Airways", "GB"],
    ["FR", "Ryanair", "IE"],
    ["U2", "easyJet", "GB"],
    ["9W", "Jet Airways", "IN"],
  ])("%s -> %s, %s", (designator, name, countryCode) => {
    const airline = airlines.find((a) => a.designator === designator);
    expect(airline?.name).toBe(name);
    expect(airline?.countryCode).toBe(countryCode);
  });
});
