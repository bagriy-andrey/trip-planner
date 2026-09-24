import { EMPTY_PROFILE } from "@tripplanner/shared";
import type { Profile } from "@tripplanner/shared";

import { rowValueOf } from "../rowValues";

const p = (over: Partial<Profile>): Profile => ({ ...EMPTY_PROFILE, ...over });

describe("rowValueOf", () => {
  it("is empty for every unset field (AC-10)", () => {
    for (const field of ["citizenship", "residence", "homeCity", "homeAirport", "homeCurrency"] as const) {
      expect(rowValueOf(field, EMPTY_PROFILE, "en")).toEqual({ kind: "empty" });
    }
  });

  it("names a directory country in the UI language", () => {
    expect(rowValueOf("citizenship", p({ citizenship: "PT" }), "en")).toEqual({
      kind: "country",
      code: "PT",
      name: "Portugal",
    });
    expect(rowValueOf("residence", p({ residence: "PT" }), "ru")).toMatchObject({ kind: "country", code: "PT" });
  });

  it("shows a country outside the directory as its raw code (AC-27)", () => {
    expect(rowValueOf("citizenship", p({ citizenship: "ZZ" }), "en")).toEqual({ kind: "rawCode", code: "ZZ" });
  });

  it("names a known city and flags an unknown one (AC-27)", () => {
    expect(rowValueOf("homeCity", p({ homeCityId: "city-lisbon" }), "en")).toEqual({ kind: "city", name: "Lisbon" });
    expect(rowValueOf("homeCity", p({ homeCityId: "city-nowhere" }), "en")).toEqual({ kind: "unknownCity" });
  });

  it("shows an airport code with its spoken name, or the bare code when unknown (AC-43)", () => {
    expect(rowValueOf("homeAirport", p({ homeAirport: "LIS" }), "en")).toEqual({
      kind: "rawCode",
      code: "LIS",
      spoken: "Lisbon Airport",
    });
    expect(rowValueOf("homeAirport", p({ homeAirport: "QQQ" }), "en")).toEqual({ kind: "rawCode", code: "QQQ" });
  });

  it("shows the currency code as is", () => {
    expect(rowValueOf("homeCurrency", p({ homeCurrency: "EUR" }), "en")).toEqual({ kind: "rawCode", code: "EUR" });
  });
});
