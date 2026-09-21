import { describe, expect, it } from "vitest";
import {
  AUTH_FIELD_ERROR,
  displayNameSchema,
  emailSchema,
  newPasswordSchema,
  otpCodeSchema,
  parseAuthForm,
  passwordResetRequestSchema,
  passwordSchema,
  signInSchema,
  signUpSchema,
} from "../../index";

// Minimal typing for Vite's glob import (this package has no `vite/client` types: `types: []`).
declare global {
  interface ImportMeta {
    glob(
      pattern: string,
      options: { query: string; import: string; eager: true },
    ): Record<string, string>;
  }
}

function errorIdOf(result: { success: boolean; error?: { issues: { message: string }[] } }) {
  return result.success ? undefined : result.error?.issues[0]?.message;
}

describe("error ids contract", () => {
  it("pins the literal list of ids clients read (changing it is a breaking change)", () => {
    expect(Object.values(AUTH_FIELD_ERROR).sort()).toEqual(
      [
        "code.digits",
        "code.length",
        "email.invalid",
        "name.empty",
        "name.tooLong",
        "password.tooShort",
      ].sort(),
    );
  });
});

describe("emailSchema", () => {
  it("normalises (trim + lower case) before validating", () => {
    expect(emailSchema.parse(" Anna@Example.COM ")).toBe("anna@example.com");
  });

  it.each(["не email", "", "a@", "   ", "no-at-sign"])("rejects %j as email.invalid", (value) => {
    expect(errorIdOf(emailSchema.safeParse(value))).toBe("email.invalid");
  });

  it("rejects non-string input as email.invalid", () => {
    expect(errorIdOf(emailSchema.safeParse(undefined))).toBe("email.invalid");
    expect(errorIdOf(emailSchema.safeParse(42))).toBe("email.invalid");
  });
});

describe("passwordSchema", () => {
  it("rejects 7 characters with password.tooShort", () => {
    expect(errorIdOf(passwordSchema.safeParse("1234567"))).toBe("password.tooShort");
  });

  it("accepts 8 characters", () => {
    expect(passwordSchema.safeParse("12345678").success).toBe(true);
  });

  it("never trims: spaces around the password are significant", () => {
    const padded = "  12345678  ";
    expect(padded).toHaveLength(12);
    const result = passwordSchema.safeParse(padded);
    expect(result.success).toBe(true);
    expect(result.data).toBe(padded);
  });

  it("does not count padding spaces of a short password as trimmed characters", () => {
    // 7 chars of content + spaces is 8+ chars: valid, because nothing is trimmed.
    expect(passwordSchema.safeParse(" 1234567").success).toBe(true);
  });

  it("rejects missing password as password.tooShort", () => {
    expect(errorIdOf(passwordSchema.safeParse(undefined))).toBe("password.tooShort");
  });
});

describe("displayNameSchema", () => {
  it("rejects blank and whitespace-only names with name.empty", () => {
    expect(errorIdOf(displayNameSchema.safeParse("   "))).toBe("name.empty");
    expect(errorIdOf(displayNameSchema.safeParse(""))).toBe("name.empty");
  });

  it("trims the name", () => {
    expect(displayNameSchema.parse("  Anna  ")).toBe("Anna");
  });

  it("accepts 64 characters and rejects 65 with name.tooLong", () => {
    expect(displayNameSchema.safeParse("a".repeat(64)).success).toBe(true);
    expect(errorIdOf(displayNameSchema.safeParse("a".repeat(65)))).toBe("name.tooLong");
  });

  it("measures the limit after trimming", () => {
    expect(displayNameSchema.safeParse(` ${"a".repeat(64)} `).success).toBe(true);
  });

  it("accepts names with emoji, counting an emoji as one character", () => {
    expect(displayNameSchema.parse("Anna 🌍")).toBe("Anna 🌍");
    expect(displayNameSchema.safeParse("🌍".repeat(64)).success).toBe(true);
    expect(errorIdOf(displayNameSchema.safeParse("🌍".repeat(65)))).toBe("name.tooLong");
  });
});

