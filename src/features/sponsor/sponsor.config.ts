export interface SponsorTier {
  amountCents: number
  nameKey: string
  popular?: boolean
}

/** Single customization panel. Forkers edit THIS file (+ i18n sponsor.* copy)
 *  to retune amounts, thresholds, and which parts show. */
export const sponsorConfig = {
  currency: 'usd' as const,
  minCents: 100, // $1
  maxCents: 1_000_000, // $10,000
  messageMaxLen: 80,
  modes: { once: true, monthly: true }, // enable/disable each period
  fields: { github: true, message: true }, // enable/disable optional fields
  wall: { enabled: true, goldCents: 10000, backersCents: 2500 }, // Gold ≥ gold; Backers ≥ backers; Supporters below
  tiers: {
    monthly: [
      { amountCents: 500, nameKey: 'supporter' },
      { amountCents: 2500, nameKey: 'backer', popular: true },
      { amountCents: 10000, nameKey: 'sponsor' },
    ],
    once: [
      { amountCents: 1500, nameKey: 'coffee' },
      { amountCents: 7500, nameKey: 'believer', popular: true },
      { amountCents: 30000, nameKey: 'patron' },
    ],
  } satisfies { monthly: SponsorTier[]; once: SponsorTier[] },
}
