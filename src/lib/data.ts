// Единая точка доступа к данным и адресам сайта.
// ВСЕ ссылки внутри сайта строятся через функции этого файла (учёт base-пути GitHub Pages).
import articlesJson from '../data/articles.json';
import peopleJson from '../data/people.json';
import placesJson from '../data/places.json';
import booksJson from '../data/books.json';
import sourcesJson from '../data/sources.json';
import routesJson from '../data/routes.json';
import seasonsJson from '../data/seasons.json';
import seriesJson from '../data/series.json';
import photosJson from '../data/photos.json';
import termsJson from '../data/index_terms.json';

export type LayerKey = 'pre1898' | 'russian' | 'japanese' | 'soviet' | 'modern';
export type Article = (typeof articlesJson)[number];
export type Person = (typeof peopleJson)[number];
export type Place = (typeof placesJson)[number];
export type Book = (typeof booksJson)[number];
export type Source = (typeof sourcesJson)[number];
export type Route = (typeof routesJson)[number];
export type Series = (typeof seriesJson)[number];

export const articles = articlesJson as Article[];
export const people = peopleJson as Person[];
export const places = placesJson as Place[];
export const books = booksJson as Book[];
export const sources = sourcesJson as Source[];
export const routes = routesJson as Route[];
export const seasons = seasonsJson as Record<'spring' | 'summer' | 'autumn' | 'winter', any[]>;
export const series = seriesJson as Series[];
export const photos = photosJson as any[];
export const terms = termsJson as { people: Record<string, string>; geo: Record<string, string>; books_unmatched: Record<string, string> };

export const TG_CHANNEL = 'https://t.me/portartur_dalnii';
export const tgPost = (id: number | string) => `${TG_CHANNEL}/${id}`;

// ---------- адреса ----------
const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');
/** Внутренняя ссылка с учётом base. url('/lica/vitte/') → '/PortArturDalnii/lica/vitte/' */
export const url = (path = '/') => BASE + (path.startsWith('/') ? path : '/' + path);

export const LAYERS: { key: LayerKey; slug: string; years: string; title: string; short: string }[] = [
  { key: 'pre1898', slug: 'do-1898', years: 'до 1898', title: 'Бухта Талиенвань', short: 'До 1898' },
  { key: 'russian', slug: '1898-1905', years: '1898–1905', title: 'Русские Дальний и Порт-Артур', short: 'Русский период' },
  { key: 'japanese', slug: '1905-1945', years: '1905–1945', title: 'Японские Дайрен и Рёдзюн', short: 'Японский период' },
  { key: 'soviet', slug: '1945-1955', years: '1945–1955', title: 'Советский Порт-Артур', short: 'Советский период' },
  { key: 'modern', slug: 'segodnya', years: 'после 1955', title: 'Люйда, затем Далянь', short: 'Сегодня' },
];
// в places.json слой «до 1898» записан как 'chinese'
const LAYER_ALIASES: Record<string, LayerKey> = { chinese: 'pre1898' };
export const layerByKey = (k: string) => LAYERS.find((l) => l.key === (LAYER_ALIASES[k] ?? k));
/** Инициалы для плашки без портрета: «Анатолий Михайлович Стессель» → «АС». */
export const initials = (name: string) => {
  const w = name.replace(/\(.*?\)/g, '').trim().split(/\s+/).filter((x) => /^[A-ZА-ЯЁ]/.test(x));
  return w.length > 1 ? w[0][0] + w[w.length - 1][0] : (w[0]?.[0] ?? name[0]);
};

export const TYPES: Record<string, { label: string; color: string }> = {
  event: { label: 'События', color: 'var(--t-event)' },
  person: { label: 'Лица', color: 'var(--t-person)' },
  book: { label: 'Книги', color: 'var(--t-book)' },
  place: { label: 'Места', color: 'var(--t-place)' },
  source: { label: 'Источники', color: 'var(--t-source)' },
  explainer: { label: 'Пояснения', color: 'var(--t-explainer)' },
  culture: { label: 'Культура', color: 'var(--t-culture)' },
  memory: { label: 'Память', color: 'var(--t-memory)' },
};
export const COUNTRIES: Record<string, { label: string; color: string }> = {
  russia: { label: 'Россия', color: 'var(--c-russia)' },
  japan: { label: 'Япония', color: 'var(--c-japan)' },
  china: { label: 'Китай', color: 'var(--c-china)' },
  other: { label: 'Другие', color: 'var(--c-other)' },
};
export const GROUPS: Record<string, string> = {
  politics: 'Политики', military: 'Армия', navy: 'Флот', engineers: 'Инженеры',
  medicine: 'Врачи', writers: 'Писатели', culture: 'Культура', other: 'Другие',
};
export const BOOK_LEVELS: Record<string, { label: string; color: string }> = {
  start: { label: 'С чего начать', color: '#1F6F5C' },
  deep: { label: 'Для углубления', color: 'var(--navy)' },
  fiction: { label: 'Художественное', color: '#5B4BA8' },
  skip: { label: 'Можно пропустить', color: '#8A3B12' },
};

