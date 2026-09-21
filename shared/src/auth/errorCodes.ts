/**
 * Stable identifiers of auth form field errors.
 *
 * These are identifiers, NOT user-facing texts: clients map them to their own localized strings.
 * The list is a contract (clients read it) — renaming or removing a value is a breaking change and
 * must update every consumer in the same plan. The literal list is pinned in
 * `__tests__/schemas.test.ts`.
 */
export const AUTH_FIELD_ERROR = {
  emailInvalid: "email.invalid",
  passwordTooShort: "password.tooShort",
  nameEmpty: "name.empty",
  nameTooLong: "name.tooLong",
  codeLength: "code.length",
  codeDigits: "code.digits",
} as const;

export type AuthFieldErrorId = (typeof AUTH_FIELD_ERROR)[keyof typeof AUTH_FIELD_ERROR];

const KNOWN_IDS: ReadonlySet<string> = new Set(Object.values(AUTH_FIELD_ERROR));

export function isAuthFieldErrorId(value: unknown): value is AuthFieldErrorId {
  return typeof value === "string" && KNOWN_IDS.has(value);
}
