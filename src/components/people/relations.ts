// Связи персоны: заметки, книги, соседи по заметкам. Только для раздела «Лица».
import { articles, books, people, terms, type Article, type Book, type Person } from '../../lib/data';

const norm = (s: string) => s.toLowerCase().replace(/ё/g, 'е');
const words = (s: string) => norm(s.replace(/\([^)]*\)/g, ' ')).split(/[\s,]+/).filter(Boolean);

/** Инициалы для плашки без портрета: первое и последнее слово полного имени («Анатолий Михайлович Стессель» → «АС»). */
export function initials(name: string): string {
  const ws = name.replace(/\([^)]*\)/g, ' ').split(/\s+/).filter((w) => w && w[0] === w[0].toUpperCase() && /[A-ZА-ЯЁ]/.test(w[0]));
  if (!ws.length) return name.slice(0, 1).toUpperCase();
  return (ws.length === 1 ? ws[0][0] : ws[0][0] + ws[ws.length - 1][0]).toUpperCase();
}

/** «Ли Хунчжан (李鸿章)» → { main: 'Ли Хунчжан', alt: '李鸿章' } */
export function splitName(name: string): { main: string; alt: string | null } {
  const m = name.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
  return m ? { main: m[1], alt: m[2] } : { main: name, alt: null };
}

/** Цитата «…» — источник → { text, source } (делим по последнему тире). */
export function splitQuote(q: string): { text: string; source: string | null } {
  const i = q.lastIndexOf(' — ');
  return i > 0 ? { text: q.slice(0, i).trim(), source: q.slice(i + 3).trim() } : { text: q, source: null };
}

/** Заметки персоны: из её списка и из articles[].people, по дате. */
export function personArticles(p: Person): Article[] {
  const own = new Set(p.articles);
  return articles
    .filter((a) => own.has(a.slug) || (a.people as string[]).includes(p.slug))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** Книги: написанные самой персоной и те, в чьих заметках-рецензиях она фигурирует. */
export function personBooks(p: Person): { authored: Book[]; reviewed: Book[] } {
  const nameWords = new Set(words(p.name));
  const isAuthor = (b: Book) =>
    String(b.author || '').split(/\s*,\s*/).some((au) => {
      const w = words(au);
      return w.length >= 2 && !w.some((x) => x.endsWith('.')) && w.every((x) => nameWords.has(x));
    });
  const tg = new Set(personArticles(p).flatMap((a) => a.tg_ids as number[]));
  const authored = books.filter(isAuthor);
  const reviewed = books.filter((b) => !authored.includes(b) && ((b.review_post as number[]) || []).some((id) => tg.has(id)));
  return { authored, reviewed };
}

/** Другие персоны (со страницами), которые встречаются в тех же заметках. По числу общих заметок. */
export function neighbors(p: Person, limit = 8): Person[] {
  const count = new Map<string, number>();
  for (const a of personArticles(p)) {
    for (const s of a.people as string[]) if (s !== p.slug) count.set(s, (count.get(s) ?? 0) + 1);
  }
  const order = new Map(people.map((x, i) => [x.slug, i]));
  return people
    .filter((x) => count.has(x.slug))
    .sort((a, b) => count.get(b.slug)! - count.get(a.slug)! || order.get(a.slug)! - order.get(b.slug)!)
    .slice(0, limit);
}

/** Имена из указателя без своих страниц, с числом заметок. */
export function mentionedNames(): { slug: string; label: string; query: string; count: number }[] {
  const pageSlugs = new Set(people.map((p) => p.slug));
  return Object.entries(terms.people)
    .filter(([slug]) => !pageSlugs.has(slug))
    .map(([slug, label]) => ({
      slug,
      label,
      query: label.replace(/\s*\([^)]*\)/g, '').trim(),
      count: articles.filter((a) => (a.people as string[]).includes(slug)).length,
    }))
    .sort((a, b) => a.label.localeCompare(b.label, 'ru'));
}
