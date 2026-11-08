// @ts-check
import { defineConfig } from 'astro/config';

// Прототип живёт на GitHub Pages: https://nikitadalian.github.io/PortArturDalnii/
// При переезде на свой домен поменять site и убрать base.
export default defineConfig({
  site: 'https://nikitadalian.github.io',
  base: '/PortArturDalnii',
  trailingSlash: 'always',
  build: { format: 'directory' },
  i18n: {
    defaultLocale: 'ru',
    locales: ['ru', 'en', 'zh'],
    routing: { prefixDefaultLocale: false },
  },
  prefetch: { prefetchAll: true, defaultStrategy: 'hover' },
});
