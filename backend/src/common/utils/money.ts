/**
 * Rounds a monetary value to 2 decimal places using round-half-away-from-zero,
 * correcting for binary floating-point representation error (e.g. 1.005 * 100
 * evaluating to 100.49999999999999 in IEEE 754) before rounding.
 *
 * Every computed (not user-entered) money value - line totals, tax, discount
 * apportionment, subtotals - must pass through this before being summed or
 * persisted, otherwise cent-level drift can accumulate across line items.
 */
export function roundMoney(value: number): number {
  if (!Number.isFinite(value)) return 0;
  const sign = value < 0 ? -1 : 1;
  return (sign * Math.round((Math.abs(value) + Number.EPSILON) * 100)) / 100;
}
