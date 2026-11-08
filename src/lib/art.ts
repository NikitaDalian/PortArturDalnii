// Иллюстрации, созданные для сайта (public/img/gen) и видеопетли (public/video).
// Только для серверного кода страниц: проверяет наличие файла при сборке.
import fs from 'node:fs';
import path from 'node:path';
import { url } from './data';

const pub = (p: string) => path.join(process.cwd(), 'public', p);

/** Адрес иллюстрации или null, если файла ещё нет. size: 'full' | 1280 | 720 */
export function art(name: string | null | undefined, size: 'full' | 1280 | 720 = 1280): string | null {
  if (!name) return null;
  const file = size === 'full' ? `${name}.webp` : `${name}-${size}.webp`;
  if (fs.existsSync(pub(`img/gen/${file}`))) return url(`/img/gen/${file}`);
  return fs.existsSync(pub(`img/gen/${name}.webp`)) ? url(`/img/gen/${name}.webp`) : null;
}

/** Видеопетля: {webm, mp4} или null */
export function loop(name: string): { webm: string; mp4: string } | null {
  if (!fs.existsSync(pub(`video/${name}.mp4`))) return null;
  return { webm: url(`/video/${name}.webm`), mp4: url(`/video/${name}.mp4`) };
}

export const ROUTE_ART: Record<string, string> = {
  'port-artur-za-den': 'route-port-arthur-day',
  'vostochnyy-front': 'route-east-front',
  'zapadnyy-front': 'route-west-front',
  'progulka-po-lyuyshunyu': 'route-lushun-walk',
  'bayyushan-i-mayak': 'route-baiyushan-lighthouse',
  'russkiy-dalniy-peshkom': 'route-russian-dalny',
  'yaponskiy-dairen': 'route-japanese-dairen',
  'sakura-lushunya': 'route-sakura',
};
export const routeArt = (slug: string, size: 'full' | 1280 | 720 = 720) => art(ROUTE_ART[slug], size);
export const seasonArt = (s: string, size: 'full' | 1280 | 720 = 720) => art(`season-${s}`, size);

/** Подпись-пометка для сгенерированных иллюстраций */
export const AI_NOTE = 'Иллюстрация создана с помощью нейросети';
