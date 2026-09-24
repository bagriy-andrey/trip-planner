import { describe, expect, it } from "vitest";
import { CURRENCIES } from "../currencies";
import { searchCurrencyOptions } from "../currencySearch";

describe("searchCurrencyOptions", () => {
  it("returns exactly CURRENCIES for a blank query", () => {
    expect(searchCurrencyOptions("", "ru")).toEqual([...CURRENCIES]);
    expect(searchCurrencyOptions("   ", "en")).toHaveLength(40);
  });

  it("puts an exact code first, any case, without duplicates", () => {
    const result = searchCurrencyOptions("pln", "ru");
    expect(result[0]).toBe("PLN");
    expect(new Set(result).size).toBe(result.length);
  });

  it("matches the start of the ru or en name in either UI language", () => {
    expect(searchCurrencyOptions("Польск", "en")).toContain("PLN");
    expect(searchCurrencyOptions("Polish", "ru")).toEqual(["PLN"]);
    expect(searchCurrencyOptions("Дол", "ru")).toContain("USD");
  });

  it("returns nothing for a miss and does not match the middle of a name", () => {
    expect(searchCurrencyOptions("qqq", "en")).toEqual([]);
    expect(searchCurrencyOptions("лотый", "ru")).toEqual([]);
  });
});
