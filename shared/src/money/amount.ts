/** `numeric(12,2)`: at most 10 integer digits. */
export const MONEY_MAX_INTEGER_DIGITS = 10;

export type MoneyAmountResult = { ok: true; amount: string } | { ok: false };

const AMOUNT = /^(\d+)(?:[.,](\d{1,2}))?$/;

/**
 * Parses a user-typed amount into a canonical string ("1234.50"). Money stays a STRING in the
 * domain: no floats, no arithmetic in this phase. No sign, inner spaces or exponent.
 */
export function parseMoneyAmount(input: string): MoneyAmountResult {
  const match = AMOUNT.exec(input.trim());
  if (match === null) return { ok: false };
  const integerRaw = match[1] ?? "";
  const fraction = (match[2] ?? "").padEnd(2, "0");
  const integer = integerRaw.replace(/^0+(?=\d)/, "");
  if (integer.length > MONEY_MAX_INTEGER_DIGITS) return { ok: false };
  return { ok: true, amount: `${integer}.${fraction}` };
}
