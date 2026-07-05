import { test, expect } from 'vitest'
import { sponsorsToCsv } from './admin-csv'

test('sponsorsToCsv：表头 + 引号转义 + ISO 时间', () => {
  const csv = sponsorsToCsv([
    { id: 'x', email: 'a@b.c', github: 'g', amount: 2500, currency: 'usd', mode: 'once', status: 'completed', message: 'say "hi", ok', hidden: false, createdAt: new Date(0) },
  ])
  expect(csv.split('\n')[0]).toBe('email,github,amount_cents,currency,mode,status,message,hidden,created_at')
  expect(csv).toContain('"say ""hi"", ok"')
  expect(csv).toContain('1970-01-01T00:00:00.000Z')
})

test('sponsorsToCsv：留言里的公式前缀被中和（CSV 注入）', () => {
  const csv = sponsorsToCsv([
    { id: 'x', email: 'a@b.c', github: '@evil', amount: 1, currency: 'usd', mode: 'once', status: 'completed', message: '=HYPERLINK("http://evil","pwn")', hidden: false, createdAt: new Date(0) },
  ])
  expect(csv).toContain(`'=HYPERLINK`)
  expect(csv).toContain(`'@evil`)
})
