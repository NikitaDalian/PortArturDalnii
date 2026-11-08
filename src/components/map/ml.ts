// Загрузка MapLibre GL по требованию (тяжёлая библиотека — только на страницах с картой).
import 'maplibre-gl/dist/maplibre-gl.css';
// @ts-ignore — Vite отдаёт адрес файла воркера
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';

let mod: Promise<typeof import('maplibre-gl')> | null = null;
export function loadMapLibre() {
  if (!mod) {
    mod = import('maplibre-gl').then((m) => {
      try { m.setWorkerUrl(new URL(workerUrl, location.href).href); } catch { /* старые версии */ }
      return m;
    });
  }
  return mod;
}

export const webglOk = () => {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch { return false; }
};
