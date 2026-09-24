import { isCurrencyCode } from "../money/currencies";
import type { CurrencyCode } from "../money/currencies";

/** The stored home currency as a usable default, or `null` when empty or not one of `CURRENCIES`. */
export function homeCurrencyDefault(value: string | null): CurrencyCode | null {
  return value !== null && isCurrencyCode(value) ? value : null;
}
