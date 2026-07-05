import { isNotNull, ne, desc, and, inArray, eq, sql } from 'drizzle-orm'
import type { DB } from '@/db/client'
import { sponsorship } from './sponsor.schema'
import type { SponsorEvent, SponsorRecord } from './webhook'

/** Persist a sponsorship. Idempotent: a duplicate session id is a no-op. */
export async function recordSponsorship(db: DB, rec: SponsorRecord, now: number, hidden = false): Promise<void> {
  await db
    .insert(sponsorship)
    .values({
      hidden,
      id: rec.id,
      email: rec.email,
      amount: rec.amount,
      currency: rec.currency,
      mode: rec.mode,
      stripeSessionId: rec.stripeSessionId,
      stripeSubscriptionId: rec.stripeSubscriptionId,
      stripePaymentIntentId: rec.stripePaymentIntentId,
      status: rec.status,
      github: rec.github,
      message: rec.message,
      createdAt: new Date(now),
    })
    .onConflictDoNothing({ target: sponsorship.stripeSessionId })
}

/** Apply a translated sponsor event to the DB. Unmatched refund/dispute PIs are no-ops
 *  (those events are emitted for every charge, not just sponsorships). */
export async function applySponsorEvent(db: DB, ev: SponsorEvent, now: number): Promise<void> {
  switch (ev.type) {
    case 'created':
      await recordSponsorship(db, ev.record, now)
      return
    case 'renewed': {
      // A renewal row inherits the newest sibling's hidden flag — otherwise every
      // billing cycle would silently undo the admin's take-down of this sponsor.
      const prev = ev.record.stripeSubscriptionId
        ? await db
            .select({ hidden: sponsorship.hidden })
            .from(sponsorship)
            .where(eq(sponsorship.stripeSubscriptionId, ev.record.stripeSubscriptionId))
            .orderBy(desc(sponsorship.createdAt))
            .limit(1)
        : []
      await recordSponsorship(db, ev.record, now, prev[0]?.hidden ?? false)
      return
    }
    case 'canceled':
      // Only end the active anchor row. Renewal rows ('completed') share the same
      // subscription id but are paid history — flipping them would erase the
      // sponsor's cumulative credit from the wall.
      await db
        .update(sponsorship)
        .set({ status: 'canceled' })
        .where(and(eq(sponsorship.stripeSubscriptionId, ev.subscriptionId), eq(sponsorship.status, 'active')))
      return
    case 'refunded':
      await db.update(sponsorship).set({ status: 'refunded' }).where(eq(sponsorship.stripePaymentIntentId, ev.paymentIntentId))
      return
    case 'disputed':
      await db.update(sponsorship).set({ status: 'disputed' }).where(eq(sponsorship.stripePaymentIntentId, ev.paymentIntentId))
      return
    default:
      // compile-time exhaustiveness: a new SponsorEvent variant must be handled here
      ev satisfies never
  }
}

export interface PublicSponsor { github: string; amount: number; message: string | null; mode: string }

/** GitHub-opted-in sponsors for the wall. Wall tier = CUMULATIVE total of a
 *  handle's money-kept rows (completed/active/canceled — canceled means the
 *  subscription ended, not that the payment was returned; only refunded/
 *  disputed/hidden are excluded); message = newest non-empty; `/mo` badge
 *  only while an active recurring row exists. */
export async function listPublicSponsors(db: DB): Promise<PublicSponsor[]> {
  const rows = await db
    .select({ github: sponsorship.github, amount: sponsorship.amount, message: sponsorship.message, mode: sponsorship.mode, status: sponsorship.status, createdAt: sponsorship.createdAt })
    .from(sponsorship)
    .where(and(
      isNotNull(sponsorship.github),
      ne(sponsorship.github, ''),
      inArray(sponsorship.status, ['completed', 'active', 'canceled']),
      eq(sponsorship.hidden, false),
    ))
    .orderBy(desc(sponsorship.createdAt))
  const byHandle = new Map<string, PublicSponsor>()
  for (const r of rows) {
    const g = r.github as string
    const cur = byHandle.get(g)
    if (!cur) {
      byHandle.set(g, { github: g, amount: r.amount, message: r.message || null, mode: r.status === 'active' && r.mode === 'recurring' ? 'recurring' : 'once' })
    } else {
      cur.amount += r.amount
      if (!cur.message && r.message) cur.message = r.message
      if (r.status === 'active' && r.mode === 'recurring') cur.mode = 'recurring'
    }
  }
  return [...byHandle.values()].sort((a, b) => b.amount - a.amount)
}

export interface AdminSponsorRow {
  id: string; email: string | null; github: string | null; amount: number; currency: string
  mode: string; status: string; message: string | null; hidden: boolean; createdAt: Date | string
}

/** Admin governance view: full sponsorship list (incl. hidden rows), paginated, newest first. */
export async function listSponsorships(db: DB, p: { page: number; pageSize: number }): Promise<{ rows: AdminSponsorRow[]; total: number }> {
  const rows = await db
    .select({ id: sponsorship.id, email: sponsorship.email, github: sponsorship.github, amount: sponsorship.amount, currency: sponsorship.currency, mode: sponsorship.mode, status: sponsorship.status, message: sponsorship.message, hidden: sponsorship.hidden, createdAt: sponsorship.createdAt })
    .from(sponsorship)
    .orderBy(desc(sponsorship.createdAt))
    .limit(p.pageSize)
    .offset(p.page * p.pageSize)
  const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(sponsorship)
  return { rows, total: Number(count) }
}

/** Admin toggle: hide/unhide a sponsorship row on the public wall. */
export async function setSponsorshipHidden(db: DB, id: string, hidden: boolean): Promise<void> {
  await db.update(sponsorship).set({ hidden }).where(eq(sponsorship.id, id))
}
