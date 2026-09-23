import { describe, expect, it } from "vitest";
import { MAPS_URL_MAX_LENGTH, parseMapsUrl } from "../mapsUrl";

describe("parseMapsUrl: accepted", () => {
  const valid: [string, string][] = [
    ["https://www.google.com/maps", "https://www.google.com/maps"],
    ["https://google.com/maps/place/Hotel", "https://google.com/maps/place/Hotel"],
    ["https://www.google.com/maps?q=Porto", "https://www.google.com/maps?q=Porto"],
    ["https://www.google.com/maps#x", "https://www.google.com/maps#x"],
    ["https://maps.google.com/?q=a", "https://maps.google.com/?q=a"],
    ["https://maps.app.goo.gl/AbC123", "https://maps.app.goo.gl/AbC123"],
    ["https://goo.gl/maps/xyz", "https://goo.gl/maps/xyz"],
    ["HTTPS://WWW.GOOGLE.COM/maps", "https://www.google.com/maps"],
    ["  https://maps.app.goo.gl/x\n", "https://maps.app.goo.gl/x"],
  ];
  it.each(valid)("%s", (input, url) => {
    expect(parseMapsUrl(input)).toEqual({ ok: true, url });
  });
});

describe("parseMapsUrl: rejected", () => {
  const cyrillicO = "о";
  const invalid = [
    "http://www.google.com/maps",
    "javascript:alert(1)",
    "data:text/html,x",
    "https://user@www.google.com/maps",
    "https://www.google.com:443/maps",
    "https://www.google.com.evil.tld/maps",
    "https://evil.tld/www.google.com/maps",
    `https://g${cyrillicO}${cyrillicO}gle.com/maps`,
    "https://www.google.com/mapsevil",
    "https://goo.gl/abc",
    "https://maps.google.com\\@evil",
    "https://www.google.com/maps x",
    "https://google.com./maps",
    "https://google.pl/maps",
    "//www.google.com/maps",
    "",
    "   ",
  ];
  it.each(invalid)("%s", (input) => {
    expect(parseMapsUrl(input)).toEqual({ ok: false, error: "mapsUrl.notGoogleMaps" });
  });

  it("non-strings", () => {
    expect(parseMapsUrl(undefined)).toEqual({ ok: false, error: "mapsUrl.notGoogleMaps" });
    expect(parseMapsUrl(5)).toEqual({ ok: false, error: "mapsUrl.notGoogleMaps" });
  });

  it("2049 characters are too long, 2048 fit", () => {
    const base = "https://maps.app.goo.gl/";
    expect(parseMapsUrl(base + "a".repeat(MAPS_URL_MAX_LENGTH - base.length))).toMatchObject({ ok: true });
    expect(parseMapsUrl(base + "a".repeat(MAPS_URL_MAX_LENGTH - base.length + 1))).toEqual({
      ok: false,
      error: "mapsUrl.tooLong",
    });
  });
});
