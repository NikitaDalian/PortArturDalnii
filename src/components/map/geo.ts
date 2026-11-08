// Геометрия и ссылки для карт. Без импорта данных: файл попадает в клиентский бандл.

export type LL = [number, number]; // [lat, lng]

/** Расстояние по гаверсинусу, км */
export function haversine(a: LL, b: LL): number {
  const R = 6371;
  const r = Math.PI / 180;
  const dLat = (b[0] - a[0]) * r, dLng = (b[1] - a[1]) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Принадлежность места эпохе (ключи слоёв сайта).
 * Слой «до 1898» в данных 'chinese' уже приведён к 'pre1898' на сервере.
 * «Сегодня» (modern): слой modern или заполнено visit (есть сведения, как прийти сейчас),
 * кроме мест с today:false в places.json (закрытая военная база, доступ не подтверждён); см. payload.v.
 */
export const inEra = (p: { l: string[]; v: boolean }, era: string) => (era === 'modern' ? p.l.includes('modern') || p.v : p.l.includes(era));

export const pathLength = (pts: LL[]) => pts.reduce((s, p, i) => (i ? s + haversine(pts[i - 1], p) : 0), 0);

/**
 * Рациональный порядок обхода точек (открытый путь): ближайший сосед + 2-opt.
 * start — индекс фиксированной стартовой точки или null (тогда перебираем все старты).
 * Возвращает массив индексов исходного списка.
 */
export function optimizeOrder(pts: LL[], start: number | null = null): number[] {
  const n = pts.length;
  if (n <= 2) {
    if (n === 2 && start === 1) return [1, 0];
    return pts.map((_, i) => i);
  }
  const D = pts.map((a) => pts.map((b) => haversine(a, b)));
  const len = (o: number[]) => o.reduce((s, v, i) => (i ? s + D[o[i - 1]][v] : 0), 0);
  const nn = (s: number) => {
    const order = [s];
    const left = new Set(pts.map((_, i) => i)); left.delete(s);
    while (left.size) {
      const last = order[order.length - 1];
      let best = -1, bd = Infinity;
      for (const j of left) if (D[last][j] < bd) { bd = D[last][j]; best = j; }
      order.push(best); left.delete(best);
    }
    return order;
  };
  const twoOpt = (o: number[]) => {
    // первая точка фиксирована, если задан старт; последняя всегда свободна (открытый путь)
    const from = start === null ? 0 : 1;
    let improved = true, guard = 0;
    while (improved && guard++ < 200) {
      improved = false;
      for (let i = from; i < n - 1; i++) {
        for (let k = i + 1; k < n; k++) {
          const a = i > 0 ? o[i - 1] : -1, b = o[i], c = o[k], d = k < n - 1 ? o[k + 1] : -1;
          const before = (a >= 0 ? D[a][b] : 0) + (d >= 0 ? D[c][d] : 0);
          const after = (a >= 0 ? D[a][c] : 0) + (d >= 0 ? D[b][d] : 0);
          if (after + 1e-9 < before) {
            o.splice(i, k - i + 1, ...o.slice(i, k + 1).reverse());
            improved = true;
          }
        }
      }
    }
    return o;
  };
  const starts = start === null ? pts.map((_, i) => i) : [start];
  let best: number[] = [], bl = Infinity;
  for (const s of starts) {
    const o = twoOpt(nn(s));
    const l = len(o);
    if (l < bl) { bl = l; best = o; }
  }
  return best;
}

// WGS-84 → GCJ-02 (копия из lib/data.ts, чтобы не тянуть данные в клиент)
export function wgsToGcj(lat: number, lng: number): LL {
  const a = 6378245.0, ee = 0.00669342162296594323;
  const tLat = (x: number, y: number) => -100 + 2 * x + 3 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x)) +
    ((20 * Math.sin(6 * x * Math.PI) + 20 * Math.sin(2 * x * Math.PI)) * 2) / 3 +
    ((20 * Math.sin(y * Math.PI) + 40 * Math.sin((y / 3) * Math.PI)) * 2) / 3 +
    ((160 * Math.sin((y / 12) * Math.PI) + 320 * Math.sin((y * Math.PI) / 30)) * 2) / 3;
  const tLng = (x: number, y: number) => 300 + x + 2 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x)) +
    ((20 * Math.sin(6 * x * Math.PI) + 20 * Math.sin(2 * x * Math.PI)) * 2) / 3 +
    ((20 * Math.sin(x * Math.PI) + 40 * Math.sin((x / 3) * Math.PI)) * 2) / 3 +
    ((150 * Math.sin((x / 12) * Math.PI) + 300 * Math.sin((x / 30) * Math.PI)) * 2) / 3;
  let dLat = tLat(lng - 105, lat - 35), dLng = tLng(lng - 105, lat - 35);
  const rad = (lat / 180) * Math.PI;
  let magic = Math.sin(rad); magic = 1 - ee * magic * magic;
  const sq = Math.sqrt(magic);
  dLat = (dLat * 180) / (((a * (1 - ee)) / (magic * sq)) * Math.PI);
  dLng = (dLng * 180) / ((a / sq) * Math.cos(rad) * Math.PI);
  return [lat + dLat, lng + dLng];
}

