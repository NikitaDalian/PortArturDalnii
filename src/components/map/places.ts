// Серверные помощники разделов «Карта», «Места», «Маршруты» (только во frontmatter .astro).
import { places, routes, people, href, img, focusStyle, layerByKey, photoMeta, placeBySlug, LAYERS, type Place, type Route } from '../../lib/data';
import { haversine, yandexRoute, type LL } from './geo';

export const KINDS: Record<string, string> = {
  fort: 'Форт, укрепление',
  battery: 'Батарея',
  viewpoint: 'Смотровая точка',
  port: 'Гавань, порт',
  station: 'Вокзал',
  museum: 'Музей',
  cemetery: 'Кладбище',
  street: 'Улицы, район',
  monument: 'Памятник',
  building: 'Здание',
  park: 'Парк',
  square: 'Площадь',
  meeting: 'Точка сбора',
};
export const CITIES: Record<string, string> = { lushun: 'Люйшунь', dalian: 'Далянь', other: 'Другое' };
export const TRANSPORT: Record<string, string> = { walk: 'Пешком', mixed: 'Пешком и на такси', car: 'На машине', bus: 'На автобусе', bike: 'На велосипеде' };
export const SEASONS: Record<string, { label: string; color: string }> = {
  spring: { label: 'Весна', color: 'var(--s-spring)' },
  summer: { label: 'Лето', color: 'var(--s-summer)' },
  autumn: { label: 'Осень', color: 'var(--s-autumn)' },
  winter: { label: 'Зима', color: 'var(--s-winter)' },
};

/** Ключ слоя: «chinese» в данных мест = период до 1898 */
export const normLayer = (l: string) => (l === 'chinese' ? 'pre1898' : l);
export const placeLayers = (p: Place) => [...new Set(((p.layers || []) as string[]).map(normLayer))].filter((l) => layerByKey(l));
export const layerShort = (l: string) => layerByKey(normLayer(l))?.short ?? l;
export const layerYears = (l: string) => layerByKey(normLayer(l))?.years ?? l;

export const isUncertain = (p: Place) => Boolean(p.verify) || p.coord_confidence === 'low';

export const photoCaption = (file: string) => photoMeta(file)?.subject ?? '';

export const routeAuthor = (r: Route) => ((r as any).author as string | undefined) ?? null;
/** Сначала авторские маршруты, остальные в исходном порядке */
export const sortedRoutes = () => [...routes].sort((a, b) => Number(!!routeAuthor(b)) - Number(!!routeAuthor(a)));

export const routeStops = (r: Route) => (r.stops as any[]).map((s) => ({ ...s, p: placeBySlug.get(s.place) as Place | undefined }));
export const routePoints = (r: Route): LL[] => routeStops(r).filter((s) => s.p).map((s) => [s.p!.lat, s.p!.lng] as LL);
export const routeYandex = (r: Route) => yandexRoute(routePoints(r));
export const routeCover = (r: Route) => {
  for (const s of routeStops(r)) {
    const f = s.p?.photos?.[0];
    if (f) return f as string;
  }
  return null;
};
export const routesThrough = (slug: string) =>
  sortedRoutes().flatMap((r) => {
    const i = (r.stops as any[]).findIndex((s) => s.place === slug);
    return i >= 0 ? [{ r, n: i + 1 }] : [];
  });

export const peopleAt = (slug: string) => people.filter((x) => ((x.places || []) as string[]).includes(slug));

export const nearest = (p: Place, k = 4) =>
  places
    .filter((x) => x.slug !== p.slug)
    .map((x) => ({ x, d: haversine([p.lat, p.lng], [x.lat, x.lng]) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, k);

/** Данные для клиентской карты (только нужные поля) */
export function mapPayload() {
  return {
    places: places.map((p) => ({
      s: p.slug,
      n: p.name,
      zh: p.name_zh,
      now: p.name_now,
      c: p.city,
      l: placeLayers(p),
      k: p.kind,
      lat: p.lat,
      lng: p.lng,
      u: isUncertain(p),
      low: p.coord_confidence === 'low',
      t: p.summary,
      ph: ((p.photos || []) as string[]).map((f) => ({ f: img(f), t: img(f, 640), a: photoCaption(f), s: focusStyle(f) })).filter((x) => x.f),
      h: href.place(p.slug),
    })),
    routes: sortedRoutes().map((r) => ({
      s: r.slug,
      title: r.title,
      dek: r.dek,
      a: routeAuthor(r),
      stops: (r.stops as any[]).map((s) => s.place),
      line: ((r as any).polyline as LL[] | undefined) ?? null,
      h: href.route(r.slug),
    })),
    layers: LAYERS.map((l) => ({ k: l.key, t: l.short, y: l.years })),
    kinds: KINDS,
    cities: CITIES,
  };
}
