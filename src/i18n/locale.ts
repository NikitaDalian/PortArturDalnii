import releases from './releases.json';
export type Locale = 'ru' | 'en' | 'zh';
export const locale: Locale = (import.meta.env.PUBLIC_SITE_LANG as Locale) || 'ru';
export const htmlLang = locale === 'zh' ? 'zh-Hans' : locale;
export const intlLocale = locale === 'zh' ? 'zh-CN' : locale;
export const siteBase = import.meta.env.BASE_URL.replace(/\/$/, '').replace(/\/(en|zh)$/, '');
export const assetUrl = (path: string) => siteBase + '/' + path.replace(/^\//, '');
export const languages = [
  { code: 'ru' as const, label: 'Русский', short: 'RU', hreflang: 'ru' },
  { code: 'en' as const, label: 'English', short: 'EN', hreflang: 'en' },
  { code: 'zh' as const, label: '中文', short: '中文', hreflang: 'zh-Hans' },
].filter(language => language.code === 'ru' || releases[language.code]);
export function languagePath(pathname: string, target: Locale): string {
  let suffix = pathname.startsWith(siteBase + '/') ? pathname.slice(siteBase.length) : pathname;
  suffix = suffix.replace(/^\/(en|zh)(?=\/|$)/, '') || '/';
  if (/^\/404\/?$/.test(suffix)) suffix = '/404.html';
  return siteBase + (target === 'ru' ? '' : '/' + target) + suffix;
}
