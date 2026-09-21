import { describe, expect, it } from "vitest";
import {
  TRIP_FIELD_ERROR,
  isTripFieldErrorId,
  parseForm,
  parseTripForm,
  toTripWrite,
  tripFormSchema,
  type TablesInsert,
  type TablesUpdate,
  type TripFormValue,
} from "../../index";

const baseInput = { destination: "Порту", placeId: null, title: null, startDate: null, endDate: null };

function ok(input: unknown): TripFormValue {
  const result = parseTripForm(input);
  if (!result.ok) throw new Error(`expected a valid form, got ${JSON.stringify(result.fieldErrors)}`);
  return result.value;
}

function errors(input: unknown): Record<string, string | undefined> {
  const result = parseTripForm(input);
  if (result.ok) throw new Error("expected an invalid form");
  return result.fieldErrors;
}

describe("TRIP_FIELD_ERROR contract (AC-27)", () => {
  it("pins the literal list of ids clients read (changing it is a breaking change)", () => {
    expect(Object.values(TRIP_FIELD_ERROR).sort()).toEqual(
      [
        "dates.endBeforeStart",
        "dates.incomplete",
        "dates.tooLong",
        "destination.empty",
        "destination.tooLong",
        "title.tooLong",
      ].sort(),
    );
  });

  it("recognises exactly those ids", () => {
    for (const id of Object.values(TRIP_FIELD_ERROR)) expect(isTripFieldErrorId(id)).toBe(true);
    expect(isTripFieldErrorId("Укажите, куда едем")).toBe(false);
    expect(isTripFieldErrorId("dates.other")).toBe(false);
    expect(isTripFieldErrorId(undefined)).toBe(false);
  });
});

describe("destination (AC-26)", () => {
  it("trims the edges", () => {
    expect(ok({ ...baseInput, destination: "  Порту  " }).destination).toBe("Порту");
  });

  it("collapses inner whitespace runs into one space", () => {
    expect(ok({ ...baseInput, destination: "Санкт   Петербург" }).destination).toBe("Санкт Петербург");
    expect(ok({ ...baseInput, destination: "Rio \t\n de   Janeiro" }).destination).toBe("Rio de Janeiro");
    // non-breaking / ideographic spaces count as whitespace too
    expect(ok({ ...baseInput, destination: " Rio　de Janeiro " }).destination).toBe("Rio de Janeiro");
  });

  it.each(["", "   ", "\t\n", "  "])("treats %j as destination.empty", (destination) => {
    expect(errors({ ...baseInput, destination }).destination).toBe("destination.empty");
  });

  it("treats a missing / non-string destination as destination.empty", () => {
    expect(errors({}).destination).toBe("destination.empty");
    expect(errors({ ...baseInput, destination: undefined }).destination).toBe("destination.empty");
    expect(errors({ ...baseInput, destination: 42 }).destination).toBe("destination.empty");
    expect(errors({ ...baseInput, destination: null }).destination).toBe("destination.empty");
  });

  it("accepts 80 characters and rejects 81 with destination.tooLong", () => {
    expect(ok({ ...baseInput, destination: "a".repeat(80) }).destination).toHaveLength(80);
    expect(errors({ ...baseInput, destination: "a".repeat(81) }).destination).toBe("destination.tooLong");
  });

  it("counts code points: an emoji is one character", () => {
    const eightyEmoji = "🌍".repeat(80);
    expect(eightyEmoji.length).toBe(160); // UTF-16 units
    expect(ok({ ...baseInput, destination: eightyEmoji }).destination).toBe(eightyEmoji);
    expect(errors({ ...baseInput, destination: "🌍".repeat(81) }).destination).toBe("destination.tooLong");
  });

  it("measures the length AFTER normalising (padding does not count)", () => {
    expect(ok({ ...baseInput, destination: `   ${"a".repeat(80)}   ` }).destination).toHaveLength(80);
    expect(ok({ ...baseInput, destination: `${"a".repeat(39)}    ${"b".repeat(40)}` }).destination).toHaveLength(80);
  });
});

describe("title (AC-26)", () => {
  it("is optional: missing, null and blank all become null", () => {
    expect(ok({ destination: "Порту" }).title).toBeNull();
    expect(ok({ ...baseInput, title: null }).title).toBeNull();
    expect(ok({ ...baseInput, title: "" }).title).toBeNull();
    expect(ok({ ...baseInput, title: "   " }).title).toBeNull();
  });

  it("trims and collapses", () => {
    expect(ok({ ...baseInput, title: "  Отпуск   с  друзьями " }).title).toBe("Отпуск с друзьями");
  });

  it("accepts 80 and rejects 81 code points with title.tooLong", () => {
    expect(ok({ ...baseInput, title: "я".repeat(80) }).title).toHaveLength(80);
    expect(errors({ ...baseInput, title: "я".repeat(81) }).title).toBe("title.tooLong");
    expect(ok({ ...baseInput, title: "😀".repeat(80) }).title).toBe("😀".repeat(80));
    expect(errors({ ...baseInput, title: "😀".repeat(81) }).title).toBe("title.tooLong");
  });
});

