import data from '../data/essays.json';
import { href, type LayerKey } from './data';
export interface Essay {
  slug: string; title: string; dek: string; date: string;
  periods: LayerKey[]; perspective: string; sourceLanguages: string[];
  sections: { id: string; title: string; paragraphs: string[]; refs: number[] }[];
  limitations: string[];
  sources: { id: number; title: string; author: string; date: string; url: string; locator: string; note: string }[];
  relatedNotes: string[]; relatedPlaces: string[]; relatedPeople: string[]; relatedSources: string[];
}
export const essays = data as Essay[];
export const essaysForPeriod = (period: string) => essays.filter(e => e.periods.includes(period as LayerKey));
export function essayLinks(kind: 'notes' | 'people' | 'library' | 'places', slug: string) {
  const key = { notes: 'relatedNotes', people: 'relatedPeople', library: 'relatedSources', places: 'relatedPlaces' } as const;
  return essays.filter(e => e[key[kind]].includes(slug)).map(e => ({ title: e.title, url: href.essay(e.slug) }));
}
