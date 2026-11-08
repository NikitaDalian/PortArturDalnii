// Проверка собранного сайта (dist) без зависимостей:
//  1) внутренние ссылки href="/PortArturDalnii/..." ведут на существующие файлы;
//  2) якоря #id есть на целевой странице (для /karta/#slug — есть такое место);
//  3) ссылки href="#id" на той же странице ведут на существующий id;
//  4) на странице нет повторяющихся имён переходов (transition:name / view-transition-name);
//  5) доступность: ровно один <h1>, у каждой <img> есть атрибут alt.
// Запуск: npm run check  (после npm run build)
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = '/PortArturDalnii/';
const root = fileURLToPath(new URL('../dist/', import.meta.url));
if (!existsSync(root)) {
  console.error('Нет папки dist — сначала выполните npm run build');
  process.exit(2);
}

/** все html-файлы dist */
function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) { if (name !== 'pagefind') walk(p, out); }
    else if (name.endsWith('.html')) out.push(p);
  }
  return out;
}

const files = walk(root);
if (!files.length) { console.error('В dist нет html-страниц — сборка не удалась?'); process.exit(2); }
const pageUrl = (file) => {
  const rel = relative(root, file).split(sep).join('/');
  return BASE + rel.replace(/(^|\/)index\.html$/, '$1');
};

// Убираем содержимое <script> и <style>: ссылки в них — не разметка
const stripCode = (html) => html.replace(/<script\b[\s\S]*?<\/script>/gi, '').replace(/<style\b[\s\S]*?<\/style>/gi, '');
const decode = (s) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");

const cache = new Map(); // file -> { html, ids:Set }
function load(file) {
  if (cache.has(file)) return cache.get(file);
  const raw = readFileSync(file, 'utf8');
  const body = stripCode(raw);
  const ids = new Set();
  for (const m of body.matchAll(/\s(?:id|name)="([^"]+)"/g)) ids.add(decode(m[1]));
  const entry = { raw, body, ids };
  cache.set(file, entry);
  return entry;
}

/** путь сайта → файл в dist или null */
function resolve(path) {
  let p = decodeURIComponent(path.slice(BASE.length));
  const cands = [];
  if (p === '' || p.endsWith('/')) cands.push(join(root, p, 'index.html'));
  else if (/\.[a-z0-9]+$/i.test(p)) cands.push(join(root, p));
  else cands.push(join(root, p, 'index.html'), join(root, p + '.html'));
  return cands.find((c) => existsSync(c) && statSync(c).isFile()) ?? null;
}

const placeExists = (slug) => existsSync(join(root, 'mesta', slug, 'index.html'));

const broken = [];
const dupes = [];
const a11y = [];
let checked = 0;

for (const file of files) {
  const here = pageUrl(file);
  const { raw, body, ids } = load(file);

  for (const m of body.matchAll(/\shref="([^"]*)"/g)) {
    const href = decode(m[1]);
    if (href.startsWith('#')) {
      const id = decodeURIComponent(href.slice(1));
      checked++;
      if (id && !ids.has(id)) broken.push({ page: here, href, why: 'нет id на этой странице' });
      continue;
    }
    if (!href.startsWith(BASE)) continue;
    checked++;
    const [pathQ, hash = ''] = href.split('#');
    const path = pathQ.split('?')[0];
    const target = resolve(path);
    if (!target) { broken.push({ page: here, href, why: 'нет страницы' }); continue; }
    if (!hash) continue;
    const id = decodeURIComponent(hash);
    if (path === BASE + 'karta/') {
      if (!placeExists(id)) broken.push({ page: here, href, why: 'на карте нет такого места' });
      continue;
    }
    if (!load(target).ids.has(id)) broken.push({ page: here, href, why: `нет id «${id}» на целевой странице` });
  }

  // доступность
  const h1 = (body.match(/<h1[\s>]/g) || []).length;
  if (h1 !== 1) a11y.push({ page: here, why: `заголовков h1: ${h1}` });
  for (const m of body.matchAll(/<img\s[^>]*>/g)) if (!/\salt(=|\s|\/?>)/.test(m[0])) a11y.push({ page: here, why: `img без alt: ${m[0].slice(0, 90)}` });

  // повторяющиеся имена переходов
  const scopes = [...raw.matchAll(/\sdata-astro-transition-scope="([^"]+)"/g)].map((m) => m[1]);
  const scopeCount = new Map();
  scopes.forEach((s) => scopeCount.set(s, (scopeCount.get(s) ?? 0) + 1));
  for (const [s, n] of scopeCount) if (n > 1) dupes.push({ page: here, name: s, n });
  const nameOf = new Map();
  for (const m of raw.matchAll(/\[data-astro-transition-scope="([^"]+)"\]\s*\{\s*view-transition-name:\s*([^;}\s]+)/g)) nameOf.set(m[1], m[2]);
  const names = [...new Set(scopes)].map((s) => nameOf.get(s)).filter(Boolean);
  for (const m of raw.matchAll(/style="[^"]*view-transition-name:\s*([^;"\s]+)/g)) names.push(m[1]);
  const nameCount = new Map();
  names.forEach((n) => nameCount.set(n, (nameCount.get(n) ?? 0) + 1));
  for (const [name, n] of nameCount) if (n > 1) dupes.push({ page: here, name, n });
}

console.log(`Страниц: ${files.length}, проверено ссылок: ${checked}`);
if (broken.length) {
  console.log(`\nБитые ссылки: ${broken.length}`);
  const byPage = new Map();
  for (const b of broken) byPage.set(b.page, [...(byPage.get(b.page) ?? []), b]);
  for (const [page, xs] of byPage) {
    console.log(`  ${page}`);
    for (const b of xs) console.log(`    ${b.href}  — ${b.why}`);
  }
}
if (dupes.length) {
  console.log(`\nПовторяющиеся имена переходов: ${dupes.length}`);
  for (const d of dupes) console.log(`  ${d.page}: ${d.name} ×${d.n}`);
}
if (a11y.length) {
  console.log(`
Доступность: ${a11y.length}`);
  for (const d of a11y) console.log(`  ${d.page}: ${d.why}`);
}
if (!broken.length && !dupes.length && !a11y.length) console.log('Ошибок нет.');
process.exit(broken.length || dupes.length || a11y.length ? 1 : 0);
