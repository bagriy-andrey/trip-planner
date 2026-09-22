import { describe, expect, it } from "vitest";
import { tripFromRowSchema, tripRowSchema, toTrip, type Tables } from "../../index";

// A row exactly as PostgREST returns it (typed by the generated DB type: a renamed column fails tsc).
const customRow: Tables<"trips"> = {
  id: "5b1e3c0e-1c3f-4c6e-9a53-3b7f0f8d2a11",
  user_id: "0d4c1f5a-8b6a-4d0e-b0a3-6a6a1c9d7e22",
  destination: "Тоскана",
  place_kind: "custom",
  place_id: null,
  country_code: null,
  iana_timezone: null,
  airport_code: null,
  title: null,
  start_date: null,
  end_date: null,
  archived_at: null,
  created_at: "2026-09-21T19:39:35.123456+00:00",
  updated_at: "2026-09-21T19:39:35.123456+00:00",
};

const cityRow: Tables<"trips"> = {
  ...customRow,
  destination: "Порту",
  place_kind: "city",
  place_id: "city-porto",
  country_code: "PT",
  iana_timezone: "Europe/Lisbon",
  airport_code: "OPO",
  title: "Отпуск",
  start_date: "2026-09-12",
  end_date: "2026-09-18",
};

const countryRow: Tables<"trips"> = {
  ...customRow,
  destination: "Португалия",
  place_kind: "country",
  place_id: "country-pt",
  country_code: "PT",
};

function parse(row: unknown) {
  return tripFromRowSchema.safeParse(row);
}

describe("tripRowSchema (AC-61)", () => {
  it("turns a good city row into the domain trip (camelCase, no user_id)", () => {
    const result = parse(cityRow);
    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      id: cityRow.id,
      destination: "Порту",
      place: { kind: "city", placeId: "city-porto", countryCode: "PT", timeZone: "Europe/Lisbon", airportCode: "OPO" },
      title: "Отпуск",
      startDate: "2026-09-12",
      endDate: "2026-09-18",
      archivedAt: null,
      createdAt: "2026-09-21T19:39:35.123456+00:00",
      updatedAt: "2026-09-21T19:39:35.123456+00:00",
    });
    expect(result.data).not.toHaveProperty("user_id");
    expect(result.data).not.toHaveProperty("userId");
  });

  it("turns a good custom row and a good country row into the domain trip", () => {
    expect(parse(customRow).data?.place).toEqual({ kind: "custom" });
    expect(parse(countryRow).data?.place).toEqual({ kind: "country", placeId: "country-pt", countryCode: "PT" });
    expect(parse(customRow).data).toMatchObject({ startDate: null, endDate: null, title: null });
  });

  it("keeps an archive mark as-is", () => {
    const archived = parse({ ...cityRow, archived_at: "2026-09-20T08:00:00+00:00" });
    expect(archived.data?.archivedAt).toBe("2026-09-20T08:00:00+00:00");
    expect(parse({ ...cityRow, archived_at: "2026-09-20T08:00:00.5Z" }).success).toBe(true);
  });

  it("does NOT treat an unknown place_id as an error (Q3): the directory may have changed", () => {
    const result = parse({ ...cityRow, place_id: "city-atlantis-that-was-removed" });
    expect(result.success).toBe(true);
    expect(result.data?.place).toMatchObject({ kind: "city", placeId: "city-atlantis-that-was-removed" });
  });

  it("exposes the validated row and toTrip separately", () => {
    const row = tripRowSchema.parse(cityRow);
    expect(row).not.toHaveProperty("user_id");
    expect(toTrip(row)).toEqual(parse(cityRow).data);
  });

  it.each<[string, Record<string, unknown>]>([
    ["a missing id", { id: undefined }],
    ["an empty id", { id: "" }],
    ["an empty destination", { destination: "" }],
    ["a blank destination", { destination: "   " }],
    ["an 81-character destination", { destination: "a".repeat(81) }],
    ["an empty title (the DB stores null)", { title: "" }],
    ["an 81-character title", { title: "a".repeat(81) }],
    ["an unknown place_kind", { place_kind: "planet" }],
    ["a lower-case country_code", { country_code: "pt" }],
    ["a three-letter country_code", { country_code: "PRT" }],
    ["a null country_code on a city", { country_code: null }],
    ["a null place_id on a city", { place_id: null }],
    ["a digit in the airport code (0P0)", { airport_code: "0P0" }],
    ["a lower-case airport code", { airport_code: "opo" }],
    ["a two-letter airport code", { airport_code: "OP" }],
    ["an invalid time zone", { iana_timezone: "Europe/Atlantis" }],
    ["a null time zone on a city", { iana_timezone: null }],
    ["a start date that carries a time", { start_date: "2026-09-12T10:00:00Z" }],
    ["a non-existent start date", { start_date: "2026-02-30" }],
    ["only a start date (dates come in pairs)", { end_date: null }],
    ["only an end date", { start_date: null }],
    ["an end before the start", { start_date: "2026-09-19" }],
    ["a 366-day trip", { start_date: "2026-01-01", end_date: "2027-01-02" }],
    ["a non-ISO created_at", { created_at: "yesterday" }],
    ["a missing updated_at", { updated_at: undefined }],
    ["a numeric id", { id: 7 }],
  ])("fails on %s", (_label, patch) => {
    expect(parse({ ...cityRow, ...patch }).success).toBe(false);
  });

  it("fails on a custom row that still carries place fields (trips_custom_place_clean)", () => {
    for (const patch of [
      { place_id: "city-porto" },
      { country_code: "PT" },
      { iana_timezone: "Europe/Lisbon" },
      { airport_code: "OPO" },
    ]) {
      expect(parse({ ...customRow, ...patch }).success, JSON.stringify(patch)).toBe(false);
    }
  });

  it("fails on a country row with an airport (trips_country_no_airport)", () => {
    expect(parse({ ...countryRow, airport_code: "LIS" }).success).toBe(false);
  });

  it("accepts a 365-day trip and a same-day trip", () => {
    expect(parse({ ...cityRow, start_date: "2026-01-01", end_date: "2027-01-01" }).success).toBe(true);
    expect(parse({ ...cityRow, start_date: "2026-09-12", end_date: "2026-09-12" }).success).toBe(true);
  });

  it("fails (never throws) on non-row input", () => {
    for (const input of [null, undefined, 42, "row", [], {}]) {
      expect(parse(input).success).toBe(false);
    }
  });
});
