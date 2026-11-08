// Небольшой запасной индекс для страницы поиска: используется, только если Pagefind
// недоступен (режим разработки или индекс не собран).
import { articles, people, places, books, sources, entity, href, img, imgCrop, fmtDateShort, TYPES } from '../../lib/data';

const CITY: Record<string, string> = { lushun: 'Люйшунь', dalian: 'Далянь', other: 'Другое' };

export interface FbItem { tab: string; url: string; title: string; text: string; meta: string; color?: string; image?: string | null; hay: string }

const hay = (...xs: (string | null | undefined)[]) => xs.filter(Boolean).join(' ').toLowerCase().replace(/ё/g, 'е');

export function fallbackItems(): FbItem[] {
  const out: FbItem[] = [];
  articles.forEach((a) => {
    const t = TYPES[a.type] ?? TYPES.event;
    const names = [...a.people.map((s) => entity('person', s).label), ...a.places.map((s) => entity('place', s).label)];
    out.push({
      tab: 'Заметки', url: href.note(a.slug), title: a.title, text: a.dek || a.summary.slice(0, 180),
      meta: `${t.label} · ${fmtDateShort(a.date)} · ${a.read_min} мин`, color: t.color, image: imgCrop(a.cover, '3x2', 640),
      hay: hay(a.title, a.dek, a.summary, a.facts.join(' '), names.join(' ')),
    });
  });
  people.forEach((p) => out.push({
    tab: 'Лица', url: href.person(p.slug), title: p.name, text: p.role ?? '', meta: `Лица${p.years ? ' · ' + p.years : ''}`,
    color: 'var(--t-person)', image: imgCrop(p.portrait, '4x5', 640), hay: hay(p.name, p.short, p.role, p.bio),
  }));
  places.forEach((p) => out.push({
    tab: 'Места', url: href.place(p.slug), title: p.name, text: (p.summary ?? '').slice(0, 180), meta: `Места${p.city ? ' · ' + (CITY[p.city] ?? p.city) : ''}`,
    color: 'var(--t-place)', image: imgCrop((p.photos as any[])?.[0], '3x2', 640), hay: hay(p.name, p.name_now, p.name_zh, p.summary),
  }));
  books.forEach((b) => out.push({
    tab: 'Книги', url: href.book(b.slug), title: `${b.author} — «${b.title}»`, text: b.verdict ?? '', meta: `Книги · ${b.author}${b.year ? ', ' + b.year : ''}`,
    color: 'var(--t-book)', image: null, hay: hay(b.author, b.title, b.verdict, b.annotation),
  }));
  sources.forEach((s) => out.push({
    tab: 'Книги', url: href.source(s.slug), title: s.title, text: (s.annotation ?? '').slice(0, 180), meta: `Источники${(s as any).author ? ' · ' + (s as any).author : ''}`,
    color: 'var(--t-source)', image: null, hay: hay(s.title, (s as any).author, s.annotation),
  }));
  return out;
}
