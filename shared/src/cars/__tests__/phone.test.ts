import { describe, expect, it } from "vitest";
import { parsePhone, telHref } from "../phone";

describe("parsePhone", () => {
  it.each(["+351 308 810 777", "(308) 810-777", "123", "+123456789012345"])("accepts %s", (input) => {
    expect(parsePhone(input)).toEqual({ ok: true, phone: input });
  });

  it.each([
    "12",
    "1234567890123456",
    "+351 308 810 777 ext 2",
    "++1234",
    "abc1234",
    "1".repeat(33),
    "+",
  ])("rejects %s", (input) => {
    expect(parsePhone(input)).toEqual({ ok: false, error: "phone.invalid" });
  });

  it("empty gives null, whitespace is collapsed", () => {
    expect(parsePhone("   ")).toEqual({ ok: true, phone: null });
    expect(parsePhone(undefined)).toEqual({ ok: true, phone: null });
    expect(parsePhone("  +351   308 810 777 ")).toEqual({ ok: true, phone: "+351 308 810 777" });
  });
});

describe("telHref", () => {
  it("builds a compact tel link and keeps the plus", () => {
    expect(telHref("+351 (308) 810-777")).toBe("tel:+351308810777");
    expect(telHref("(308) 810-777")).toBe("tel:308810777");
  });

  it("gives null for invalid or empty values", () => {
    expect(telHref("12")).toBeNull();
    expect(telHref("call me")).toBeNull();
    expect(telHref(null)).toBeNull();
    expect(telHref("")).toBeNull();
  });
});
