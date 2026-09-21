import { displayNameOf, initialOf } from "../displayName";

describe("displayNameOf (AC-26)", () => {
  it("uses display_name when present", () => {
    expect(
      displayNameOf({ email: "anna@example.com", user_metadata: { display_name: "Anna Ivanova" } }),
    ).toBe("Anna Ivanova");
  });

  it("trims the display_name", () => {
    expect(displayNameOf({ email: "a@b.co", user_metadata: { display_name: "  Anna  " } })).toBe("Anna");
  });

  it.each([
    ["empty", ""],
    ["whitespace-only", "   \t\n"],
    ["missing", undefined],
    ["not a string", 42],
    ["null", null],
  ])("falls back to the email local part when display_name is %s", (_label, value) => {
    expect(
      displayNameOf({ email: "anna.ivanova@example.com", user_metadata: { display_name: value } }),
    ).toBe("anna.ivanova");
  });

  it("falls back to the email local part when there is no metadata at all", () => {
    expect(displayNameOf({ email: "anna@example.com" })).toBe("anna");
    expect(displayNameOf({ email: "anna@example.com", user_metadata: null })).toBe("anna");
    expect(displayNameOf({ email: "anna@example.com", user_metadata: {} })).toBe("anna");
  });

  it("splits at the FIRST @", () => {
    expect(displayNameOf({ email: "a@b@example.com" })).toBe("a");
  });

  it("returns an empty string only when the account has neither a name nor a usable email", () => {
    expect(displayNameOf(null)).toBe("");
    expect(displayNameOf(undefined)).toBe("");
    expect(displayNameOf({})).toBe("");
    expect(displayNameOf({ email: "@example.com" })).toBe("");
    expect(displayNameOf({ email: null, user_metadata: { display_name: " " } })).toBe("");
  });

  it("copes with a very long name", () => {
    const long = "Ж".repeat(10_000);
    expect(displayNameOf({ user_metadata: { display_name: long } })).toBe(long);
  });
});

describe("initialOf (AC-26, AC-27)", () => {
  it("is the first character, upper-cased", () => {
    expect(initialOf("anna")).toBe("A");
    expect(initialOf("Иван")).toBe("И");
    expect(initialOf("иван")).toBe("И");
  });

  it("ignores surrounding whitespace", () => {
    expect(initialOf("  anna")).toBe("A");
  });

  it("is empty for an empty or blank name", () => {
    expect(initialOf("")).toBe("");
    expect(initialOf("   ")).toBe("");
  });

  it("takes the first grapheme cluster: an emoji initial is allowed and stays whole", () => {
    expect(initialOf("😀 Anna")).toBe("😀");
    // Skin-tone modifier, ZWJ sequence and a flag are each ONE user-perceived character.
    expect(initialOf("👍🏽 Anna")).toBe("👍🏽");
    expect(initialOf("👩‍👩‍👧 family")).toBe("👩‍👩‍👧");
    expect(initialOf("🇵🇹 Lisboa")).toBe("🇵🇹");
  });

  it("keeps a combining sequence together", () => {
    expect(initialOf("éclair")).toBe("É");
  });

  it("stays one initial when upper-casing expands the letter", () => {
    expect(initialOf("ßeta")).toBe("S");
  });

  it("does not break on a very long name", () => {
    const start = Date.now();
    expect(initialOf("z".repeat(1_000_000))).toBe("Z");
    expect(Date.now() - start).toBeLessThan(500);
  });

  it("composes with displayNameOf for the email fallback", () => {
    expect(initialOf(displayNameOf({ email: "olga@example.com" }))).toBe("O");
  });
});
