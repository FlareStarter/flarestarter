/**
 * Test helpers for billing workers integration tests.
 *
 * Provides:
 * - applyBillingSchema: creates user, subscription, processed_webhook_events
 *   tables in the test D1 (idempotent via IF NOT EXISTS).
 * - seedUserAndSubscription: inserts a user row + subscription row.
 */
import type { DB } from '@/db/client'
import { subscription } from './billing.schema'

// ---------------------------------------------------------------------------
// Schema bootstrap
// SQL matches drizzle/0001_complex_lady_vermin.sql (user) and
// drizzle/0002_yellow_warhawk.sql (subscription + processed_webhook_events).
// ---------------------------------------------------------------------------
export async function applyBillingSchema(d1: D1Database): Promise<void> {
  const stmts = [
    // user table (needed so subscription FK resolves)
    `CREATE TABLE IF NOT EXISTS "user" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "name" TEXT NOT NULL,
      "email" TEXT NOT NULL UNIQUE,
      "email_verified" INTEGER DEFAULT 0 NOT NULL,
      "image" TEXT,
      "created_at" INTEGER DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
      "updated_at" INTEGER DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
    )`,

    // subscription table
    `CREATE TABLE IF NOT EXISTS "subscription" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "user_id" TEXT NOT NULL UNIQUE,
      "provider" TEXT NOT NULL DEFAULT 'stripe',
      "customer_id" TEXT NOT NULL,
      "subscription_id" TEXT,
      "status" TEXT NOT NULL DEFAULT 'none',
      "plan" TEXT NOT NULL DEFAULT 'free',
      "price_id" TEXT,
      "current_period_end" INTEGER,
      "cancel_at_period_end" INTEGER NOT NULL DEFAULT 0,
      "lifetime" INTEGER NOT NULL DEFAULT 0,
      "lifetime_payment_intent_id" TEXT,
      "payment_failed_at" INTEGER,
      "last_event_at" INTEGER,
      "created_at" INTEGER NOT NULL,
      "updated_at" INTEGER NOT NULL,
      FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE
    )`,

    // processed_webhook_events table
    `CREATE TABLE IF NOT EXISTS "processed_webhook_events" (
      "event_id" TEXT PRIMARY KEY NOT NULL,
      "processed_at" INTEGER NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'done'
    )`,
  ]

  for (const sql of stmts) {
    await d1.prepare(sql).run()
  }
}

// ---------------------------------------------------------------------------
// seedUserAndSubscription
// ---------------------------------------------------------------------------
export interface SeedOptions {
  userId: string
  email?: string
  customerId: string
  status?: string
  plan?: string
  subscriptionId?: string
  priceId?: string
  lifetime?: boolean
  lifetimePaymentIntentId?: string
}

export async function seedUserAndSubscription(
  db: DB,
  opts: SeedOptions,
): Promise<{ userId: string; subscriptionRowId: string }> {
  const {
    userId,
    email = `${userId}@test.example`,
    customerId,
    status = 'none',
    plan = 'free',
    subscriptionId,
    priceId,
    lifetime = false,
    lifetimePaymentIntentId,
  } = opts

  const now = Date.now()
  const subscriptionRowId = crypto.randomUUID()

  // Insert user via the raw D1 client (db.$client is the D1Database instance)
  const d1 = (db as unknown as { $client: D1Database }).$client
  await d1
    .prepare(
      `INSERT OR IGNORE INTO "user" ("id","name","email","email_verified","created_at","updated_at")
       VALUES (?,?,?,0,?,?)`,
    )
    .bind(userId, userId, email, now, now)
    .run()

  await db.insert(subscription).values({
    id: subscriptionRowId,
    userId,
    provider: 'stripe',
    customerId,
    subscriptionId: subscriptionId ?? undefined,
    status,
    plan: plan as 'free' | 'pro',
    priceId: priceId ?? undefined,
    cancelAtPeriodEnd: false,
    lifetime,
    lifetimePaymentIntentId: lifetimePaymentIntentId ?? undefined,
    createdAt: new Date(now),
    updatedAt: new Date(now),
  })

  return { userId, subscriptionRowId }
}
