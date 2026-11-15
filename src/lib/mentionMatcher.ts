export interface MentionContext { seen: Set<string>; exclude: Set<string>; preferred: Set<string> }
export const mentionContext = (exclude: string[] = [], preferred: string[] = []): MentionContext => ({ seen: new Set(), exclude: new Set(exclude), preferred: new Set(preferred) });

export function createMentionMatcher<T>(names: Map<string, Set<string>>, registry: Map<string, T>) {
const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const candidates = [...names.keys()].sort((a, b) => b.length - a.length);
const pattern = new RegExp(candidates.map(name => {
  // CJK has no spaces between words; Latin and Cyrillic must match whole words.
  const left = /^[\p{Script=Latin}\p{Script=Cyrillic}\d]/u.test(name) ? '(?<![\\p{L}\\p{N}_])' : '';
  const right = /[\p{Script=Latin}\p{Script=Cyrillic}\d]$/u.test(name) ? '(?![\\p{L}\\p{N}_])' : '';
  return left + escape(name) + right;
}).join('|'), 'gu');

return function linkMentions(text: string, context = mentionContext(), limit = 4): { text: string; entity?: T }[] {
  const out: { text: string; entity?: T }[] = []; let cursor = 0, linked = 0;
  const quotes = [...text.matchAll(/«[^»]*»|“[^”]*”|「[^」]*」|"[^"]*"/gu)].map(m => [m.index!, m.index! + m[0].length]);
  for (const match of text.matchAll(pattern)) {
    if (linked >= limit) break;
    if (quotes.some(([start, end]) => match.index! >= start && match.index! < end)) continue;
    const ids = [...(names.get(match[0]) ?? [])];
    const preferred = ids.filter(id => context.preferred.has(id));
    const id = ids.length === 1 ? ids[0] : preferred.length === 1 ? preferred[0] : null;
    if (!id || context.exclude.has(id) || context.seen.has(id)) continue;
    if (id === 'person/artur' && /(?:Port[ -]|Порт[- ])$/i.test(text.slice(0, match.index))) continue;
    if (id === 'place/dalnii' && /^\s+Восток[а-яё]*/u.test(text.slice(match.index! + match[0].length))) continue;
    if (match.index! > cursor) out.push({ text: text.slice(cursor, match.index) });
    out.push({ text: match[0], entity: registry.get(id)! });
    cursor = match.index! + match[0].length; linked++; context.seen.add(id);
  }
  if (cursor < text.length) out.push({ text: text.slice(cursor) });
  return out.length ? out : [{ text }];
}

}
