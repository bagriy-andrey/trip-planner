import { filterMoneyInput } from "../hooks/moneyInput";

describe("filterMoneyInput", () => {
  it("keeps digits and one separator with two fraction digits", () => {
    expect(filterMoneyInput("12.50")).toBe("12.50");
    expect(filterMoneyInput("12,5")).toBe("12,5");
    expect(filterMoneyInput("12.")).toBe("12.");
    expect(filterMoneyInput("")).toBe("");
  });

  it("drops letters, spaces, minus, plus and exponent", () => {
    expect(filterMoneyInput("-1e5 abc")).toBe("15");
    expect(filterMoneyInput("1 234+5")).toBe("12345");
  });

  it("allows only the first separator and cuts the fraction to 2 digits", () => {
    expect(filterMoneyInput("1.2.3")).toBe("1.23");
    expect(filterMoneyInput("1,999")).toBe("1,99");
  });

  it("limits the integer part to the shared money limit", () => {
    expect(filterMoneyInput("123456789012")).toBe("1234567890");
    expect(filterMoneyInput("123456789012.5")).toBe("1234567890.5");
  });
});
