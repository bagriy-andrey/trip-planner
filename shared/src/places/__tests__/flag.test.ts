import { describe, expect, it } from "vitest";
import { flagEmojiOf } from "../flag";

describe("flagEmojiOf", () => {
  it("builds two regional indicators for an alpha-2 code", () => {
    expect(flagEmojiOf("PL")).toBe(String.fromCodePoint(0x1f1f5, 0x1f1f1));
    expect(Array.from(flagEmojiOf("UA") ?? "")).toHaveLength(2);
  });

  it("returns null for anything that is not two upper-case Latin letters", () => {
    for (const bad of ["pl", "POL", "", "P1", "P", " P", "Пл"]) expect(flagEmojiOf(bad)).toBeNull();
  });
});
