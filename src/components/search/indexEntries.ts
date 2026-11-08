// Записи указателя А–Я: люди, места, книги и источники, серии.
import {
  articles, people, places, books, sources, series, terms, href, type Article,
} from '../../lib/data';
import { invertName, byDate } from '../notes/lib';

export type Group = 'people' | 'places' | 'books' | 'series';
export interface Entry {
  group: Group;
  label: string;        // как печатается в указателе
  sub?: string;         // уточнение мелким шрифтом
  key: string;          // ключ сортировки
  letter: string;
  href: string;         // страница сущности или поиск
  own: boolean;         // есть ли своя страница
  notes: { slug: string; title: string }[];
}

export const GROUP_LABELS: Record<Group, string> = {
  people: 'Люди', places: 'Места', books: 'Книги и источники', series: 'Серии',
};

const clean = (s: string) =>
  s.toLowerCase().replace(/ё/g, 'е').replace(/^[«"„(\s]+/, '').replace(/[«»"„“().,:—–-]/g, ' ').replace(/\s+/g, ' ').trim();
const firstLetter = (key: string) => {
  const c = key.charAt(0).toUpperCase();
  if (/[А-ЯЁ]/.test(c)) return c === 'Ё' ? 'Е' : c;
  if (/[A-Z]/.test(c)) return 'A–Z';
  return '#';
};
const order = new Map(byDate.map((a, i) => [a.slug, i]));
const notesOf = (pred: (a: Article) => boolean) =>
  articles.filter(pred).sort((a, b) => order.get(a.slug)! - order.get(b.slug)!).map((a) => ({ slug: a.slug, title: a.title }));
const stripInitials = (s: string) => s.replace(/^([А-ЯЁA-Z]\.\s*)+/, '');

function make(group: Group, label: string, sortBase: string, link: string | null, notes: Entry['notes'], sub?: string): Entry {
  const key = clean(sortBase);
  return { group, label, sub, key, letter: firstLetter(key), href: link ?? href.search(label.replace(/[«»]/g, '')), own: !!link, notes };
}

export function buildIndex(): Entry[] {
  const out: Entry[] = [];

  // люди
  people.forEach((p) => {
    const inv = invertName(p.name);
    out.push(make('people', inv, inv, href.person(p.slug), notesOf((a) => a.people.includes(p.slug)), p.years ?? undefined));
  });
  Object.entries(terms.people).forEach(([slug, name]) => {
    const inv = invertName(name);
    const e = make('people', inv, inv, null, notesOf((a) => a.people.includes(slug)));
    e.href = href.search(name.replace(/\s*\(.*\)$/, ''));
    out.push(e);
  });

  // места
  places.forEach((p) => {
    const sub = [p.name_now, p.name_zh].filter(Boolean).join(', ') || undefined;
    out.push(make('places', p.name, p.name, href.place(p.slug), notesOf((a) => a.places.includes(p.slug)), sub));
  });
  Object.entries(terms.geo).forEach(([slug, name]) => {
    const e = make('places', name, name, null, notesOf((a) => a.places.includes(slug)));
    e.href = href.search(name.replace(/\s*\(.*\)$/, ''));
    out.push(e);
  });

  // книги и источники
  books.forEach((b) => {
    const title = `«${b.title}»`;
    out.push(make('books', title, b.title, href.book(b.slug), notesOf((a) => a.books.includes(b.slug)), `${b.author}${b.year ? ', ' + b.year : ''}`));
  });
  sources.forEach((s) => {
    out.push(make('books', s.title, stripInitials(s.title), href.source(s.slug), notesOf((a) => a.books.includes(s.slug)), (s as any).author || undefined));
  });
  Object.entries(terms.books_unmatched).forEach(([slug, title]) => {
    const e = make('books', title, stripInitials(title), null, notesOf((a) => a.books.includes(slug)));
    const q = title.match(/«([^»]+)»/)?.[1] ?? title;
    e.href = href.search(q);
    out.push(e);
  });

  // серии
  series.forEach((s) => {
    out.push(make('series', s.title, s.title, href.series(s.slug), notesOf((a) => a.series_slug === s.slug), 'серия заметок'));
  });

  return out.sort((a, b) => a.key.localeCompare(b.key, 'ru'));
}
