import { describe, expect, it } from "vitest";
import { CURRENCIES, isCurrencyCode, searchCurrencies } from "../currencies";

describe("currencies", () => {
  it("has 40 unique upper-case codes", () => {
    expect(CURRENCIES).toHaveLength(40);
    expect(new Set(CURRENCIES).size).toBe(40);
    for (const code of CURRENCIES) expect(code).toMatch(/^[A-Z]{3}$/);
  });
  it("isCurrencyCode is exact", () => {
    expect(isCurrencyCode("EUR")).toBe(true);
    expect(isCurrencyCode("eur")).toBe(false);
    expect(isCurrencyCode("XXX")).toBe(false);
    expect(isCurrencyCode(5)).toBe(false);
  });
  it("searchCurrencies matches a prefix, any case, in list order", () => {
    expect(searchCurrencies("e")).toEqual(["EUR", "EGP"]);
    expect(searchCurrencies("us")).toEqual(["USD"]);
    expect(searchCurrencies("A", 2)).toEqual(["AMD", "AZN"]);
    expect(searchCurrencies("")).toEqual([]);
    expect(searchCurrencies("Q")).toEqual([]);
  });
});