describe("otpCodeSchema", () => {
  it.each(["12345", "1234567", ""])("rejects %j with code.length", (value) => {
    expect(errorIdOf(otpCodeSchema.safeParse(value))).toBe("code.length");
  });

  it("rejects a 6-character non-numeric code with code.digits", () => {
    expect(errorIdOf(otpCodeSchema.safeParse("12345a"))).toBe("code.digits");
    expect(errorIdOf(otpCodeSchema.safeParse("١٢٣٤٥٦"))).toBe("code.digits");
  });

  it("accepts exactly 6 digits", () => {
    expect(otpCodeSchema.safeParse("123456").success).toBe(true);
    expect(otpCodeSchema.safeParse("000000").success).toBe(true);
  });
});

describe("composite schemas normalise email in every form (AC-17)", () => {
  it("signIn", () => {
    const result = signInSchema.parse({ email: " Anna@Example.COM ", password: "12345678" });
    expect(result.email).toBe("anna@example.com");
  });

  it("signUp", () => {
    const result = signUpSchema.parse({
      name: " Anna ",
      email: " Anna@Example.COM ",
      password: " 12345678 ",
    });
    expect(result).toEqual({ name: "Anna", email: "anna@example.com", password: " 12345678 " });
  });

  it("passwordResetRequest", () => {
    expect(passwordResetRequestSchema.parse({ email: " Anna@Example.COM " })).toEqual({
      email: "anna@example.com",
    });
  });

  it("newPassword", () => {
    expect(newPasswordSchema.parse({ code: "123456", password: "12345678" })).toEqual({
      code: "123456",
      password: "12345678",
    });
  });
});

describe("parseAuthForm", () => {
  it("returns the normalised value on success", () => {
    const result = parseAuthForm(signUpSchema, {
      name: "  Anna ",
      email: "ANNA@example.com ",
      password: "12345678",
    });
    expect(result).toEqual({
      ok: true,
      value: { name: "Anna", email: "anna@example.com", password: "12345678" },
    });
  });

  it("returns the error ids of ALL invalid fields at once", () => {
    const result = parseAuthForm(signUpSchema, { name: "   ", email: "не email", password: "123" });
    expect(result).toEqual({
      ok: false,
      fieldErrors: {
        name: "name.empty",
        email: "email.invalid",
        password: "password.tooShort",
      },
    });
  });

  it("reports only the invalid fields", () => {
    const result = parseAuthForm(signInSchema, { email: "anna@example.com", password: "1234567" });
    expect(result).toEqual({ ok: false, fieldErrors: { password: "password.tooShort" } });
  });

  it("reports a single id per field (the first issue)", () => {
    const result = parseAuthForm(newPasswordSchema, { code: "12a", password: "12345678" });
    expect(result).toEqual({ ok: false, fieldErrors: { code: "code.length" } });
  });

  it("returns ids, never texts", () => {
    const result = parseAuthForm(newPasswordSchema, { code: "12345a", password: "1" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const known = new Set<string>(Object.values(AUTH_FIELD_ERROR));
      for (const id of Object.values(result.fieldErrors)) {
        expect(known.has(id ?? "")).toBe(true);
      }
    }
  });

  it.each([undefined, null, "text", 42, [], {}])("never throws on input %j", (input) => {
    expect(() => parseAuthForm(signUpSchema, input)).not.toThrow();
    const result = parseAuthForm(signUpSchema, input);
    expect(result).toEqual({
      ok: false,
      fieldErrors: {
        name: "name.empty",
        email: "email.invalid",
        password: "password.tooShort",
      },
    });
  });

  it("never throws on fields of the wrong type", () => {
    const result = parseAuthForm(signInSchema, { email: 1, password: { a: 1 } });
    expect(result).toEqual({
      ok: false,
      fieldErrors: { email: "email.invalid", password: "password.tooShort" },
    });
  });
});

describe("runtime neutrality of shared/src", () => {
  const sources = import.meta.glob("/src/**/*.ts", { query: "?raw", import: "default", eager: true });
  const files = Object.entries(sources).filter(([path]) => !path.includes("/__tests__/"));
  const specifierPattern =
    /(?:\bfrom\s*|\bimport\s*\(?\s*|\brequire\s*\(\s*)["']([^"']+)["']/g;

  it("scans the package sources", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it("imports only relative modules and zod (no react-native, supabase or node:*)", () => {
    const offenders: string[] = [];
    for (const [path, source] of files) {
      for (const match of source.matchAll(specifierPattern)) {
        const specifier = match[1] ?? "";
        const allowed = specifier.startsWith(".") || specifier === "zod";
        if (!allowed) {
          offenders.push(`${path}: ${specifier}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