describe("dates (AC-16 .. AC-19)", () => {
  it("accepts no dates (empty, null, missing, blank) as a draft", () => {
    for (const dates of [{}, { startDate: null, endDate: null }, { startDate: "", endDate: "" }, { startDate: " ", endDate: null }]) {
      const value = ok({ ...baseInput, ...dates });
      expect(value.startDate).toBeNull();
      expect(value.endDate).toBeNull();
    }
  });

  it("accepts two valid dates, including start = end", () => {
    const value = ok({ ...baseInput, startDate: "2026-09-12", endDate: "2026-09-18" });
    expect(value.startDate).toBe("2026-09-12");
    expect(value.endDate).toBe("2026-09-18");
    expect(ok({ ...baseInput, startDate: "2026-09-12", endDate: "2026-09-12" }).endDate).toBe("2026-09-12");
  });

  it("reports ONE date of the two as dates.incomplete, under the `dates` key", () => {
    expect(errors({ ...baseInput, startDate: "2026-09-12", endDate: null }).dates).toBe("dates.incomplete");
    expect(errors({ ...baseInput, startDate: null, endDate: "2026-09-12" }).dates).toBe("dates.incomplete");
    expect(errors({ ...baseInput, startDate: "2026-09-12", endDate: "" }).dates).toBe("dates.incomplete");
    expect(errors({ ...baseInput, startDate: "2026-09-12" }).dates).toBe("dates.incomplete");
  });

  it("reports an end before the start as dates.endBeforeStart", () => {
    expect(errors({ ...baseInput, startDate: "2026-09-12", endDate: "2026-09-11" }).dates).toBe("dates.endBeforeStart");
    expect(errors({ ...baseInput, startDate: "2027-01-01", endDate: "2026-12-31" }).dates).toBe("dates.endBeforeStart");
  });

  it("accepts a 365-day trip and rejects 366 with dates.tooLong", () => {
    expect(ok({ ...baseInput, startDate: "2026-01-01", endDate: "2027-01-01" }).endDate).toBe("2027-01-01");
    expect(errors({ ...baseInput, startDate: "2026-01-01", endDate: "2027-01-02" }).dates).toBe("dates.tooLong");
    // the leap-year edge: 2024-01-01 -> 2024-12-31 is 365 days, -> 2025-01-01 is 366
    expect(ok({ ...baseInput, startDate: "2024-01-01", endDate: "2024-12-31" }).endDate).toBe("2024-12-31");
    expect(errors({ ...baseInput, startDate: "2024-01-01", endDate: "2025-01-01" }).dates).toBe("dates.tooLong");
  });

  it("rejects a date that carries a time (calendar dates only, AC-16)", () => {
    for (const bad of ["2026-09-12T10:00:00Z", "2026-09-12T00:00:00.000+02:00", "2026-09-12 10:00", "2026-09-12T10:00"]) {
      expect(errors({ ...baseInput, startDate: bad, endDate: "2026-09-18" }).dates, bad).toBe("dates.incomplete");
      expect(errors({ ...baseInput, startDate: "2026-09-12", endDate: bad }).dates, bad).toBe("dates.incomplete");
    }
  });

  it("rejects a non-existent or non-string date under `dates`, never under startDate/endDate", () => {
    expect(errors({ ...baseInput, startDate: "2026-02-30", endDate: "2026-03-05" }).dates).toBe("dates.incomplete");
    expect(errors({ ...baseInput, startDate: 20260912, endDate: "2026-09-18" }).dates).toBe("dates.incomplete");
    expect(errors({ ...baseInput, startDate: new Date(), endDate: "2026-09-18" })).not.toHaveProperty("startDate");
  });

  it("accepts a past range without any warning (AC-20)", () => {
    expect(ok({ ...baseInput, startDate: "2019-05-01", endDate: "2019-05-09" }).startDate).toBe("2019-05-01");
  });
});

describe("parseTripForm reports every invalid field at once", () => {
  it("returns destination, title and dates errors together", () => {
    expect(
      errors({ destination: "  ", title: "x".repeat(81), startDate: "2026-09-12", endDate: "2026-09-01" }),
    ).toEqual({
      destination: "destination.empty",
      title: "title.tooLong",
      dates: "dates.endBeforeStart",
    });
  });

  it("treats a non-object input as a form with every field missing, and never throws", () => {
    for (const input of [null, undefined, 42, "text", [], () => undefined]) {
      expect(errors(input)).toEqual({ destination: "destination.empty" });
    }
  });

  it("returns ids only, never texts", () => {
    const fieldErrors = errors({ destination: "", title: "x".repeat(99), startDate: "2026-09-12" });
    for (const id of Object.values(fieldErrors)) expect(isTripFieldErrorId(id)).toBe(true);
  });

  it("is the same schema for create and edit (AC-49): re-parsing its own output is stable", () => {
    const first = ok({ destination: "  Порту ", placeId: "city-porto", title: " Тур ", startDate: "2026-09-12", endDate: "2026-09-18" });
    const second = ok({
      destination: first.destination,
      placeId: first.place.kind === "custom" ? null : first.place.placeId,
      title: first.title,
      startDate: first.startDate,
      endDate: first.endDate,
    });
    expect(second).toEqual(first);
  });

  it("works through the generic parseForm too, with an injected id guard", () => {
    const result = parseForm(tripFormSchema, { destination: "" }, isTripFieldErrorId);
    expect(result).toEqual({ ok: false, fieldErrors: { destination: "destination.empty" } });
  });
});

