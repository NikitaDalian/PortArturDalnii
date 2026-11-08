// Вспомогательные выборки раздела «Заметки».
import { articles, entity, type Article } from '../../lib/data';

/** Заметки по дате поста: от старых к новым (при равной дате — по номеру поста). */
export const byDate: Article[] = [...articles].sort(
  (a, b) => a.date.localeCompare(b.date) || (a.tg_ids[0] ?? 0) - (b.tg_ids[0] ?? 0),
);

export function prevNext(slug: string): { prev: Article | null; next: Article | null } {
  const i = byDate.findIndex((a) => a.slug === slug);
  return { prev: i > 0 ? byDate[i - 1] : null, next: i >= 0 && i < byDate.length - 1 ? byDate[i + 1] : null };
}

/** Заметки с наибольшим пересечением людей, мест и книг. */
export function readAlso(a: Article, n = 3): Article[] {
  const ppl = new Set(a.people), plc = new Set(a.places), bk = new Set(a.books);
  return articles
    .filter((x) => x.slug !== a.slug)
    .map((x) => ({
      x,
      score:
        x.people.filter((s) => ppl.has(s)).length * 2 +
        x.places.filter((s) => plc.has(s)).length * 2 +
        x.books.filter((s) => bk.has(s)).length +
        x.layer.filter((l) => a.layer.includes(l)).length * 0.1,
      gap: Math.abs(Date.parse(x.date) - Date.parse(a.date)),
    }))
    .filter((r) => r.score >= 1)
    .sort((p, q) => q.score - p.score || p.gap - q.gap)
    .slice(0, n)
    .map((r) => r.x);
}

/** Ключ сортировки для имён: «Сергей Юльевич Витте» → «витте сергей юльевич». */
export function nameKey(name: string): string {
  return invertName(name).toLowerCase().replace(/ё/g, 'е').replace(/[«»"„“().,]/g, '');
}

const EAST_ASIAN_FIRST = new Set(['Ноги', 'Камимура', 'Такахаси', 'Того', 'Цуда', 'Ли']);
const TITLES = ['Великий князь', 'Императрица', 'Император', 'Принц'];

/** Имя в порядке указателя: «Витте, Сергей Юльевич»; японские и китайские имена — как есть. */
export function invertName(name: string): string {
  const m = name.match(/^(.*?)\s*(\([^)]*\))?$/);
  const core = (m?.[1] ?? name).trim();
  const paren = m?.[2] ? ' ' + m[2] : '';
  for (const t of TITLES) {
    if (core.startsWith(t + ' ')) return `${core.slice(t.length + 1)}, ${t.toLowerCase()}${paren}`;
  }
  const w = core.split(/\s+/);
  if (w.length < 2 || EAST_ASIAN_FIRST.has(w[0])) return core + paren;
  if (/^[IVX]+$/.test(w[1])) return core + paren; // Николай II, Александр III
  // инициалы: «А. Л. Панищев» → «Панищев А. Л.»
  if (w.slice(0, -1).every((x) => /^[А-ЯЁA-Z]\.$/.test(x))) return `${w[w.length - 1]} ${w.slice(0, -1).join(' ')}${paren}`;
  // «Вячеслав Константинович фон Плеве»
  const fon = w.indexOf('фон');
  if (fon > 0 && fon === w.length - 2) return `${w[w.length - 1]}, ${w.slice(0, fon).join(' ')} фон${paren}`;
  return `${w[w.length - 1]}, ${w.slice(0, -1).join(' ')}${paren}`;
}

/** Список {slug,label,count} для выпадающих фильтров. */
export function facet(kind: 'person' | 'place', pick: (a: Article) => string[]) {
  const counts = new Map<string, number>();
  articles.forEach((a) => pick(a).forEach((s) => counts.set(s, (counts.get(s) ?? 0) + 1)));
  return [...counts.entries()]
    .map(([slug, count]) => {
      const label = entity(kind, slug).label;
      return { slug, count, label: kind === 'person' ? invertName(label) : label };
    })
    .sort((a, b) => a.label.localeCompare(b.label, 'ru'));
}
