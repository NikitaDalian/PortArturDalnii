// Данные раздела «Слои истории»: тексты из layers.json + выборки заметок, людей и мест по слою.
import layersJson from '../../data/layers.json';
import { articles, people, places, personBySlug, placeBySlug, LAYERS, type LayerKey, type Article, type Person, type Place } from '../../lib/data';

export interface LayerDate { year: number; date: string; text: string; key?: boolean }
export interface LayerText {
  card: string; lead: string; intro: string[];
  image: number | null; imageAlt: string; caption: string;
  dates: LayerDate[];
}
export const layerText = layersJson as Record<LayerKey, LayerText>;

// Длительность сегмента шкалы (в годах). «До 1898» — условно узкий сегмент.
const NOW = new Date().getFullYear();
export const SPAN: Record<LayerKey, number> = {
  pre1898: 4, russian: 7, japanese: 40, soviet: 10, modern: Math.max(NOW - 1955, 1),
};

/** Заметки слоя, новые сверху. */
export const layerArticles = (k: LayerKey): Article[] =>
  articles.filter((a) => a.layer.includes(k)).sort((a, b) => b.date.localeCompare(a.date));

/** Люди, упомянутые в заметках слоя, по числу заметок. */
export function layerPeople(k: LayerKey): Person[] {
  const cnt = new Map<string, number>();
  for (const a of layerArticles(k)) for (const s of a.people) if (personBySlug.has(s)) cnt.set(s, (cnt.get(s) ?? 0) + 1);
  return [...cnt.entries()].sort((a, b) => b[1] - a[1]).map(([s]) => personBySlug.get(s)!) ;
}

// В places.json слой «до 1898» записан как 'chinese'; у «сегодня» своего ключа нет —
// показываем места, где есть сведения для посещения.
const PLACE_LAYER: Partial<Record<LayerKey, string>> = { pre1898: 'chinese', russian: 'russian', japanese: 'japanese', soviet: 'soviet' };

export function layerPlaces(k: LayerKey): Place[] {
  const key = PLACE_LAYER[k];
  const xs = key ? places.filter((p) => (p.layers || []).includes(key)) : places.filter((p) => p.visit);
  const weight = (p: Place) => (p.articles?.length ?? 0) * 10 + (p.posts?.length ?? 0) + (p.photos?.length ? 1 : 0);
  return [...xs].sort((a, b) => weight(b) - weight(a));
}

export const layerIndex = (k: LayerKey) => LAYERS.findIndex((l) => l.key === k);
export { LAYERS, people, placeBySlug };