export const amapMarker = (lat: number, lng: number, name: string) => {
  const [g, h] = wgsToGcj(lat, lng);
  return `https://uri.amap.com/marker?position=${h.toFixed(6)},${g.toFixed(6)}&name=${encodeURIComponent(name)}&coordinate=gaode&callnative=1`;
};
/** Навигация Amap до точки (мультиточечные маршруты uri.amap.com не поддерживает) */
export const amapNav = (lat: number, lng: number, name: string) => {
  const [g, h] = wgsToGcj(lat, lng);
  return `https://uri.amap.com/navigation?to=${h.toFixed(6)},${g.toFixed(6)},${encodeURIComponent(name)}&mode=car&policy=1&coordinate=gaode&callnative=1`;
};
export const yandexPoint = (lat: number, lng: number) => `https://yandex.ru/maps/?pt=${lng},${lat}&z=16&l=map`;
/** Маршрут через все точки в Яндекс.Картах */
export const yandexRoute = (pts: LL[], mode: 'auto' | 'pd' = 'auto') =>
  `https://yandex.ru/maps/?rtext=${pts.map((p) => `${p[0].toFixed(5)},${p[1].toFixed(5)}`).join('~')}&rtt=${mode}`;

export const fmtKm = (km: number) => (km < 1 ? `${Math.round(km * 1000)} м` : `${km.toFixed(km < 10 ? 1 : 0).replace('.', ',')} км`);

// Подложка OpenStreetMap: простой стиль-объект
export const OSM_ATTR = '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">участники OpenStreetMap</a>';
export const osmStyle = () => ({
  version: 8 as const,
  sources: {
    osm: {
      type: 'raster' as const,
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      maxzoom: 19,
      attribution: OSM_ATTR,
    },
  },
  layers: [
    { id: 'bg', type: 'background' as const, paint: { 'background-color': '#DCE6EA' } },
    { id: 'osm', type: 'raster' as const, source: 'osm', paint: { 'raster-saturation': -0.35, 'raster-contrast': -0.05 } },
  ],
});

// Старый план крепости 1904 года (фото № 32), привязка приблизительная:
// аффинное приближение по 6 точкам (укрепления № 3, 4, 5, форты № II, IV, Электрический утёс), ошибка ~100–150 м.
export const PLAN_1904_CORNERS: [number, number][] = [
  [121.17494, 38.86489], // верхний левый
  [121.33337, 38.8659],  // верхний правый
  [121.32021, 38.75299], // нижний правый
  [121.16177, 38.75199], // нижний левый
];

// Иконки типов мест (24×24, stroke)
export const KIND_ICON: Record<string, string> = {
  fort: '<path d="M4 20V9l3 2V7l5-3 5 3v4l3-2v11z"/>',
  battery: '<circle cx="8" cy="16" r="3"/><path d="M10 14l9-7"/>',
  viewpoint: '<path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6S2 12 2 12z"/><circle cx="12" cy="12" r="2.5"/>',
  port: '<circle cx="12" cy="5" r="2"/><path d="M12 7v13M5 13a7 7 0 0 0 14 0M8 10h8"/>',
  station: '<rect x="6" y="3" width="12" height="13" rx="2"/><path d="M8 20l2-4M16 20l-2-4M6 11h12"/>',
  museum: '<path d="M3 9l9-5 9 5M5 10v8M10 10v8M14 10v8M19 10v8M3 20h18"/>',
  cemetery: '<path d="M12 3v18M7 8h10"/>',
  street: '<path d="M7 3l-3 18M17 3l3 18M12 5v3M12 11v3M12 17v3"/>',
  monument: '<path d="M10 21l1-15 1-3 1 3 1 15zM7 21h10"/>',
  building: '<path d="M4 21V8l8-5 8 5v13M9 21v-6h6v6"/>',
  park: '<path d="M12 3a6 6 0 0 0-4 10.5h8A6 6 0 0 0 12 3zM12 13v8"/>',
  square: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="2"/>',
  meeting: '<path d="M6 21V4M6 4h11l-2 4 2 4H6"/>',
};
export const kindSvg = (kind: string, size = 14) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${KIND_ICON[kind] ?? KIND_ICON.building}</svg>`;