// Маршруты страниц (контракт для всех разделов)
export const href = {
  home: () => url('/'),
  layers: () => url('/istoriya/'),
  layer: (k: string) => url(`/istoriya/${layerByKey(k)?.slug ?? k}/`),
  people: () => url('/lica/'),
  person: (s: string) => url(`/lica/${s}/`),
  library: () => url('/biblioteka/'),
  book: (s: string) => url(`/biblioteka/knigi/${s}/`),
  source: (s: string) => url(`/biblioteka/istochniki/${s}/`),
  notes: () => url('/zametki/'),
  note: (s: string) => url(`/zametki/${s}/`),
  seriesList: () => url('/zametki/serii/'),
  series: (s: string) => url(`/zametki/serii/${s}/`),
  map: (place?: string) => url('/karta/' + (place ? `#${place}` : '')),
  place: (s: string) => url(`/mesta/${s}/`),
  routes: () => url('/marshruty/'),
  route: (s: string) => url(`/marshruty/${s}/`),
  seasons: () => url('/sezony/'),
  index: () => url('/ukazatel/'),
  search: (q?: string) => url('/poisk/' + (q ? `?q=${encodeURIComponent(q)}` : '')),
  about: () => url('/o-proekte/'),
};

// ---------- выборки ----------
const by = <T extends { slug: string }>(xs: T[]) => new Map(xs.map((x) => [x.slug, x]));
export const articleBySlug = by(articles);
export const personBySlug = by(people);
export const placeBySlug = by(places);
export const bookBySlug = by(books);
export const sourceBySlug = by(sources);
export const routeBySlug = by(routes);
export const seriesBySlug = by(series);

/** Ссылка на любую сущность: {href,label} или null, если своей страницы нет (тогда выводить просто текстом). */
export function entity(kind: 'person' | 'place' | 'book', slug: string): { href: string | null; label: string } {
  if (kind === 'person') {
    const p = personBySlug.get(slug);
    return p ? { href: href.person(slug), label: p.name } : { href: null, label: terms.people[slug] ?? slug };
  }
  if (kind === 'place') {
    const p = placeBySlug.get(slug);
    return p ? { href: href.place(slug), label: p.name } : { href: null, label: terms.geo[slug] ?? slug };
  }
  const b = bookBySlug.get(slug);
  if (b) return { href: href.book(slug), label: `${b.author} — «${b.title}»` };
  const s = sourceBySlug.get(slug);
  if (s) return { href: href.source(slug), label: s.title };
  return { href: null, label: terms.books_unmatched[slug] ?? slug };
}

export const articlesOf = (slugs: string[] = []) => slugs.map((s) => articleBySlug.get(s)).filter(Boolean) as Article[];

// ---------- изображения ----------
/** 'photos/photo_98@...jpg' | 98 → адрес WebP с водяным знаком. size 640 — превью. */
export function img(file: string | number | null | undefined, size: 'full' | 640 = 'full'): string | null {
  if (file === null || file === undefined) return null;
  const id = typeof file === 'number' ? file : (String(file).match(/photo_(\d+)@/)?.[1] ?? null);
  if (!id) return null;
  return url(`/img/p/${id}${size === 640 ? '-640' : ''}.webp`);
}
export const photoMeta = (file: string) => photos.find((p) => p.file === file);
export const authorImg = (name: string) => url(`/img/authors/${name}.webp`);

// ---------- форматирование ----------
const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
export const fmtDate = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
};
export const fmtDateShort = (iso: string) => {
  const [, m, d] = iso.split('-').map(Number);
  return `${d} ${MONTHS[m - 1]}`;
};
export const plural = (n: number, one: string, few: string, many: string) => {
  const m10 = n % 10, m100 = n % 100;
  return m10 === 1 && m100 !== 11 ? one : m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20) ? few : many;
};

// Пересчёт WGS-84 → GCJ-02 (для Amap в материковом Китае)
export function wgsToGcj(lat: number, lng: number): [number, number] {
  const a = 6378245.0, ee = 0.00669342162296594323;
  const tLat = (x: number, y: number) => -100 + 2 * x + 3 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x)) +
    ((20 * Math.sin(6 * x * Math.PI) + 20 * Math.sin(2 * x * Math.PI)) * 2) / 3 +
    ((20 * Math.sin(y * Math.PI) + 40 * Math.sin((y / 3) * Math.PI)) * 2) / 3 +
    ((160 * Math.sin((y / 12) * Math.PI) + 320 * Math.sin((y * Math.PI) / 30)) * 2) / 3;
  const tLng = (x: number, y: number) => 300 + x + 2 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x)) +
    ((20 * Math.sin(6 * x * Math.PI) + 20 * Math.sin(2 * x * Math.PI)) * 2) / 3 +
    ((20 * Math.sin(x * Math.PI) + 40 * Math.sin((x / 3) * Math.PI)) * 2) / 3 +
    ((150 * Math.sin((x / 12) * Math.PI) + 300 * Math.sin((x / 30) * Math.PI)) * 2) / 3;
  let dLat = tLat(lng - 105, lat - 35), dLng = tLng(lng - 105, lat - 35);
  const rad = (lat / 180) * Math.PI;
  let magic = Math.sin(rad); magic = 1 - ee * magic * magic;
  const sq = Math.sqrt(magic);
  dLat = (dLat * 180) / (((a * (1 - ee)) / (magic * sq)) * Math.PI);
  dLng = (dLng * 180) / ((a / sq) * Math.cos(rad) * Math.PI);
  return [lat + dLat, lng + dLng];
}
export const amapUrl = (lat: number, lng: number, name: string) => {
  const [glat, glng] = wgsToGcj(lat, lng);
  return `https://uri.amap.com/marker?position=${glng.toFixed(6)},${glat.toFixed(6)}&name=${encodeURIComponent(name)}&coordinate=gaode&callnative=1`;
};
export const yandexUrl = (lat: number, lng: number) =>
  `https://yandex.ru/maps/?pt=${lng},${lat}&z=16&l=map`;
