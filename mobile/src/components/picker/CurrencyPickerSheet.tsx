import { CURRENCY_NAMES, searchCurrencyOptions } from "@tripplanner/shared";
import type { CurrencyCode } from "@tripplanner/shared";

import { i18n, placeLanguageOf, resolveLocale } from "@/lib/i18n";

import { PickerSheet } from "./PickerSheet";
import type { PickerItem, PickerSheetProps } from "./types";

export interface CurrencyPickerSheetProps extends Omit<PickerSheetProps, "search" | "selectedKey" | "onSelect"> {
  /** Currently chosen code, or `null` for none. */
  selected: CurrencyCode | null;
  onSelect: (code: CurrencyCode | null) => void;
}

/** Currency picker: search by code or name (ru or en), no flag. Shared by the profile and the hotel form. */
export function CurrencyPickerSheet({ selected, onSelect, ...rest }: CurrencyPickerSheetProps) {
  const lang = placeLanguageOf(resolveLocale([i18n.language]));
  const search = (query: string): PickerItem[] =>
    searchCurrencyOptions(query, lang).map((code) => ({ key: code, name: CURRENCY_NAMES[code][lang], code }));
  // The picker only ever hands back keys produced by `search`, i.e. currency codes.
  return <PickerSheet {...rest} selectedKey={selected} search={search} onSelect={(key) => onSelect(key as CurrencyCode | null)} />;
}
