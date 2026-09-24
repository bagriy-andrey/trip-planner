import { describe, expect, it } from "vitest";
import { CURRENCIES } from "../currencies";
import { CURRENCY_NAMES } from "../currencyNames";

describe("CURRENCY_NAMES", () => {
  it("covers exactly CURRENCIES with non-empty ru and en", () => {
    expect(Object.keys(CURRENCY_NAMES).sort()).toEqual([...CURRENCIES].sort());
    for (const code of CURRENCIES) {
      expect(CURRENCY_NAMES[code].ru.length).toBeGreaterThan(0);
      expect(CURRENCY_NAMES[code].en.length).toBeGreaterThan(0);
    }
  });
});