describe("place resolution and toTripWrite (AC-15, AC-51)", () => {
  it("free text -> place_kind custom and ALL FOUR place fields null", () => {
    const write = toTripWrite(ok({ ...baseInput, destination: "Тоскана" }));
    expect(write).toEqual({
      destination: "Тоскана",
      title: null,
      place_kind: "custom",
      place_id: null,
      country_code: null,
      iana_timezone: null,
      airport_code: null,
      start_date: null,
      end_date: null,
    });
  });

  it("a city pick fills place_id, country_code, iana_timezone and airport_code from the directory", () => {
    const write = toTripWrite(ok({ ...baseInput, placeId: "city-porto", startDate: "2026-09-12", endDate: "2026-09-18" }));
    expect(write).toEqual({
      destination: "Порту",
      title: null,
      place_kind: "city",
      place_id: "city-porto",
      country_code: "PT",
      iana_timezone: "Europe/Lisbon",
      airport_code: "OPO",
      start_date: "2026-09-12",
      end_date: "2026-09-18",
    });
  });

  it("a country pick fills place_id and country_code; time zone and airport stay null", () => {
    const write = toTripWrite(ok({ ...baseInput, destination: "Португалия", placeId: "country-pt" }));
    expect(write).toMatchObject({
      place_kind: "country",
      place_id: "country-pt",
      country_code: "PT",
      iana_timezone: null,
      airport_code: null,
    });
  });

  it("switching custom -> city -> custom leaves no stale value (every key is always written)", () => {
    const keys = ["place_kind", "place_id", "country_code", "iana_timezone", "airport_code"] as const;
    const city = toTripWrite(ok({ ...baseInput, placeId: "city-porto" }));
    const backToCustom = toTripWrite(ok({ ...baseInput, destination: "Мой Порту", placeId: null }));
    expect(Object.keys(backToCustom).sort()).toEqual(Object.keys(city).sort());
    for (const key of keys.filter((k) => k !== "place_kind")) {
      expect(backToCustom[key], key).toBeNull();
    }
    expect(backToCustom.place_kind).toBe("custom");
  });

  it("switching city -> country -> city overwrites every place field", () => {
    const city = toTripWrite(ok({ ...baseInput, placeId: "city-porto" }));
    const country = toTripWrite(ok({ ...baseInput, destination: "Португалия", placeId: "country-pt" }));
    const other = toTripWrite(ok({ ...baseInput, destination: "Лондон", placeId: "city-london" }));
    expect(city.airport_code).toBe("OPO");
    expect(country.airport_code).toBeNull(); // no stale airport on a country
    expect(country.iana_timezone).toBeNull(); // no stale zone on a country
    expect(other).toMatchObject({ place_id: "city-london", country_code: "GB", iana_timezone: "Europe/London", airport_code: "LHR" });
  });

  it("removing the dates writes explicit nulls (an edit to 'no dates' clears the columns)", () => {
    const write = toTripWrite(ok({ ...baseInput, startDate: "", endDate: "" }));
    expect(write.start_date).toBeNull();
    expect(write.end_date).toBeNull();
    expect("start_date" in write && "end_date" in write).toBe(true);
  });

  it("degrades an unknown or blank place id to free text instead of failing the form", () => {
    expect(toTripWrite(ok({ ...baseInput, placeId: "city-atlantis" })).place_kind).toBe("custom");
    expect(toTripWrite(ok({ ...baseInput, placeId: "" })).place_kind).toBe("custom");
    expect(toTripWrite(ok({ ...baseInput, placeId: 42 })).place_kind).toBe("custom");
  });

  it("never lets a custom write carry a place field (the DB check trips_custom_place_clean)", () => {
    for (const placeId of [null, "", "city-atlantis", "nonsense"]) {
      const write = toTripWrite(ok({ ...baseInput, placeId }));
      expect(write).toMatchObject({ place_kind: "custom", place_id: null, country_code: null, iana_timezone: null, airport_code: null });
    }
  });

  it("produces columns of the generated DB type (insert and update)", () => {
    const write = toTripWrite(ok({ ...baseInput, placeId: "city-porto", startDate: "2026-09-12", endDate: "2026-09-18" }));
    // Type-level: the write is assignable to both generated shapes (renamed/missing columns fail tsc).
    const insert: TablesInsert<"trips"> = write;
    const update: TablesUpdate<"trips"> = write;
    expect(insert.destination).toBe(update.destination);
  });

  it("does not write user_id, archived_at or timestamps (not the form's columns)", () => {
    const write = toTripWrite(ok(baseInput));
    for (const key of ["user_id", "archived_at", "created_at", "updated_at", "id"]) {
      expect(write).not.toHaveProperty(key);
    }
  });
});
