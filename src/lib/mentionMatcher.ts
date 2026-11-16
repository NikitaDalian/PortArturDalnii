export interface MentionContext { seen: Set<string>; exclude: Set<string>; preferred: Set<string> }
export const mentionContext = (exclude: string[] = [], preferred: string[] = []): MentionContext => ({ seen: new Set(), exclude: new Set(exclude), preferred: new Set(preferred) });

export function createMentionMatcher<T>(names: Map<string, Set<string>>, registry: Map<string, T>, options: { quotedEntities?: Set<string>; contextualNames?: Map<string, Set<string>>; annotationEntities?: Set<string> } = {}) {
const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const candidates = [...names.keys()].sort((a, b) => b.length - a.length);
const pattern = new RegExp(candidates.map(name => {
  // CJK has no spaces between words; Latin and Cyrillic must match whole words.
  // A numeric CJK phrase such as 66艘 may follow Han text without a space,
  // but must still not match the tail of 166艘 or a Latin identifier.
  const wordChars=/\p{Script=Han}/u.test(name)?'\\p{Script=Latin}\\p{Script=Cyrillic}\\p{N}_':'\\p{L}\\p{N}_';
  const left = /^[\p{Script=Latin}\p{Script=Cyrillic}\d]/u.test(name) ? `(?<![${wordChars}])` : '';
  const right = /[\p{Script=Latin}\p{Script=Cyrillic}\d]$/u.test(name) ? `(?![${wordChars}])` : '';
  return left + escape(name) + right;
}).join('|'), 'gu');

return function linkMentions(text: string, context = mentionContext(), limit = 4): { text: string; entity?: T }[] {
  const out: { text: string; entity?: T }[] = []; let cursor = 0, linked = 0;
  let annotated = [...context.seen].filter(id=>options.annotationEntities?.has(id)).length;
  const quotes = [...text.matchAll(/«[^»]*»|“[^”]*”|「[^」]*」|『[^』]*』|"[^"]*"/gu)].map(m => ({start:m.index!,end:m.index!+m[0].length,inside:m[0].slice(1,-1).trim()}));
  for (const match of text.matchAll(pattern)) {
    const quote = quotes.find(q => match.index! >= q.start && match.index! < q.end);
    let ids = [...(names.get(match[0]) ?? [])];
    if (quote) {
      // Exact, explicitly eligible ship names only; protect book titles and prose.
      if (quote.inside !== match[0]) continue;
      const prefix = text.slice(Math.max(0,quote.start-90),quote.start);
      if (/(?:книг[а-яё]*|роман[а-яё]*|повест[а-яё]*|рассказ[а-яё]*|песн[а-яё]*|book|novel|memoir|song|著作|小説|小说|書名|书名|一书)\s*(?:[«“"'\wА-Яа-яёЁ.,:—–-]+\s+){0,3}$/iu.test(prefix)) continue;
      ids = ids.filter(id => options.quotedEntities?.has(id));
    }
    if (!quote) ids = ids.filter(id => !options.contextualNames?.get(match[0])?.has(id) || context.preferred.has(id));
    const preferred = ids.filter(id => context.preferred.has(id));
    const id = ids.length === 1 ? ids[0] : preferred.length === 1 ? preferred[0] : null;
    if (!id || context.exclude.has(id) || context.seen.has(id)) continue;
    const annotation=options.annotationEntities?.has(id)??false;
    if(annotation ? annotated>=2 : linked>=limit)continue;
    if (id === 'person/artur' && /(?:Port[ -]|Порт[- ])$/i.test(text.slice(0, match.index))) continue;
    if (id === 'place/dalnii' && /^\s+Восток[а-яё]*/u.test(text.slice(match.index! + match[0].length))) continue;
    if (match.index! > cursor) out.push({ text: text.slice(cursor, match.index) });
    out.push({ text: match[0], entity: registry.get(id)! });
    cursor = match.index! + match[0].length;
    if(annotation)annotated++;else linked++;
    context.seen.add(id);
  }
  if (cursor < text.length) out.push({ text: text.slice(cursor) });
  return out.length ? out : [{ text }];
}

}
