import { codePointLength, singleLine } from "../forms/text";

export const CAR_PHONE_MAX_LENGTH = 32;

export type PhoneResult = { ok: true; phone: string | null } | { ok: false; error: "phone.invalid" };

const INVALID: PhoneResult = { ok: false, error: "phone.invalid" };
const SEPARATORS = /[ ()-]/g;
const COMPACT_PHONE = /^\+?[0-9]{3,15}$/;

/**
 * Office phone: kept as typed (trimmed, whitespace collapsed). Empty gives `phone: null`. Valid means
 * 3..15 digits with an optional leading plus once spaces, parentheses and hyphens are removed.
 */
export function parsePhone(input: unknown): PhoneResult {
  const text = singleLine(input);
  if (text === null) return { ok: true, phone: null };
  if (codePointLength(text) > CAR_PHONE_MAX_LENGTH) return INVALID;
  if (!COMPACT_PHONE.test(text.replace(SEPARATORS, ""))) return INVALID;
  return { ok: true, phone: text };
}

/** `tel:` link for a stored phone (re-validated, plus kept); anything invalid gives `null`. */
export function telHref(phone: unknown): string | null {
  const parsed = parsePhone(phone);
  if (!parsed.ok || parsed.phone === null) return null;
  return `tel:${parsed.phone.replace(SEPARATORS, "")}`;
}
