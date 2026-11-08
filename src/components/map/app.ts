// Полноэкранная карта /karta/: маркеры, фильтры, карточка места, готовые маршруты, конструктор своего маршрута.
import { loadMapLibre, webglOk } from './ml';
import {
  haversine, optimizeOrder, amapMarker, amapNav, yandexPoint, yandexRoute, fmtKm, osmStyle, kindSvg,
  PLAN_1904_CORNERS, type LL,
} from './geo';

type P = {
  s: string; n: string; zh: string | null; now: string | null; c: string; l: string[]; k: string;
  lat: number; lng: number; u: boolean; low: boolean; t: string; ph: { f: string; t: string; a: string }[]; h: string;
};
type R = { s: string; title: string; dek: string; a: string | null; stops: string[]; line: LL[] | null; h: string };
type Data = { places: P[]; routes: R[]; layers: { k: string; t: string; y: string }[]; kinds: Record<string, string>; cities: Record<string, string>; plan: string | null };

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const ICON = {
  close: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  back: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>',
  pin: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>',
  plus: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
  check: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7"/></svg>',
  share: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="M8.2 10.8l7.6-4.4M8.2 13.2l7.6 4.4"/></svg>',
  prev: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>',
  next: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>',
};

let cleanup: (() => void) | null = null;

