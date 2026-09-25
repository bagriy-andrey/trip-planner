import { describe, expect, it } from "vitest";
import { codePointLength, multiLine, singleLine, trimmed } from "../text";

describe("form text helpers", () => {
  it("counts an emoji as one code point", () => {
    expect(codePointLength("a\u{1F697}b")).toBe(3);
    expect("a\u{1F697}b".length).toBe(4);
  });

  it("singleLine trims and collapses whitespace, empty gives null", () => {
    expect(singleLine("  a \t\n b  ")).toBe("a b");
    expect(singleLine("   ")).toBeNull();
    expect(singleLine(5)).toBeNull();
  });

  it("multiLine keeps line breaks and normalises CRLF/CR", () => {
    expect(multiLine(" a\r\nb\rc\nd ")).toBe("a\nb\nc\nd");
    expect(multiLine("\n\t")).toBeNull();
    expect(multiLine(undefined)).toBeNull();
  });

  it("trimmed gives an empty string for non-strings", () => {
    expect(trimmed("  x ")).toBe("x");
    expect(trimmed(null)).toBe("");
  });
});
