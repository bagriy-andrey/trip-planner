/**
 * True when `id` is accepted by `Intl.DateTimeFormat` as an IANA time zone identifier.
 * `Intl` is ECMAScript (present in Hermes, browsers, Deno and Node) and is used here ONLY to
 * validate — never to format. Never throws.
 */
export function isValidTimeZone(id: unknown): id is string {
  if (typeof id !== "string" || id.length === 0) return false;
  try {
    new Intl.DateTimeFormat("en", { timeZone: id });
    return true;
  } catch {
    return false;
  }
}
