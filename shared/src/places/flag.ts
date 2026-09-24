import { COUNTRY_CODE_PATTERN } from "./schema";

const REGIONAL_INDICATOR_A = 0x1f1e6;
const LATIN_A = 65;

/**
 * The flag emoji of an ISO alpha-2 country code (two regional-indicator symbols), or `null` for
 * anything that is not exactly two upper-case Latin letters. A value read from the DB is never
 * turned into a flag blindly. Built from code points: no emoji literal lives in the source.
 */
export function flagEmojiOf(countryCode: string): string | null {
  if (!COUNTRY_CODE_PATTERN.test(countryCode)) return null;
  return String.fromCodePoint(
    REGIONAL_INDICATOR_A + (countryCode.charCodeAt(0) - LATIN_A),
    REGIONAL_INDICATOR_A + (countryCode.charCodeAt(1) - LATIN_A),
  );
}
