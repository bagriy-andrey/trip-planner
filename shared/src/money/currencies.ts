/** ISO 4217 codes offered in the cost field. Order = suggestion order. */
export const CURRENCIES = [
  "EUR", "USD", "GBP", "PLN", "UAH", "CZK", "CHF", "SEK", "NOK", "DKK",
  "HUF", "RON", "BGN", "RSD", "ISK", "TRY", "GEL", "AMD", "AZN", "KZT",
  "ILS", "AED", "EGP", "MAD", "ZAR", "JPY", "CNY", "KRW", "HKD", "SGD",
  "THB", "VND", "IDR", "INR", "CAD", "AUD", "NZD", "MXN", "BRL", "ARS",
] as const;

export type CurrencyCode = (typeof CURRENCIES)[number];

const KNOWN: ReadonlySet<string> = new Set(CURRENCIES);

/** Exact, case-sensitive: callers upper-case first ("eur" is NOT a code). */
export function isCurrencyCode(value: unknown): value is CurrencyCode {
  return typeof value === "string" && KNOWN.has(value);
}

export const CURRENCY_SUGGESTION_LIMIT = 4;

/** Prefix match on the code, case-insensitive, in list order; blank query or limit < 1 gives []. */
export function searchCurrencies(query: string, limit: number = CURRENCY_SUGGESTION_LIMIT): CurrencyCode[] {
  const q = query.trim().toUpperCase();
  if (q === "" || !(limit >= 1)) return [];
  return CURRENCIES.filter((code) => code.startsWith(q)).slice(0, Math.floor(limit));
}
