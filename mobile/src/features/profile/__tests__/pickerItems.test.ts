import { EMPTY_PROFILE, PLACE_DIRECTORY } from "@tripplanner/shared";
import type { Profile } from "@tripplanner/shared";

import { emptyWhenBlankFor, itemsFor, selectedKeyOf } from "../pickerItems";

const p = (over: Partial<Profile>): Profile => ({ ...EMPTY_PROFILE, ...over });

describe("itemsFor", () => {
  it("lists countries with a flag and the alpha-2 code", () => {
    const items = itemsFor("citizenship", "portugal", "en", EMPTY_PROFILE);
    expect(items[0]).toEqual({ key: "PT", name: "Portugal", code: "PT", flagCountryCode: "PT" });
  });

  it("limits cities to the residence country; flag and code are the country's", () => {
    const items = itemsFor("homeCity", "", "en", p({ residence: "PT" }));
    expect(items.length).toBeGreaterThan(0);
    expect(items.every((item) => item.code === "PT" && item.flagCountryCode === "PT")).toBe(true);
    expect(items.map((item) => item.key)).toContain("city-lisbon");
  });

  it("lists airports without a flag; the spoken name is the airport name (AC-43)", () => {
    const [first] = itemsFor("homeAirport", "lis", "en", EMPTY_PROFILE);
    expect(first).toEqual({ key: "LIS", name: "Lisbon Airport", code: "LIS", a11yName: "Lisbon Airport" });
    expect(first?.flagCountryCode).toBeUndefined();
  });

  it("puts the airports of the home city first", () => {
    const [first] = itemsFor("homeAirport", "", "en", p({ homeCityId: "city-lisbon" }));
    expect(first?.key).toBe("LIS");
  });

  it("lists currencies by code", () => {
    const items = itemsFor("homeCurrency", "eur", "en", EMPTY_PROFILE);
    expect(items[0]).toMatchObject({ key: "EUR", code: "EUR" });
  });
});

describe("selectedKeyOf", () => {
  it("maps each field to its stored value", () => {
    const profile = p({
      citizenship: "PT",
      residence: "FR",
      homeCityId: "city-paris",
      homeAirport: "CDG",
      homeCurrency: "EUR",
    });
    expect(selectedKeyOf("citizenship", profile)).toBe("PT");
    expect(selectedKeyOf("residence", profile)).toBe("FR");
    expect(selectedKeyOf("homeCity", profile)).toBe("city-paris");
    expect(selectedKeyOf("homeAirport", profile)).toBe("CDG");
    expect(selectedKeyOf("homeCurrency", profile)).toBe("EUR");
    expect(selectedKeyOf("homeCity", EMPTY_PROFILE)).toBeNull();
  });
});

describe("emptyWhenBlankFor (AC-26)", () => {
  const withCities = new Set<string>(
    PLACE_DIRECTORY.flatMap((place) => (place.kind === "city" ? [place.countryCode] : [])),
  );
  const cityless = PLACE_DIRECTORY.find((place) => place.kind === "country" && !withCities.has(place.countryCode));

  it("is true only for the city field of a residence without cities", () => {
    if (cityless?.kind !== "country") throw new Error("fixture: no country without cities");
    expect(emptyWhenBlankFor("homeCity", p({ residence: cityless.countryCode }))).toBe(true);
    expect(emptyWhenBlankFor("homeCity", p({ residence: "PT" }))).toBe(false);
    expect(emptyWhenBlankFor("homeCity", EMPTY_PROFILE)).toBe(false);
    expect(emptyWhenBlankFor("homeAirport", p({ residence: cityless.countryCode }))).toBe(false);
  });
});
