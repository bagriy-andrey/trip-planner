/**
 * Index of the cover colour of a trip in a palette of `paletteLength` colours (AC-38).
 *
 * Derived from the trip's IMMUTABLE id only — never from the place, title or UI language — so
 * renaming a trip or switching the language never recolours the card. 32-bit FNV-1a over the
 * UTF-16 code units of the id, reduced modulo the palette size: stable across runtimes and spreads
 * uuids over the whole palette.
 */
export function coverIndexOf(tripId: string, paletteLength: number): number {
  if (!Number.isInteger(paletteLength) || paletteLength < 1) {
    throw new RangeError(`paletteLength must be a positive integer, got ${paletteLength}`);
  }
  let hash = 0x811c9dc5;
  for (let i = 0; i < tripId.length; i += 1) {
    hash ^= tripId.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0) % paletteLength;
}
