import { describe, test, expect } from 'vitest'
import { validateAmount, validateMessage, validateGithub } from './amounts'

describe('validateAmount', () => {
  test('accepts an in-range integer', () => {
    expect(validateAmount(2500)).toBe(2500)
  })
  test('accepts the min and max bounds', () => {
    expect(validateAmount(100)).toBe(100)
    expect(validateAmount(1_000_000)).toBe(1_000_000)
  })
  test('rejects below min', () => {
    expect(() => validateAmount(99)).toThrow()
  })
  test('rejects above max', () => {
    expect(() => validateAmount(1_000_001)).toThrow()
  })
  test('rejects non-integer / non-number', () => {
    expect(() => validateAmount(12.5)).toThrow()
    expect(() => validateAmount('100')).toThrow()
    expect(() => validateAmount(NaN)).toThrow()
  })
})

describe('validateMessage', () => {
  test('trims and returns a normal message', () => {
    expect(validateMessage('  love it  ')).toBe('love it')
  })
  test('empty / whitespace / non-string → null', () => {
    expect(validateMessage('')).toBeNull()
    expect(validateMessage('   ')).toBeNull()
    expect(validateMessage(undefined)).toBeNull()
    expect(validateMessage(42)).toBeNull()
  })
  test('truncates to 80 chars', () => {
    expect(validateMessage('a'.repeat(200))!.length).toBe(80)
  })
  test('strips control characters', () => {
    expect(validateMessage('hi\u0001\u0007there')).toBe('hithere')
  })
})

describe('validateGithub', () => {
  test('accepts a valid handle', () => {
    expect(validateGithub('octo-cat')).toBe('octo-cat')
    expect(validateGithub('a')).toBe('a')
  })
  test('trims and strips a leading @', () => {
    expect(validateGithub('  @octocat ')).toBe('octocat')
  })
  test('rejects empty / non-string → null', () => {
    expect(validateGithub('')).toBeNull()
    expect(validateGithub(undefined)).toBeNull()
    expect(validateGithub(123)).toBeNull()
  })
  test('rejects invalid handles → null', () => {
    expect(validateGithub('-bad')).toBeNull()
    expect(validateGithub('bad-')).toBeNull()
    expect(validateGithub('a--b')).toBeNull()
    expect(validateGithub('has space')).toBeNull()
    expect(validateGithub('a'.repeat(40))).toBeNull()
  })
})