export async function initMapApp() {
  cleanup?.(); cleanup = null;
  const root = document.querySelector<HTMLElement>('[data-mapapp]');
  if (!root) return;
  const data: Data = JSON.parse(root.querySelector('#map-data')!.textContent || '{}');
  const P = new Map(data.places.map((p) => [p.s, p]));
  const Rt = new Map(data.routes.map((r) => [r.s, r]));
  const $ = <T extends HTMLElement = HTMLElement>(sel: string) => root.querySelector<T>(sel)!;
  const mapEl = $('#map'), sheet = $('#m-sheet'), body = $('#m-body'), foot = $('#m-foot'), grab = $('#m-grab');
  const toastEl = $('#m-toast');
  const mqDesk = matchMedia('(min-width: 900px)');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- состояние ----------
  const st = {
    mode: 'none' as 'none' | 'place' | 'list' | 'builder' | 'route',
    back: null as null | 'list' | 'builder' | 'route',
    cur: null as string | null,
    route: null as string | null,
    sel: [] as string[],         // выбранные точки своего маршрута (в рациональном порядке)
    start: null as string | null, // фиксированная стартовая точка
    city: 'all', layers: new Set<string>(), kinds: new Set<string>(), q: '',
    plan: false, planOpacity: 0.7,
  };

  // ---------- URL ----------
  const params = new URLSearchParams(location.search);
  const setUrl = () => {
    const u = new URL(location.href);
    u.search = '';
    if (st.route) u.searchParams.set('route', st.route);
    else if (st.sel.length) {
      u.searchParams.set('pts', st.sel.join(','));
      if (st.start) u.searchParams.set('start', st.start);
    }
    u.hash = st.mode === 'place' && st.cur ? st.cur : '';
    const s = u.pathname + (u.searchParams.toString() ? '?' + u.searchParams.toString().replace(/%2C/g, ',') : '') + u.hash;
    if (s !== location.pathname + location.search + location.hash) history.replaceState(history.state, '', s);
  };

  const toast = (msg: string) => {
    toastEl.textContent = msg; toastEl.classList.add('is-on');
    clearTimeout((toastEl as any)._t); (toastEl as any)._t = setTimeout(() => toastEl.classList.remove('is-on'), 2600);
  };

  // ---------- карта ----------
  if (!webglOk()) {
    mapEl.innerHTML = '<p class="mapapp__nogl">Браузер не поддерживает WebGL, поэтому интерактивная карта не показывается. Ниже на странице — список всех мест со ссылками.</p>';
    return;
  }
  const ml = await loadMapLibre();
  if (!document.body.contains(root)) return; // успели уйти со страницы
  const map = new ml.Map({
    container: mapEl,
    style: osmStyle() as any,
    center: [121.42, 38.86], zoom: 10,
    attributionControl: false,
    maxZoom: 18.5, minZoom: 3,
    dragRotate: false, pitchWithRotate: false, touchPitch: false,
  });
  map.touchZoomRotate.disableRotation();
  map.addControl(new ml.AttributionControl({ compact: true }), 'bottom-left');
  map.addControl(new ml.ScaleControl({ maxWidth: 90, unit: 'metric' }), 'bottom-left');
  cleanup = () => { try { map.remove(); } catch {} };

  const ready = new Promise<void>((res) => map.on('load', () => res()));

  // ---------- маркеры ----------
  const markers = new Map<string, { el: HTMLButtonElement; dot: HTMLElement; m: any }>();
  for (const p of data.places) {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'mk';
    el.setAttribute('aria-label', p.n);
    el.title = p.n;
    el.innerHTML = `<span class="mk__dot" data-kind="${esc(p.k)}">${kindSvg(p.k)}</span>`;
    el.addEventListener('click', (e) => { e.stopPropagation(); openPlace(p.s, { fly: false }); });
    const m = new ml.Marker({ element: el, anchor: 'center' }).setLngLat([p.lng, p.lat]).addTo(map);
    markers.set(p.s, { el, dot: el.firstElementChild as HTMLElement, m });
  }
  const visible = (p: P) => {
    if (st.city !== 'all' && p.c !== st.city) return false;
    if (st.layers.size && !p.l.some((l) => st.layers.has(l))) return false;
    if (st.kinds.size && !st.kinds.has(p.k)) return false;
    if (st.q) {
      const q = st.q.toLowerCase();
      if (![p.n, p.zh, p.now].some((x) => x && x.toLowerCase().includes(q))) return false;
    }
    return true;
  };
  const numbering = (): Map<string, number> => {
    const m = new Map<string, number>();
    if (st.route) Rt.get(st.route)!.stops.forEach((s, i) => { if (!m.has(s)) m.set(s, i + 1); });
    else st.sel.forEach((s, i) => m.set(s, i + 1));
    return m;
  };
  const paintMarkers = () => {
    const nums = numbering();
    for (const [s, { el, dot }] of markers) {
      const p = P.get(s)!;
      const n = nums.get(s);
      const show = visible(p) || n !== undefined || s === st.cur;
      el.hidden = !show;
      el.classList.toggle('is-active', s === st.cur);
      el.classList.toggle('is-num', n !== undefined);
      el.classList.toggle('is-dim', !!st.route && n === undefined && s !== st.cur);
      el.classList.toggle('is-unsure', p.low);
      const want = n !== undefined ? String(n) : '';
      if (dot.dataset.n !== want) {
        dot.dataset.n = want;
        dot.innerHTML = want || kindSvg(p.k);
      }
      el.style.zIndex = s === st.cur ? '3' : n !== undefined ? '2' : '1';
      el.setAttribute('aria-pressed', String(s === st.cur));
    }
  };

  // ---------- линии ----------
  const setLine = async (pts: LL[] | null) => {
    await ready;
    const gj: any = { type: 'FeatureCollection', features: pts && pts.length > 1 ? [{ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: pts.map((p) => [p[1], p[0]]) } }] : [] };
    const src = map.getSource('path') as any;
    if (src) src.setData(gj);
  };
  ready.then(() => {
    map.addSource('path', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
    map.addLayer({ id: 'path-case', type: 'line', source: 'path', layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': '#FFFFFF', 'line-width': 7, 'line-opacity': 0.9 } });
    map.addLayer({ id: 'path', type: 'line', source: 'path', layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': '#E0452B', 'line-width': 3.5, 'line-dasharray': [2, 1.4] } });
    if (data.plan) {
      map.addSource('plan', { type: 'image', url: data.plan, coordinates: PLAN_1904_CORNERS as any });
      map.addLayer({ id: 'plan', type: 'raster', source: 'plan', layout: { visibility: 'none' }, paint: { 'raster-opacity': st.planOpacity, 'raster-fade-duration': 0 } }, 'path-case');
    }
  });

  const fit = (pts: LL[], maxZoom = 15) => {
    if (!pts.length) return;
    const pad = padding();
    if (pts.length === 1) { map.flyTo({ center: [pts[0][1], pts[0][0]], zoom: Math.max(map.getZoom(), 14.5), padding: pad, duration: reduce ? 0 : 900 }); return; }
    const lats = pts.map((p) => p[0]), lngs = pts.map((p) => p[1]);
    const W = mapEl.clientWidth, H = mapEl.clientHeight;
    let pt = pad.top + 30, pb = pad.bottom + 30, pl = pad.left + 30, pr = pad.right + 30;
    const vk = Math.min(1, (H - 140) / Math.max(1, pt + pb)), hk = Math.min(1, (W - 140) / Math.max(1, pl + pr));
    pt *= vk; pb *= vk; pl *= hk; pr *= hk;
    map.fitBounds([[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]], { padding: { top: pt, bottom: pb, left: pl, right: pr }, maxZoom, duration: reduce ? 0 : 900 });
  };
  const padding = () => {
    const topH = $('.mapapp__top').offsetHeight;
    const open = !sheet.hidden;
    if (mqDesk.matches) return { top: topH, bottom: 0, left: 0, right: open ? sheet.offsetWidth + 24 : 0 };
    return { top: topH, bottom: open ? (sheet.classList.contains('is-drag') ? sheet.offsetHeight : sheetH(sheetState)) : 0, left: 0, right: 0 };
  };

  // ---------- нижняя карточка ----------
  let sheetState: 'peek' | 'full' = 'peek';
  const sheetH = (s: 'peek' | 'full') => {
    const H = root.clientHeight, top = $('.mapapp__top').offsetHeight;
    const full = H - top - 8;
    return s === 'full' ? full : Math.min(full, Math.max(260, Math.min(440, H * 0.56)));
  };
  const applySheet = (s: 'peek' | 'full' = sheetState) => {
    sheetState = s;
    sheet.dataset.state = s;
    if (mqDesk.matches) { sheet.style.height = ''; return; }
    sheet.style.height = sheetH(s) + 'px';
  };
  const showSheet = (label: string) => {
    sheet.setAttribute('aria-label', label);
    if (sheet.hidden) { sheet.hidden = false; root.classList.add('has-sheet'); void sheet.offsetHeight; applySheet('peek'); }
    else applySheet();
    body.scrollTop = 0;
  };
  const closeSheet = () => {
    const wasPlace = st.mode === 'place';
    if (wasPlace && st.back) { const b = st.back; st.back = null; st.cur = null; render(b); return; }
    sheet.hidden = true; root.classList.remove('has-sheet');
    st.mode = 'none'; st.cur = null; st.back = null;
    paintMarkers(); setUrl(); syncChips();
  };
  $('#m-close').addEventListener('click', closeSheet);

  // жест свайпа вверх/вниз (телефон)
  let drag: { y: number; h: number; t: number } | null = null;
  grab.addEventListener('pointerdown', (e) => {
    if (mqDesk.matches || (e.target as HTMLElement).closest('button')) return;
    drag = { y: e.clientY, h: sheet.offsetHeight, t: performance.now() };
    grab.setPointerCapture(e.pointerId);
    sheet.classList.add('is-drag');
  });
  grab.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const h = Math.max(90, Math.min(sheetH('full'), drag.h - (e.clientY - drag.y)));
    sheet.style.height = h + 'px';
  });
  const endDrag = (e: PointerEvent) => {
    if (!drag) return;
    const dy = e.clientY - drag.y, v = dy / Math.max(1, performance.now() - drag.t);
    const h = sheet.offsetHeight;
    sheet.classList.remove('is-drag');
    drag = null;
    if (Math.abs(dy) < 6) { applySheet(sheetState === 'peek' ? 'full' : 'peek'); return; }
    if (v > 0.6 || h < sheetH('peek') * 0.55) { if (sheetState === 'full' && h > sheetH('peek') * 0.55 && v <= 1.2) applySheet('peek'); else closeSheet(); return; }
    if (v < -0.5) { applySheet('full'); return; }
    applySheet(Math.abs(h - sheetH('full')) < Math.abs(h - sheetH('peek')) ? 'full' : 'peek');
  };
  grab.addEventListener('pointerup', endDrag);
  grab.addEventListener('pointercancel', endDrag);
  grab.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp') { applySheet('full'); e.preventDefault(); }
    if (e.key === 'ArrowDown') { sheetState === 'full' ? applySheet('peek') : closeSheet(); e.preventDefault(); }
  });
  const onResize = () => { if (!sheet.hidden) applySheet(); };
  window.addEventListener('resize', onResize);
  mqDesk.addEventListener('change', onResize);

  // ---------- рендер карточек ----------
  const layerTags = (p: P) => p.l.map((l) => `<span class="mtag">${esc(data.layers.find((x) => x.k === l)?.y ?? l)}</span>`).join('') + `<span class="mtag mtag--kind">${esc(data.kinds[p.k] ?? p.k)}</span>`;
  const selBtn = (s: string) => {
    const on = st.sel.includes(s);
    return `<button type="button" class="mselbtn${on ? ' is-on' : ''}" data-toggle="${esc(s)}" aria-pressed="${on}" title="${on ? 'Убрать из своего маршрута' : 'Добавить в свой маршрут'}">${on ? ICON.check : ICON.plus}<span>${on ? 'В маршруте' : 'В маршрут'}</span></button>`;
  };
  const backBtn = () => st.back ? `<button type="button" class="mback" data-back>${ICON.back}${st.back === 'route' ? 'К маршруту' : st.back === 'builder' ? 'К своему маршруту' : 'К списку'}</button>` : '';

  function renderPlace(p: P) {
    const photos = p.ph;
    const gal = photos.length
      ? `<div class="mgal">
          <div class="mgal__track" tabindex="0" aria-label="Фотографии: ${photos.length}. Листайте вбок">
            ${photos.map((x, i) => `<figure class="mgal__item"><img src="${esc(x.t)}" alt="${esc(x.a || p.n)}" ${i ? 'loading="lazy"' : ''} decoding="async"></figure>`).join('')}
          </div>
          ${photos.length > 1 ? `<span class="mgal__count" aria-hidden="true">1 / ${photos.length}</span>
          <button type="button" class="mgal__nav mgal__nav--prev" data-gal="-1" aria-label="Предыдущее фото">${ICON.prev}</button>
          <button type="button" class="mgal__nav mgal__nav--next" data-gal="1" aria-label="Следующее фото">${ICON.next}</button>` : ''}
        </div>
        ${photos.length > 1 ? `<div class="mgal__thumbs">${photos.map((x, i) => `<button type="button" class="mgal__thumb${i ? '' : ' is-on'}" data-thumb="${i}" aria-label="Фото ${i + 1}"><img src="${esc(x.t)}" alt="" loading="lazy"></button>`).join('')}</div>` : ''}`
      : `<div class="mgal mgal--empty" aria-hidden="true">${kindSvg(p.k, 34)}<span>Фото пока нет</span></div>`;
    body.innerHTML = `${backBtn()}${gal}
      <div class="mplace">
        <div class="mtags">${layerTags(p)}</div>
        <div class="mplace__head">
          <div class="mplace__titles">
            <h2 class="mplace__name">${esc(p.n)}</h2>
            ${p.zh ? `<p class="mplace__zh">${esc(p.zh)}</p>` : ''}
          </div>
          ${selBtn(p.s)}
        </div>
        ${p.u ? `<p class="unsure">${p.low ? 'Положение на карте приблизительное, уточняется.' : 'Сведения уточняются.'}</p>` : ''}
        ${p.now ? `<p class="mplace__now">${esc(p.now)}</p>` : ''}
        <p class="mplace__text">${esc(p.t)}</p>
      </div>`;
    foot.innerHTML = `
      <a class="mbtn mbtn--primary" href="${esc(p.h)}">Подробнее</a>
      <a class="mbtn mbtn--line" href="${esc(amapMarker(p.lat, p.lng, p.n))}" target="_blank" rel="noopener" aria-label="Открыть в Amap">${ICON.pin}Amap</a>
      <a class="mbtn mbtn--line" href="${esc(yandexPoint(p.lat, p.lng))}" target="_blank" rel="noopener" aria-label="Открыть в Яндекс Картах">${ICON.pin}Яндекс</a>`;
    initGallery();
  }

  function initGallery() {
    const track = body.querySelector<HTMLElement>('.mgal__track');
    if (!track) return;
    const count = body.querySelector<HTMLElement>('.mgal__count');
    const thumbs = [...body.querySelectorAll<HTMLElement>('.mgal__thumb')];
    const n = track.children.length;
    const idx = () => Math.round(track.scrollLeft / Math.max(1, track.clientWidth));
    const go = (i: number) => track.scrollTo({ left: Math.max(0, Math.min(n - 1, i)) * track.clientWidth, behavior: reduce ? 'auto' : 'smooth' });
    track.addEventListener('scroll', () => {
      const i = idx();
      if (count) count.textContent = `${i + 1} / ${n}`;
      thumbs.forEach((t, j) => t.classList.toggle('is-on', j === i));
    }, { passive: true });
    track.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') { go(idx() + 1); e.preventDefault(); }
      if (e.key === 'ArrowLeft') { go(idx() - 1); e.preventDefault(); }
    });
    body.querySelectorAll<HTMLElement>('[data-gal]').forEach((b) => b.addEventListener('click', () => go(idx() + Number(b.dataset.gal))));
    thumbs.forEach((t) => t.addEventListener('click', () => go(Number(t.dataset.thumb))));
  }

  function renderList() {
    const list = data.places.filter(visible);
    const groups = ['lushun', 'dalian', 'other'].map((c) => ({ c, xs: list.filter((p) => p.c === c) })).filter((g) => g.xs.length);
    body.innerHTML = `
      <div class="mhead"><h2 class="mhead__title">Места <span class="mhead__n">${list.length}</span></h2>
      <p class="mhead__hint">Отметьте галочкой точки, и сайт соберёт из них маршрут.</p></div>
      ${list.length ? groups.map((g) => `
        <h3 class="mgroup">${esc(data.cities[g.c] ?? g.c)}</h3>
        <ul class="mlist" role="list">${g.xs.map((p) => listRow(p)).join('')}</ul>`).join('') : '<p class="mempty">Ничего не найдено. Сбросьте фильтры или измените запрос.</p>'}`;
    foot.innerHTML = st.sel.length
      ? `<button type="button" class="mbtn mbtn--primary" data-open-builder>Свой маршрут: ${st.sel.length}</button>`
      : (st.q || st.layers.size || st.kinds.size || st.city !== 'all') ? '<button type="button" class="mbtn mbtn--line" data-reset>Сбросить фильтры</button>' : '';
  }
  const listRow = (p: P, extra = '') => `
    <li class="mrow">
      <button type="button" class="mrow__main" data-pick="${esc(p.s)}">
        <span class="mrow__ic" aria-hidden="true">${kindSvg(p.k, 16)}</span>
        <span class="mrow__txt"><span class="mrow__name">${esc(p.n)}</span><span class="mrow__meta">${esc(data.kinds[p.k] ?? '')}${p.u ? ' · уточняется' : ''}${extra}</span></span>
      </button>
      <label class="mrow__chk"><input type="checkbox" data-sel="${esc(p.s)}" ${st.sel.includes(p.s) ? 'checked' : ''}><span class="sr-only">В свой маршрут: ${esc(p.n)}</span><span class="mrow__box" aria-hidden="true">${ICON.check}</span></label>
    </li>`;

  function renderBuilder() {
    const pts = st.sel.map((s) => P.get(s)!).filter(Boolean);
    const ll: LL[] = pts.map((p) => [p.lat, p.lng]);
    const total = ll.reduce((s, p, i) => (i ? s + haversine(ll[i - 1], p) : 0), 0);
    body.innerHTML = `
      <div class="mhead"><h2 class="mhead__title">Свой маршрут</h2>
      <p class="mhead__hint">Отмечайте места галочкой в карточке или в списке. Порядок обхода сайт подбирает сам: ближайший сосед и улучшение 2-opt по прямым расстояниям.</p></div>
      ${pts.length ? `
        <label class="mfield"><span>Начало маршрута</span>
          <select id="m-start">
            <option value="">Любая точка (самый короткий путь)</option>
            ${pts.map((p) => `<option value="${esc(p.s)}" ${st.start === p.s ? 'selected' : ''}>${esc(p.n)}</option>`).join('')}
          </select>
        </label>
        <ol class="mstops" role="list">${pts.map((p, i) => `
          <li class="mstop">
            <span class="mstop__n" aria-hidden="true">${i + 1}</span>
            <button type="button" class="mstop__main" data-pick="${esc(p.s)}">
              <span class="mstop__name">${esc(p.n)}</span>
              <span class="mstop__meta">${i ? `+${fmtKm(haversine(ll[i - 1], ll[i]))}` : 'старт'}${p.low ? ' · точка приблизительная' : ''}</span>
            </button>
            <a class="mstop__act" href="${esc(amapNav(p.lat, p.lng, p.n))}" target="_blank" rel="noopener" aria-label="Навигация Amap до точки ${i + 1}">Amap</a>
            <button type="button" class="mstop__act mstop__rm" data-toggle="${esc(p.s)}" aria-label="Убрать: ${esc(p.n)}">${ICON.close}</button>
          </li>`).join('')}
        </ol>
        ${pts.length > 1 ? `<p class="mtotal"><b>≈ ${fmtKm(total)}</b> по прямой, по дорогам заметно больше. Время на месте не учтено.</p>` : '<p class="mtotal">Добавьте ещё хотя бы одну точку.</p>'}
        <div class="mrowbtns">
          <button type="button" class="mbtn mbtn--line mbtn--sm" data-open-list>Добавить места</button>
          <button type="button" class="mbtn mbtn--ghost mbtn--sm" data-clear>Очистить</button>
        </div>`
      : `<div class="mempty"><p>Пока ни одной точки.</p><button type="button" class="mbtn mbtn--line" data-open-list>Выбрать из списка</button></div>`}`;
    const next = pts[0];
    foot.innerHTML = pts.length > 1
      ? `<a class="mbtn mbtn--primary" href="${esc(yandexRoute(ll))}" target="_blank" rel="noopener">Открыть в Яндекс.Картах</a>
         <a class="mbtn mbtn--line" href="${esc(amapNav(next.lat, next.lng, next.n))}" target="_blank" rel="noopener" title="Amap строит путь только до одной точки">Amap → 1</a>
         <button type="button" class="mbtn mbtn--line mbtn--icon" data-share aria-label="Поделиться маршрутом">${ICON.share}</button>`
      : '';
    body.querySelector<HTMLSelectElement>('#m-start')?.addEventListener('change', (e) => {
      st.start = (e.target as HTMLSelectElement).value || null;
      reorder(); render('builder');
    });
  }

  function renderRoute(r: R) {
    const pts = r.stops.map((s) => P.get(s)).filter(Boolean) as P[];
    const ll: LL[] = pts.map((p) => [p.lat, p.lng]);
    body.innerHTML = `
      <div class="mhead">
        ${r.a ? `<p class="mhead__eyebrow">Маршрут от авторов · ${esc(r.a)}</p>` : '<p class="mhead__eyebrow">Готовый маршрут</p>'}
        <h2 class="mhead__title">${esc(r.title)}</h2>
        <p class="mhead__hint">${esc(r.dek)}</p>
      </div>
      <ol class="mstops" role="list">${pts.map((p, i) => `
        <li class="mstop">
          <span class="mstop__n" aria-hidden="true">${i + 1}</span>
          <button type="button" class="mstop__main" data-pick="${esc(p.s)}"><span class="mstop__name">${esc(p.n)}</span><span class="mstop__meta">${esc(data.kinds[p.k] ?? '')}${p.u ? ' · уточняется' : ''}</span></button>
        </li>`).join('')}
      </ol>
      <div class="mrowbtns">
        <a class="mbtn mbtn--line mbtn--sm" href="${esc(r.h)}">Описание и советы</a>
        <button type="button" class="mbtn mbtn--ghost mbtn--sm" data-fork>Изменить как свой</button>
      </div>`;
    foot.innerHTML = `
      <a class="mbtn mbtn--primary" href="${esc(yandexRoute(ll))}" target="_blank" rel="noopener">Маршрут в Яндекс.Картах</a>
      <button type="button" class="mbtn mbtn--line mbtn--icon" data-share aria-label="Поделиться маршрутом">${ICON.share}</button>
      <button type="button" class="mbtn mbtn--line mbtn--icon" data-unroute aria-label="Скрыть маршрут">${ICON.close}</button>`;
  }

  function render(mode: typeof st.mode) {
    st.mode = mode;
    if (mode === 'place' && st.cur) { renderPlace(P.get(st.cur)!); showSheet(P.get(st.cur)!.n); }
    else if (mode === 'list') { renderList(); showSheet('Список мест'); }
    else if (mode === 'builder') { renderBuilder(); showSheet('Свой маршрут'); }
    else if (mode === 'route' && st.route) { renderRoute(Rt.get(st.route)!); showSheet('Маршрут'); }
    paintMarkers(); drawPath(); setUrl(); syncChips();
  }

  // ---------- действия ----------
  function openPlace(s: string, o: { fly?: boolean } = {}) {
    const p = P.get(s);
    if (!p) return;
    if (st.mode !== 'place') st.back = st.mode === 'list' || st.mode === 'builder' || st.mode === 'route' ? st.mode : null;
    st.cur = s;
    render('place');
    const pad = padding();
    map.easeTo({ center: [p.lng, p.lat], zoom: o.fly === false ? Math.max(map.getZoom(), 13) : Math.max(map.getZoom(), 15), padding: pad, duration: reduce ? 0 : 700 });
  }
  function reorder() {
    if (st.start && !st.sel.includes(st.start)) st.start = null;
    const pts = st.sel.map((s) => P.get(s)!).filter(Boolean);
    const startIdx = st.start ? pts.findIndex((p) => p.s === st.start) : null;
    const order = optimizeOrder(pts.map((p) => [p.lat, p.lng] as LL), startIdx);
    st.sel = order.map((i) => pts[i].s);
  }
  function toggleSel(s: string) {
    if (st.route) { st.route = null; }
    st.sel = st.sel.includes(s) ? st.sel.filter((x) => x !== s) : [...st.sel, s];
    reorder();
  }
  function drawPath() {
    if (st.route) {
      const r = Rt.get(st.route)!;
      const ll = r.stops.map((s) => P.get(s)).filter(Boolean).map((p) => [p!.lat, p!.lng] as LL);
      setLine(r.line && r.line.length > 1 ? r.line : ll);
    } else if (st.sel.length > 1) {
      setLine(st.sel.map((s) => [P.get(s)!.lat, P.get(s)!.lng] as LL));
    } else setLine(null);
  }
  async function share() {
    setUrl();
    const u = location.href.split('#')[0];
    const title = st.route ? Rt.get(st.route)!.title : 'Свой маршрут по Порт-Артуру и Дальнему';
    try {
      if (navigator.share) { await navigator.share({ title, url: u }); return; }
      await navigator.clipboard.writeText(u); toast('Ссылка на маршрут скопирована');
    } catch { /* пользователь отменил */ }
  }

  root.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    const pick = t.closest<HTMLElement>('[data-pick]');
    if (pick) { openPlace(pick.dataset.pick!); return; }
    const tog = t.closest<HTMLElement>('[data-toggle]');
    if (tog) {
      const s = tog.dataset.toggle!;
      const had = st.sel.includes(s);
      toggleSel(s);
      toast(had ? 'Убрано из маршрута' : `Добавлено в маршрут: ${st.sel.length}`);
      render(st.mode === 'place' ? 'place' : 'builder');
      return;
    }
    if (t.closest('[data-back]')) { const b = st.back!; st.back = null; st.cur = null; render(b); if (b === 'route' || b === 'builder') fitCurrent(); return; }
    if (t.closest('[data-open-list]')) { st.back = null; render('list'); return; }
    if (t.closest('[data-open-builder]')) { st.back = null; render('builder'); fitCurrent(); return; }
    if (t.closest('[data-clear]')) { st.sel = []; st.start = null; render('builder'); return; }
    if (t.closest('[data-share]')) { share(); return; }
    if (t.closest('[data-reset]')) { resetFilters(); return; }
    if (t.closest('[data-unroute]')) { st.route = null; closeSheet(); drawPath(); return; }
    if (t.closest('[data-fork]')) {
      const r = Rt.get(st.route!)!;
      st.sel = [...new Set(r.stops)].filter((s) => P.has(s));
      st.start = st.sel[0] ?? null;
      st.route = null; reorder(); render('builder'); return;
    }
  });
  root.addEventListener('change', (e) => {
    const t = e.target as HTMLInputElement;
    if (t.matches('[data-sel]')) { toggleSel(t.dataset.sel!); paintMarkers(); drawPath(); setUrl(); syncChips(); if (st.mode === 'list') renderListFoot(); }
  });
  const renderListFoot = () => {
    const scroll = body.scrollTop; renderList(); body.scrollTop = scroll;
  };
  const fitCurrent = () => {
    if (st.route) fit(Rt.get(st.route)!.stops.map((s) => P.get(s)).filter(Boolean).map((p) => [p!.lat, p!.lng] as LL));
    else if (st.sel.length) fit(st.sel.map((s) => [P.get(s)!.lat, P.get(s)!.lng] as LL));
  };

  // ---------- верхняя панель ----------
  const chipFilters = $('#m-filters'), chipPlan = $('#m-plan'), chipBuild = $('#m-build'), chipGeo = $('#m-geo'), btnList = $('#m-list');
  const panel = $('#m-filter-panel'), planPanel = $('#m-plan-panel');
  function syncChips() {
    const nf = (st.city !== 'all' ? 1 : 0) + st.layers.size + st.kinds.size;
    const fn = chipFilters.querySelector<HTMLElement>('.mchip__n')!;
    fn.hidden = !nf; fn.textContent = String(nf);
    chipFilters.setAttribute('aria-pressed', String(nf > 0));
    const bn = $('#m-build-n'); bn.hidden = !st.sel.length; bn.textContent = String(st.sel.length);
    chipBuild.setAttribute('aria-pressed', String(st.mode === 'builder'));
    btnList.setAttribute('aria-pressed', String(st.mode === 'list'));
    chipPlan.setAttribute('aria-pressed', String(st.plan));
    panel.querySelectorAll<HTMLElement>('[data-city]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.city === st.city)));
    panel.querySelectorAll<HTMLElement>('[data-layer]').forEach((b) => b.setAttribute('aria-pressed', String(st.layers.has(b.dataset.layer!))));
    panel.querySelectorAll<HTMLElement>('[data-kind]').forEach((b) => b.setAttribute('aria-pressed', String(st.kinds.has(b.dataset.kind!))));
  }
  chipFilters.addEventListener('click', () => {
    const open = panel.hidden;
    panel.hidden = !open; chipFilters.setAttribute('aria-expanded', String(open));
  });
  panel.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('button');
    if (!b) return;
    if (b.dataset.city) {
      st.city = b.dataset.city;
      const pts = data.places.filter((p) => (st.city === 'all' ? p.c !== 'other' : p.c === st.city)).map((p) => [p.lat, p.lng] as LL);
      fit(pts, 14);
    } else if (b.dataset.layer) { const k = b.dataset.layer; st.layers.has(k) ? st.layers.delete(k) : st.layers.add(k); }
    else if (b.dataset.kind) { const k = b.dataset.kind; st.kinds.has(k) ? st.kinds.delete(k) : st.kinds.add(k); }
    else if (b.hasAttribute('data-reset')) { resetFilters(); return; }
    else if (b.hasAttribute('data-done')) { panel.hidden = true; chipFilters.setAttribute('aria-expanded', 'false'); chipFilters.focus(); return; }
    applyFilters();
  });
  const applyFilters = () => { paintMarkers(); syncChips(); if (st.mode === 'list') renderListFoot(); panel.querySelector<HTMLElement>('[data-count]')!.textContent = String(data.places.filter(visible).length); };
  function resetFilters() {
    st.city = 'all'; st.layers.clear(); st.kinds.clear(); st.q = '';
    $<HTMLInputElement>('#m-q').value = '';
    applyFilters();
  }
  const q = $<HTMLInputElement>('#m-q');
  q.addEventListener('input', () => {
    st.q = q.value.trim();
    if (st.q && st.mode !== 'list') { st.back = null; render('list'); } else applyFilters();
  });
  q.closest('form')!.addEventListener('submit', (e) => {
    e.preventDefault();
    const first = data.places.find(visible);
    if (first) { openPlace(first.s); q.blur(); }
  });
  btnList.addEventListener('click', () => { if (st.mode === 'list') closeSheet(); else { st.back = null; render('list'); } });
  chipBuild.addEventListener('click', () => {
    if (st.mode === 'builder') { closeSheet(); return; }
    st.route = null; st.back = null; render('builder'); fitCurrent();
  });
  chipPlan.addEventListener('click', async () => {
    st.plan = !st.plan;
    planPanel.hidden = !st.plan;
    await ready;
    if (map.getLayer('plan')) map.setLayoutProperty('plan', 'visibility', st.plan ? 'visible' : 'none');
    if (st.plan) {
      const b = map.getBounds();
      const c = map.getCenter();
      if (map.getZoom() < 11.5 || !(c.lng > 121.16 && c.lng < 121.33 && c.lat > 38.75 && c.lat < 38.87)) {
        fit([[38.775, 121.18], [38.86, 121.31]], 14);
      }
      void b;
    }
    syncChips();
  });
  const op = $<HTMLInputElement>('#m-plan-op');
  op.addEventListener('input', () => {
    st.planOpacity = Number(op.value) / 100;
    if (map.getLayer('plan')) map.setPaintProperty('plan', 'raster-opacity', st.planOpacity);
  });

  // «Где я»
  let me: any = null;
  chipGeo.addEventListener('click', () => {
    if (!('geolocation' in navigator)) { toast('Браузер не умеет определять местоположение'); return; }
    chipGeo.setAttribute('aria-busy', 'true');
    navigator.geolocation.getCurrentPosition((pos) => {
      chipGeo.removeAttribute('aria-busy');
      const ll: [number, number] = [pos.coords.longitude, pos.coords.latitude];
      if (!me) {
        const el = document.createElement('div');
        el.className = 'mk-me'; el.setAttribute('role', 'img'); el.setAttribute('aria-label', 'Вы здесь');
        me = new ml.Marker({ element: el }).setLngLat(ll).addTo(map);
      } else me.setLngLat(ll);
      map.flyTo({ center: ll, zoom: Math.max(map.getZoom(), 14), padding: padding(), duration: reduce ? 0 : 900 });
    }, () => { chipGeo.removeAttribute('aria-busy'); toast('Не удалось определить местоположение'); }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 });
  });

  // зум (десктоп)
  root.querySelector('[data-zoom="in"]')?.addEventListener('click', () => map.zoomIn());
  root.querySelector('[data-zoom="out"]')?.addEventListener('click', () => map.zoomOut());

  // клик по пустой карте закрывает панель фильтров
  map.on('click', () => { if (!panel.hidden) { panel.hidden = true; chipFilters.setAttribute('aria-expanded', 'false'); } });

  const onKey = (e: KeyboardEvent) => {
    if (e.key !== 'Escape') return;
    if (!panel.hidden) { panel.hidden = true; chipFilters.setAttribute('aria-expanded', 'false'); return; }
    if (!sheet.hidden) closeSheet();
  };
  document.addEventListener('keydown', onKey);

  const fromHash = () => {
    const s = decodeURIComponent(location.hash.slice(1));
    if (s && P.has(s) && s !== st.cur) openPlace(s);
  };
  window.addEventListener('hashchange', fromHash);

  const prev = cleanup;
  cleanup = () => {
    prev?.();
    window.removeEventListener('resize', onResize);
    window.removeEventListener('hashchange', fromHash);
    document.removeEventListener('keydown', onKey);
    mqDesk.removeEventListener('change', onResize);
  };

  // ---------- старт из адреса ----------
  const rParam = params.get('route');
  const ptsParam = (params.get('pts') || '').split(',').map((s) => s.trim()).filter((s) => P.has(s));
  const hash = decodeURIComponent(location.hash.slice(1));
  paintMarkers(); syncChips();
  await ready;
  if (rParam && Rt.has(rParam)) {
    st.route = rParam; render('route'); fitCurrent();
  } else if (ptsParam.length) {
    st.sel = [...new Set(ptsParam)];
    const sp = params.get('start');
    st.start = sp && st.sel.includes(sp) ? sp : null;
    reorder(); render('builder'); fitCurrent();
  } else if (params.has('build')) {
    fit(data.places.filter((p) => p.c === 'lushun').map((p) => [p.lat, p.lng] as LL), 13);
    render('builder');
  } else {
    fit(data.places.filter((p) => p.c !== 'other').map((p) => [p.lat, p.lng] as LL), 13);
  }
  if (hash && P.has(hash)) {
    st.back = null; // открываем место напрямую
    const p = P.get(hash)!;
    if (st.route || st.sel.length) st.back = st.route ? 'route' : 'builder';
    st.cur = hash; render('place');
    map.jumpTo({ center: [p.lng, p.lat], zoom: 15, padding: padding() });
  }
}

export function destroyMapApp() { cleanup?.(); cleanup = null; }
