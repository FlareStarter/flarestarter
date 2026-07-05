import { test, expect } from 'vitest'
import { mapAuthError } from '@/features/auth/errors'

test('已知错误码映射到 i18n key', () => {
  expect(mapAuthError({ code: 'INVALID_EMAIL_OR_PASSWORD' })).toBe('auth.errors.invalidCredentials')
  expect(mapAuthError({ code: 'USER_ALREADY_EXISTS' })).toBe('auth.errors.emailExists')
  expect(mapAuthError({ code: 'EMAIL_NOT_VERIFIED' })).toBe('auth.errors.emailNotVerified')
})

test('未知错误回退到 unknown', () => {
  expect(mapAuthError({ code: 'WHATEVER' })).toBe('auth.errors.unknown')
  expect(mapAuthError(undefined)).toBe('auth.errors.unknown')
  expect(mapAuthError(null)).toBe('auth.errors.unknown')
})
