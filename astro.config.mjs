// @ts-check
import { defineConfig } from 'astro/config';
import i18nIntegration from './scripts/i18n-integration.mjs';
const language = process.env.PUBLIC_SITE_LANG || 'ru';
if (!['ru', 'en', 'zh'].includes(language)) throw new Error('Unsupported site language');

// Прототип живёт на GitHub Pages: https://nikitadalian.github.io/PortArturDalnii/
// При переезде на свой домен поменять site и убрать base.
export default defineConfig({
  site: 'https://nikitadalian.github.io',
  base: '/PortArturDalnii' + (language === 'ru' ? '' : '/' + language),
  cacheDir: './.astro/' + language,
  publicDir: language === 'ru' ? './public' : './.astro/empty-public',
  integrations: [i18nIntegration(language)],
  trailingSlash: 'always',
  build: { format: 'directory' },
  i18n: {
    defaultLocale: language,
    locales: ['ru', 'en', 'zh'],
    routing: { prefixDefaultLocale: false },
  },
  prefetch: { prefetchAll: true, defaultStrategy: 'hover' },
});
