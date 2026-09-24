import { findCityById } from "@tripplanner/shared";

import {
  EMPTY_HOTEL_FORM,
  hotelFormEquals,
  hotelFormFromHotel,
  hotelFormFromTrip,
  nightsOf,
  toHotelFormInput,
  withDates,
} from "../hooks/formState";
import { LISBON_PLACE, makeHotel, makeTrip } from "./testKit";

describe("hotelFormFromTrip", () => {
  it("prefills the city and the trip dates; times stay empty (AC-10)", () => {
    const state = hotelFormFromTrip(
      makeTrip({ place: LISBON_PLACE, startDate: "2026-06-15", endDate: "2026-06-20" }),
      "en",
    );
    expect(state.city?.id).toBe("city-lisbon");
    expect(state.cityText).toBe("Lisbon");
    expect(state).toMatchObject({ checkInDate: "2026-06-15", checkOutDate: "2026-06-20", checkInTime: null, checkOutTime: null });
  });

  it("leaves the city empty for a country or free-text trip (AC-11)", () => {
    expect(hotelFormFromTrip(makeTrip(), "en").city).toBeNull();
    const country = makeTrip({ place: { kind: "country", placeId: "country-pt", countryCode: "PT" } });
    expect(hotelFormFromTrip(country, "en").cityText).toBe("");
  });

  it("leaves dates empty for a trip without dates", () => {
    const state = hotelFormFromTrip(makeTrip({ place: LISBON_PLACE }), "ru");
    expect(state).toMatchObject({ checkInDate: null, checkOutDate: null, cityText: "Лиссабон" });
    expect(nightsOf(state)).toBeNull();
  });
});

describe("hotelFormFromHotel", () => {
  it("copies calendar dates and optional times as stored, with no zone maths", () => {
    const state = hotelFormFromHotel(makeHotel({ checkInDate: "2026-06-15", checkInTime: "23:30", checkOutTime: null }), "en");
    expect(state).toMatchObject({
      checkInDate: "2026-06-15",
      checkInTime: "23:30",
      checkOutDate: "2026-06-18",
      checkOutTime: null,
    });
  });

  it("maps null optional fields to empty strings and a null breakfast count to 1", () => {
    expect(hotelFormFromHotel(makeHotel({ address: null }), "en")).toMatchObject({
      address: "",
      mapsUrlText: "",
      mapsUrl: null,
      costAmount: "",
      breakfastDays: 1,
    });
  });
});

describe("withDates", () => {
  it("pulls breakfast days back into the new range when the stay shrinks (AC-23)", () => {
    const wide = { ...EMPTY_HOTEL_FORM, checkInDate: "2026-06-10", checkOutDate: "2026-06-20", breakfast: "partial", breakfastDays: 8 } as const;
    expect(withDates(wide, { checkOutDate: "2026-06-13" }).breakfastDays).toBe(2);
  });

  it("keeps a valid count as is", () => {
    const state = { ...EMPTY_HOTEL_FORM, checkInDate: "2026-06-10", checkOutDate: "2026-06-20", breakfastDays: 3 } as const;
    expect(withDates(state, { checkInDate: "2026-06-11" }).breakfastDays).toBe(3);
  });
});

describe("hotelFormEquals / toHotelFormInput", () => {
  it("compares the city by id, not by object identity", () => {
    const lisbon = findCityById("city-lisbon")!;
    const a = { ...EMPTY_HOTEL_FORM, city: lisbon };
    expect(hotelFormEquals(a, { ...a, city: { ...lisbon } })).toBe(true);
    expect(hotelFormEquals(a, { ...a, name: "x" })).toBe(false);
  });

  it("passes the city id under cityPlaceId and no breakfast days outside 'partial'", () => {
    const input = toHotelFormInput({ ...EMPTY_HOTEL_FORM, city: findCityById("city-lisbon")!, breakfast: "all", breakfastDays: 4 });
    expect(input).toMatchObject({ cityPlaceId: "city-lisbon", breakfastDays: null });
  });

  it("prefers the accepted link, otherwise the typed text (the schema then rejects it)", () => {
    expect(toHotelFormInput({ ...EMPTY_HOTEL_FORM, mapsUrlText: "nope" }).mapsUrl).toBe("nope");
    expect(toHotelFormInput({ ...EMPTY_HOTEL_FORM, mapsUrlText: "x", mapsUrl: "https://maps.app.goo.gl/a" }).mapsUrl).toBe("https://maps.app.goo.gl/a");
  });
});
