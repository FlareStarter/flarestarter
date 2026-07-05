import { dictionaries, type Locale } from '@/features/i18n/locale'

/** auth 工具页共用 head：per-page title（不再回落全站默认标题）+ noindex
 *  （/login 与 /zh/login 互为无标注的重复内容，工具页无搜索价值，直接不进索引）。 */
export function authPageHead(
  params: unknown,
  key: 'loginTitle' | 'registerTitle' | 'forgotTitle' | 'resetTitle' | 'verifyTitle',
) {
  const locale: Locale = (params as { locale?: string })?.locale === 'zh' ? 'zh' : 'en'
  return {
    meta: [
      { title: `${dictionaries[locale].auth[key]} — FlareStarter` },
      { name: 'robots', content: 'noindex' },
    ],
  }
}
