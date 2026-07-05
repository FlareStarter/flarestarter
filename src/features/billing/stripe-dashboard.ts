/**
 * Build a Stripe Dashboard customer URL. Test-mode keys put customers under
 * `/test/`. `livemode` is derived by the caller from the secret key prefix
 * (sk_live_/rk_live_ → live; anything else, including restricted/unknown keys,
 * is treated as test as a safe default).
 */
export function stripeCustomerUrl(customerId: string, livemode: boolean): string {
  const base = 'https://dashboard.stripe.com'
  return livemode ? `${base}/customers/${customerId}` : `${base}/test/customers/${customerId}`
}
