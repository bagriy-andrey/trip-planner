import { foldForSearch } from "../places/fold";
import type { PlaceLanguage } from "../places/schema";
import { CURRENCIES } from "./currencies";
import type { CurrencyCode } from "./currencies";
import { CURRENCY_NAMES } from "./currencyNames";

/**
 * Picker search for currencies, NO limit. Blank query: all of `CURRENCIES` in list order. Otherwise
 * an exact code hit first, then every currency whose ru OR en name starts with the folded query
 * (list order). `lang` is accepted for symmetry with the other pickers: both names always match.
 */
export function searchCurrencyOptions(query: string, lang: PlaceLanguage): CurrencyCode[] {
  void lang;
  const q = foldForSearch(query).trim().replace(/\s+/g, " ");
  if (q === "") return [...CURRENCIES];
  const exact = query.trim().toUpperCase();
  const hits = CURRENCIES.filter((code) => {
    if (code === exact) return false;
    const names = CURRENCY_NAMES[code];
    return foldForSearch(names.ru).startsWith(q) || foldForSearch(names.en).startsWith(q);
  });
  return (CURRENCIES as readonly string[]).includes(exact) ? [exact as CurrencyCode, ...hits] : hits;
}
