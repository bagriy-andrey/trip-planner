import { describe, expect, it } from "vitest";
import { PLACE_DIRECTORY, foldForSearch, isValidTimeZone } from "../../index";

describe("foldForSearch", () => {
  it("lower-cases", () => {
    expect(foldForSearch("PORTO")).toBe("porto");
    expect(foldForSearch("Порту")).toBe("порту");
  });

  it.each([
    ["Zürich", "zurich"],
    ["São Paulo", "sao paulo"],
    ["Côte d’Ivoire", "cote d'ivoire"],
    ["Malé", "male"],
    ["Bogotá", "bogota"],
    ["Cancún", "cancun"],
    ["Curaçao", "curacao"],
    ["Łódź", "lodz"],
    ["Reykjavík", "reykjavik"],
    ["Straße", "strasse"],
    ["Ærø", "aero"],
    ["Đa", "da"],
  ])("folds %j to %j", (input, expected) => {
    expect(foldForSearch(input)).toBe(expected);
  });

  it("strips combining marks of an already decomposed input", () => {
    // built from code points so the test cannot be silently "fixed" by an editor normalising it
    const mark = (code: number) => String.fromCodePoint(code);
    expect(foldForSearch("Zu" + mark(0x0308) + "rich")).toBe("zurich");
    expect(foldForSearch("Pe" + mark(0x0301))).toBe("pe");
    expect(foldForSearch("Sa" + mark(0x0303) + "o")).toBe("sao");
    // a decomposed Cyrillic й is и + U+0306
    expect(foldForSearch("\u0418" + mark(0x0306))).toBe("\u0438");
  });

  it("folds Cyrillic ё to е and й to и, without transliterating between alphabets", () => {
    expect(foldForSearch("Ёлка")).toBe("елка");
    expect(foldForSearch("Йемен")).toBe("иемен");
    expect(foldForSearch("Порту")).not.toBe("porto");
  });

  it("leaves digits, spaces, hyphens and unknown symbols alone", () => {
    expect(foldForSearch("1 a-b")).toBe("1 a-b");
    expect(foldForSearch("日本")).toBe("日本");
  });

  it("is total: empty in, empty out", () => {
    expect(foldForSearch("")).toBe("");
  });

  it("agrees with the NFD + strip-marks reference for every character the table claims", () => {
    // The table replaces `normalize("NFD")` (R-4): here, where NFD exists, prove it is equivalent
    // on Latin-1 Supplement and Latin Extended-A (letters NFD cannot decompose are checked above).
    const undecomposable = new Set("ßæðøþđħıĳĸŀłŉŋœſŧ×÷".split(""));
    for (let code = 0xc0; code <= 0x17f; code += 1) {
      const ch = String.fromCharCode(code);
      if (undecomposable.has(ch.toLowerCase())) continue;
      const reference = ch.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
      expect(foldForSearch(ch), `U+${code.toString(16)} ${ch}`).toBe(reference);
    }
  });

  it("leaves no non-ASCII Latin letter in any folded English directory name", () => {
    for (const place of PLACE_DIRECTORY) {
      expect(foldForSearch(place.en), place.id).toMatch(/^[a-z0-9 '\-]+$/);
    }
  });
});

describe("isValidTimeZone", () => {
  it("accepts IANA ids and rejects garbage", () => {
    expect(isValidTimeZone("Europe/Lisbon")).toBe(true);
    expect(isValidTimeZone("America/Argentina/Buenos_Aires")).toBe(true);
    expect(isValidTimeZone("UTC")).toBe(true);
    expect(isValidTimeZone("Europe/Atlantis")).toBe(false);
    expect(isValidTimeZone("")).toBe(false);
    expect(isValidTimeZone("not a zone")).toBe(false);
    expect(isValidTimeZone(null)).toBe(false);
    expect(isValidTimeZone(42)).toBe(false);
  });
});
