/**
 * Search folding: lower case + Latin diacritics removed ("Zürich" -> "zurich").
 *
 * Deliberately NOT `normalize("NFD")` + `\p{Diacritic}`: whether Hermes ships a working
 * `String.prototype.normalize` / Unicode property escapes was never verified (plan R-4), so the fold
 * is an explicit table — fully deterministic on every runtime. The table covers Latin-1 Supplement
 * and Latin Extended-A (+ ơ ư ș ț); `__tests__/fold.test.ts` checks it against NFD in Node.
 *
 * No transliteration between alphabets (Q6): "Porto" never matches "Порту". Cyrillic "ё" folds to
 * "е" and "й" to "и" (what NFD would do for "й"; "ё" is the usual keyboard shortcut). Typographic
 * apostrophes fold to the ASCII one.
 */
const FOLD_GROUPS: readonly (readonly [target: string, sources: string])[] = [
  ["ss", "ß"],
  ["a", "àáâãäåāăą"],
  ["ae", "æ"],
  ["c", "çćĉċč"],
  ["e", "èéêëēĕėęě"],
  ["i", "ìíîïĩīĭįı"],
  ["d", "ðďđ"],
  ["n", "ñńņňŉŋ"],
  ["o", "òóôõöøōŏőơ"],
  ["u", "ùúûüũūŭůűųư"],
  ["y", "ýÿŷ"],
  ["th", "þ"],
  ["g", "ĝğġģ"],
  ["h", "ĥħ"],
  ["ij", "ĳ"],
  ["j", "ĵ"],
  ["k", "ķĸ"],
  ["l", "ĺļľŀł"],
  ["oe", "œ"],
  ["r", "ŕŗř"],
  ["s", "śŝşšſș"],
  ["t", "ţťŧț"],
  ["w", "ŵ"],
  ["z", "źżž"],
  ["е", "ё"],
  ["и", "й"],
  ["'", "’ʼ‘"],
];

const FOLD_MAP: ReadonlyMap<string, string> = new Map(
  FOLD_GROUPS.flatMap(([target, sources]) => Array.from(sources, (ch) => [ch, target] as const)),
);

function isCombiningMark(codePoint: number): boolean {
  // Combining Diacritical Marks block: what NFD leaves behind after a base letter.
  return codePoint >= 0x0300 && codePoint <= 0x036f;
}

/** Lower-cases and strips diacritics. Pure and total: never throws, always returns a string. */
export function foldForSearch(value: string): string {
  let out = "";
  for (const ch of value.toLowerCase()) {
    const codePoint = ch.codePointAt(0);
    if (codePoint !== undefined && isCombiningMark(codePoint)) continue;
    out += FOLD_MAP.get(ch) ?? ch;
  }
  return out;
}
