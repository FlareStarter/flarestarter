import { createAuthClient } from 'better-auth/react'
import { adminClient } from 'better-auth/client/plugins'

export const authClient = createAuthClient({
  baseURL: typeof window !== 'undefined' ? window.location.origin : undefined,
  plugins: [adminClient()],
})

// NOTE: The template named this `forgetPassword`, but better-auth@1.6.x exposes
// the route as `/request-password-reset`, which path-to-object maps to
// `requestPasswordReset` (not `forgetPassword`).
//
// `signIn` and `signUp` are nested objects, not flat functions:
//   authClient.signIn.email(...)
//   authClient.signIn.social(...)
//   authClient.signUp.email(...)
export const {
  signIn,       // nested: signIn.email(...) | signIn.social(...)
  signUp,       // nested: signUp.email(...)
  signOut,
  requestPasswordReset,   // formerly called forgetPassword in the task template
  resetPassword,
  changePassword,
  deleteUser,
  useSession,
  sendVerificationEmail,
} = authClient
