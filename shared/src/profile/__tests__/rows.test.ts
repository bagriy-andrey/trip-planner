import { describe, expect, it } from "vitest";
import type { Tables, TablesInsert } from "../../db/database.types";
import { EMPTY_PROFILE } from "../types";
import { profileFromRowSchema, profileRowSchema, toProfile, toProfileWrite } from "../rows";
import type { ProfileWrite } from "../rows";

const goodRow: Tables<"profiles"> = {
  user_id: "u1",
  citizenship_country_code: "PL",
  residence_country_code: "DE",
  home_city_place_id: "city-berlin",
  home_airport_code: "BER",
  home_currency: "EUR",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

describe("profileRowSchema", () => {
  it("parses a good row and maps it", () => {
    expect(profileFromRowSchema.parse(goodRow)).toEqual({
      citizenship: "PL",
      residence: "DE",
      homeCityId: "city-berlin",
      homeAirport: "BER",
      homeCurrency: "EUR",
    });
  });
  it("accepts out-of-directory values of valid format (AC-27)", () => {
    const row = {
      ...goodRow,
      citizenship_country_code: "XK",
      home_city_place_id: "city-unknown",
      home_airport_code: "ZZZ",
    };
    expect(profileRowSchema.safeParse(row).success).toBe(true);
  });
  it.each([
    { citizenship_country_code: "pl" },
    { home_airport_code: "KRKX" },
    { home_city_place_id: "town-x" },
    { home_currency: "eur" },
  ])("rejects bad format %o", (bad) => {
    expect(profileRowSchema.safeParse({ ...goodRow, ...bad }).success).toBe(false);
  });
});

describe("toProfile / toProfileWrite", () => {
  it("maps null to the empty profile", () => {
    expect(toProfile(null)).toBe(EMPTY_PROFILE);
  });
  it("writes only patch keys plus user_id", () => {
    expect(toProfileWrite("u1", { homeCurrency: "PLN" })).toEqual({ user_id: "u1", home_currency: "PLN" });
    expect(toProfileWrite("u1", { homeAirport: null })).toEqual({ user_id: "u1", home_airport_code: null });
  });
  it("ProfileWrite is assignable to TablesInsert<profiles>", () => {
    const write: ProfileWrite = toProfileWrite("u1", { residence: "DE" });
    const insert: TablesInsert<"profiles"> = write;
    expect(insert.user_id).toBe("u1");
  });
});
