import { describe, test, expect } from 'vitest'
import { stripeCustomerUrl } from './stripe-dashboard'

describe('stripeCustomerUrl', () => {
  test('live mode → no /test/ segment', () => {
    expect(stripeCustomerUrl('cus_123', true)).toBe('https://dashboard.stripe.com/customers/cus_123')
  })
  test('test mode → /test/ segment', () => {
    expect(stripeCustomerUrl('cus_123', false)).toBe('https://dashboard.stripe.com/test/customers/cus_123')
  })
})
