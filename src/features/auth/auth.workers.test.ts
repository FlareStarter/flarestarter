/**
 * Auth integration tests — run on real Cloudflare D1 via workerd.
 *
 * 6 paths:
 *  1. register → unverified → cannot login
 *  2. verify email → login → session row exists
 *  3. requireUser / getSession with / without session
 *  4. password reset flow
 *  5. delete account cascades feedback
 *  6. session stable across multiple getSession calls
 */
import { test, expect, beforeAll } from 'vitest'
import { env } from 'cloudflare:test'
import { createDb } from '@/db/client'
import { feedback } from '@/features/feedback/feedback.schema'
import { scopeFromUser, ownedBy, withOwner } from '@/db/scope'
import { user as userTable, session as sessionTable } from '@/features/auth/auth.schema'
import { eq } from 'drizzle-orm'
import {
  applyAuthSchema,
  createTestAuth,
  extractToken,
  extractCookie,
} from './test-helpers'

// ---------------------------------------------------------------------------
// Setup: create all tables once before the suite
// ---------------------------------------------------------------------------
beforeAll(async () => {
  await applyAuthSchema(env.DB)
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal Headers object from a cookie string */
function cookieHeaders(cookie: string): Headers {
  return new Headers({ cookie })
}

/** Sign up a fresh user. Returns { auth, sentEmails, email, password }. */
async function registerUser(suffix: string) {
  const db = createDb(env.DB)
  const { auth, sentEmails } = createTestAuth(db)
  const email = `test-${suffix}@example.com`
  const password = 'Password123!'
  const signUpRes = await auth.api.signUpEmail({
    body: { email, password, name: `Test ${suffix}` },
    asResponse: true,
  })
  return { auth, sentEmails, email, password, signUpRes, db }
}

// ---------------------------------------------------------------------------
// Test 1: register → unverified → cannot login
// ---------------------------------------------------------------------------
test('1. register → unverified user row; email sign-in rejected', async () => {
  const db = createDb(env.DB)
  const { auth, email, password } = await registerUser('t1')

  // user row must exist with emailVerified = false
  const rows = await db.select().from(userTable).where(eq(userTable.email, email))
  expect(rows).toHaveLength(1)
  expect(rows[0].emailVerified).toBe(false)

  // sign-in attempt should throw / return error because email not verified
  let signInFailed = false
  try {
    const res = await auth.api.signInEmail({
      body: { email, password },
      asResponse: true,
    })
    // better-auth returns 403 when email not verified
    if (res.status >= 400) signInFailed = true
  } catch {
    signInFailed = true
  }
  expect(signInFailed).toBe(true)
})

// ---------------------------------------------------------------------------
// Test 2: verify email → login succeeds → session row in D1
// ---------------------------------------------------------------------------
test('2. verify email → sign-in succeeds → session row exists', async () => {
  const db = createDb(env.DB)
  const { auth, sentEmails, email, password } = await registerUser('t2')

  // A verification email should have been sent during sign-up
  const verificationEmail = sentEmails.find((e) => e.to === email)
  expect(verificationEmail).toBeDefined()
  const token = extractToken(verificationEmail!.url)

  // Call verifyEmail with the captured token (GET endpoint, pass token as query)
  const verifyRes = await auth.api.verifyEmail({
    query: { token },
    asResponse: true,
  })
  expect(verifyRes.status).toBeLessThan(400)

  // Now sign in — should succeed
  const signInRes = await auth.api.signInEmail({
    body: { email, password },
    asResponse: true,
  })
  expect(signInRes.status).toBe(200)

  // A session row must exist in D1 for this user
  const userRow = await db.select().from(userTable).where(eq(userTable.email, email))
  expect(userRow).toHaveLength(1)
  const userId = userRow[0].id

  const sessions = await db.select().from(sessionTable).where(eq(sessionTable.userId, userId))
  expect(sessions.length).toBeGreaterThan(0)
})

// ---------------------------------------------------------------------------
// Test 3: getSession with valid cookie returns user; without cookie returns null
// ---------------------------------------------------------------------------
test('3. getSession: valid cookie → user; no cookie → null', async () => {
  const { auth, sentEmails, email, password } = await registerUser('t3')

  // Verify email
  const verificationEmail = sentEmails.find((e) => e.to === email)!
  const token = extractToken(verificationEmail.url)
  await auth.api.verifyEmail({ query: { token }, asResponse: true })

  // Sign in and capture the session cookie
  const signInRes = await auth.api.signInEmail({
    body: { email, password },
    asResponse: true,
  })
  expect(signInRes.status).toBe(200)
  const cookie = extractCookie(signInRes)

  // With cookie: getSession should return a session with our user
  const sessionWithCookie = await auth.api.getSession({
    headers: cookieHeaders(cookie),
  })
  expect(sessionWithCookie).not.toBeNull()
  expect(sessionWithCookie?.user.email).toBe(email)

  // Without cookie: getSession should return null
  const sessionNoCookie = await auth.api.getSession({
    headers: new Headers(),
  })
  expect(sessionNoCookie).toBeNull()
})

// ---------------------------------------------------------------------------
// Test 4: password reset flow
// ---------------------------------------------------------------------------
test('4. password reset → sign in with new password', async () => {
  const { auth, sentEmails, email, password } = await registerUser('t4')

  // Verify email first
  const verificationEmail = sentEmails.find((e) => e.to === email)!
  await auth.api.verifyEmail({ query: { token: extractToken(verificationEmail.url) }, asResponse: true })

  // Request password reset — this sends a reset email
  const resetReqRes = await auth.api.requestPasswordReset({
    body: { email },
    asResponse: true,
  })
  expect(resetReqRes.status).toBeLessThan(400)

  // Find the reset email (it's the most recent one for this address)
  const resetEmail = [...sentEmails].reverse().find((e) => e.to === email)
  expect(resetEmail).toBeDefined()
  const resetToken = extractToken(resetEmail!.url)

  // Reset the password
  const newPassword = 'NewPassword456!'
  const resetRes = await auth.api.resetPassword({
    body: { newPassword, token: resetToken },
    asResponse: true,
  })
  expect(resetRes.status).toBeLessThan(400)

  // Old password should no longer work
  let oldFailed = false
  try {
    const res = await auth.api.signInEmail({ body: { email, password }, asResponse: true })
    if (res.status >= 400) oldFailed = true
  } catch {
    oldFailed = true
  }
  expect(oldFailed).toBe(true)

  // New password should work
  const newSignIn = await auth.api.signInEmail({
    body: { email, password: newPassword },
    asResponse: true,
  })
  expect(newSignIn.status).toBe(200)
})

// ---------------------------------------------------------------------------
// Test 5: delete account cascades feedback
// ---------------------------------------------------------------------------
test('5. delete user cascades feedback (FK)', async () => {
  const db = createDb(env.DB)
  const { auth, sentEmails, email, password } = await registerUser('t5')

  // Verify + sign in
  const verificationEmail = sentEmails.find((e) => e.to === email)!
  await auth.api.verifyEmail({ query: { token: extractToken(verificationEmail.url) }, asResponse: true })
  const signInRes = await auth.api.signInEmail({ body: { email, password }, asResponse: true })
  const cookie = extractCookie(signInRes)

  // Get the user id
  const userRow = await db.select().from(userTable).where(eq(userTable.email, email))
  const userId = userRow[0].id
  const scope = scopeFromUser(userId)

  // Insert a feedback item owned by this user
  await db.insert(feedback).values(
    withOwner(scope, {
      id: `feedback-t5-${userId}`,
      title: 'To be deleted',
      body: 'cascade test',
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
  )

  // Verify the feedback item is there
  const feedbackBefore = await db.select().from(feedback).where(ownedBy(feedback, scope))
  expect(feedbackBefore.length).toBeGreaterThan(0)

  // Delete the user (requires session cookie)
  const deleteRes = await auth.api.deleteUser({
    body: { password },
    headers: cookieHeaders(cookie),
    asResponse: true,
  })
  expect(deleteRes.status).toBeLessThan(400)

  // User row must be gone
  const userAfter = await db.select().from(userTable).where(eq(userTable.email, email))
  expect(userAfter).toHaveLength(0)

  // Feedback must be cascade-deleted (FK cascade)
  const feedbackAfter = await db.select().from(feedback).where(ownedBy(feedback, scope))
  expect(feedbackAfter).toHaveLength(0)
})

// ---------------------------------------------------------------------------
// Test 6: session stable across multiple getSession calls
// ---------------------------------------------------------------------------
test('6. session stable across multiple getSession calls', async () => {
  const { auth, sentEmails, email, password } = await registerUser('t6')

  // Verify + sign in
  const verificationEmail = sentEmails.find((e) => e.to === email)!
  await auth.api.verifyEmail({ query: { token: extractToken(verificationEmail.url) }, asResponse: true })
  const signInRes = await auth.api.signInEmail({ body: { email, password }, asResponse: true })
  const cookie = extractCookie(signInRes)

  // Call getSession three times with the same cookie
  const results = await Promise.all([
    auth.api.getSession({ headers: cookieHeaders(cookie) }),
    auth.api.getSession({ headers: cookieHeaders(cookie) }),
    auth.api.getSession({ headers: cookieHeaders(cookie) }),
  ])

  // All calls must return the same user
  for (const result of results) {
    expect(result).not.toBeNull()
    expect(result?.user.email).toBe(email)
    expect(result?.user.id).toBe(results[0]?.user.id)
  }
})
