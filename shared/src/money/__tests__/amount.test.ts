import { describe, expect, it } from "vitest";
import { parseMoneyAmount } from "../amount";

describe("parseMoneyAmount", () => {
  it.each([
    ["12", "12.00"],
    ["12.5", "12.50"],
    ["12,05", "12.05"],
    ["0", "0.00"],
    ["007", "7.00"],
    [" 1234.50 ", "1234.50"],
    ["9999999999", "9999999999.00"],
  ])("accepts %s", (input, amount) => {
    expect(parseMoneyAmount(input)).toEqual({ ok: true, amount });
  });

  it.each(["-1", "1e3", "12.345", "1 000", ",5", "12.", "", "abc", "+5", "12345678901"])(
    "rejects %s",
    (input) => {
      expect(parseMoneyAmount(input)).toEqual({ ok: false });
    },
  );
});
