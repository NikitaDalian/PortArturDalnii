// Подписи и вспомогательные функции раздела «Библиотека».
import { BOOK_LEVELS, articlesOf, type Book, type Source } from '../../lib/data';

export const BOOK_KINDS: Record<string, string> = {
  history: 'История',
  memoir: 'Мемуары',
  novel: 'Роман',
  'alt-history': 'Альтернативная история',
  album: 'Альбом',
  reference: 'Справочник',
  humor: 'Юмор',
};
export const kindLabel = (k: string) => BOOK_KINDS[k] ?? k;

export const SOURCE_KINDS: { key: string; label: string; one: string }[] = [
  { key: 'archive', label: 'Архивы', one: 'Архив' },
  { key: 'album', label: 'Альбомы', one: 'Альбом' },
  { key: 'lecture', label: 'Лекции', one: 'Лекция' },
  { key: 'video', label: 'Видео', one: 'Видео' },
  { key: 'music', label: 'Музыка', one: 'Музыка' },
  { key: 'other', label: 'Тексты и другое', one: 'Источник' },
];
export const sourceKindLabel = (k: string) => SOURCE_KINDS.find((s) => s.key === k)?.one ?? 'Источник';

/** Порядок уровней = «оценка»: 0 — лучше всего для старта. */
export const LEVEL_ORDER = Object.keys(BOOK_LEVELS);
export const levelRank = (l: string) => {
  const i = LEVEL_ORDER.indexOf(l);
  return i < 0 ? LEVEL_ORDER.length : i;
};

/** Первый четырёхзначный год из строки вида «1940–1941». */
export const firstYear = (y: string | null | undefined) => {
  const m = y ? String(y).match(/\d{4}/) : null;
  return m ? Number(m[0]) : null;
};

/** Фамилия первого автора для сортировки: «Кристофер Мартин» → «Мартин». */
export const authorKey = (a: string | null | undefined) => {
  if (!a) return '';
  const first = a.split(/,|\sи\s/)[0].trim();
  const words = first.split(/\s+/);
  return (words[words.length - 1] || first).toLocaleLowerCase('ru');
};

/** Люди, упомянутые в заметках о книге/источнике (по частоте). */
export function peopleOf(articleSlugs: string[]): string[] {
  const count = new Map<string, number>();
  for (const a of articlesOf(articleSlugs)) for (const p of a.people ?? []) count.set(p, (count.get(p) ?? 0) + 1);
  return [...count.entries()].sort((x, y) => y[1] - x[1]).map(([s]) => s);
}

export function similarBooks(b: Book, all: Book[], limit = 4): Book[] {
  const mine = new Set(peopleOf(b.articles));
  return all
    .filter((x) => x.slug !== b.slug)
    .map((x) => {
      const shared = peopleOf(x.articles).filter((p) => mine.has(p)).length;
      const score = shared * 2 + (x.level === b.level ? 1 : 0) + (x.kind === b.kind ? 0.5 : 0);
      return { x, score, shared };
    })
    .filter((r) => r.shared > 0 || r.x.level === b.level)
    .sort((p, q) => q.score - p.score || levelRank(p.x.level) - levelRank(q.x.level))
    .slice(0, limit)
    .map((r) => r.x);
}

export function similarSources(s: Source, all: Source[], limit = 4): Source[] {
  const mine = new Set(peopleOf(s.articles ?? []));
  const arts = new Set(s.articles ?? []);
  return all
    .filter((x) => x.slug !== s.slug)
    .map((x) => {
      const sharedArts = (x.articles ?? []).filter((a) => arts.has(a)).length;
      const sharedPeople = peopleOf(x.articles ?? []).filter((p) => mine.has(p)).length;
      return { x, score: sharedArts * 3 + sharedPeople + (x.kind === s.kind ? 2 : 0) };
    })
    .filter((r) => r.score > 0)
    .sort((p, q) => q.score - p.score)
    .slice(0, limit)
    .map((r) => r.x);
}
