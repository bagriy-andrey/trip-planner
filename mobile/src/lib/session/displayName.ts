// Pure display helpers: ONE source for the account name shown on the profile and the avatar
// initial shown in the S4/S5 headers (AC-26, AC-27). No React, no backend types — the input is
// the structural subset of the session user these functions actually read.

export interface DisplayNameSource {
  email?: string | null;
  user_metadata?: { display_name?: unknown } | null;
}

/**
 * The account's name: `display_name` from the sign-up metadata when it is a non-blank string,
 * otherwise the part of the email before the `@` (AC-26). Empty string only when the account
 * has neither. Never throws on malformed metadata (it is server-controlled, untrusted input).
 */
export function displayNameOf(user: DisplayNameSource | null | undefined): string {
  const metadataName = user?.user_metadata?.display_name;
  if (typeof metadataName === "string") {
    const trimmed = metadataName.trim();
    if (trimmed !== "") return trimmed;
  }
  const email = user?.email;
  if (typeof email === "string") {
    const localPart = email.split("@")[0]?.trim() ?? "";
    if (localPart !== "") return localPart;
  }
  return "";
}

// One user-perceived character. `Intl.Segmenter` keeps an emoji with a skin tone or a ZWJ
// family together; runtimes without it fall back to the first code point (still never half a
// surrogate pair).
function firstGrapheme(text: string): string {
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    const first = new Intl.Segmenter(undefined, { granularity: "grapheme" })
      .segment(text)[Symbol.iterator]()
      .next();
    if (first.done !== true) return first.value.segment;
  }
  return Array.from(text)[0] ?? "";
}

/** The avatar initial: the first grapheme of the name, upper-cased; "" for an empty name. */
export function initialOf(name: string): string {
  const trimmed = name.trim();
  if (trimmed === "") return "";
  // Only the head is segmented: a very long name must stay O(1).
  // Re-segmented after upper-casing because a few letters expand (ß -> SS): still one initial.
  return firstGrapheme(firstGrapheme(trimmed.slice(0, 32)).toLocaleUpperCase());
}
