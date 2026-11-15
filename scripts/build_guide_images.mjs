import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
const dest = new URL('../public/img/guides/', import.meta.url);
await mkdir(dest, { recursive: true });
for (const name of ['city', 'harbor', 'fort']) {
  const source = new URL(`../../work/guides-art/${name}.png`, import.meta.url);
  for (const width of [1600, 800]) {
    const file = new URL(`${name}${width === 800 ? '-800' : ''}.webp`, dest);
    await sharp(source.pathname.replace(/^\/([A-Z]:)/i, '$1')).resize({ width }).webp({ quality: 84 }).toFile(file.pathname.replace(/^\/([A-Z]:)/i, '$1'));
  }
}
console.log('Prepared six guide illustrations.');
