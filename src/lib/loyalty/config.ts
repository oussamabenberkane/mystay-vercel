/**
 * Loyalty earning rules — the SINGLE tunable place for the loyalty program.
 *
 * This is a plain (non-'use server') module so it can export config constants
 * and synchronous helpers. The server actions in `src/lib/actions/loyalty.ts`
 * import from here. A 'use server' file may only export async functions, so the
 * config/rule logic lives here.
 */

export const LOYALTY = {
  /** Points earned per 1 currency unit (DZD) of order total. */
  pointsPerCurrencyUnit: 1,
  /** Fixed bonus points awarded on check-in. */
  checkInBonus: 100,
} as const

/**
 * Convert a completed order's `total_amount` to earned loyalty points.
 * Floored to a non-negative integer (the award RPC requires a positive integer
 * to actually credit; 0 means "nothing to award").
 */
export function pointsForOrderAmount(total: number): number {
  if (!Number.isFinite(total) || total <= 0) return 0
  return Math.max(0, Math.floor(total * LOYALTY.pointsPerCurrencyUnit))
}
