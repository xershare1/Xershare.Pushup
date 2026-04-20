/** Fired so credit UIs (e.g. app shell sidebar) refetch `/billing/balance` after Stripe success. */
export const CREDIT_BALANCE_REFRESH_EVENT = 'pushup:credit-balance-refresh'

export function requestCreditBalanceRefresh(): void {
  window.dispatchEvent(new CustomEvent(CREDIT_BALANCE_REFRESH_EVENT))
}
