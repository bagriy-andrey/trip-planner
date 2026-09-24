import { describe, expect, it } from "vitest";
import { homeCurrencyDefault } from "../defaults";

describe("homeCurrencyDefault", () => {
  it("keeps a known currency and drops everything else", () => {
    expect(homeCurrencyDefault("PLN")).toBe("PLN");
    expect(homeCurrencyDefault("ZZZ")).toBeNull();
    expect(homeCurrencyDefault("pln")).toBeNull();
    expect(homeCurrencyDefault(null)).toBeNull();
  });
});
