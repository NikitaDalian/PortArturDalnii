// Semantic tags and reciprocal links must resolve before rendering pages.
import { readFileSync } from 'node:fs';
const read = (name) => JSON.parse(readFileSync(new URL(`../src/data/${name}.json`, import.meta.url), 'utf8'));
const names = ['articles', 'people', 'places', 'books', 'sources', 'series'];
const data = Object.fromEntries(names.map((name) => [name, read(name)]));
const maps = Object.fromEntries(names.map((name) => [name, new Map(data[name].map((x) => [x.slug, x]))]));
const terms = read('index_terms');
const photos = read('photos');
const photoFiles = new Set(photos.map((p) => p.file));
const photoIds = photos.map((p) => p.file.match(/photo_(\d+)@/)?.[1]);
const known = {
  people: new Set([...maps.people.keys(), ...Object.keys(terms.people)]),
  places: new Set([...maps.places.keys(), ...Object.keys(terms.geo)]),
  books: new Set([...maps.books.keys(), ...maps.sources.keys(), ...Object.keys(terms.books_unmatched)]),
};
const errors = [];
for (const name of names) {
  if (maps[name].size !== data[name].length) errors.push(`${name}: duplicate slug`);
}
if (photoFiles.size !== photos.length || new Set(photoIds).size !== photos.length) errors.push('Duplicate photo file/id');
const tgIds = data.articles.flatMap((a) => a.tg_ids);
if (new Set(tgIds).size !== tgIds.length) errors.push('Telegram post imported more than once');
for (const a of data.articles) {
  for (const field of ['people', 'places', 'books']) {
    for (const slug of a[field]) {
      if (!known[field].has(slug)) errors.push(`${a.slug}: unknown ${field} tag ${slug}`);
      const target = maps[field].get(slug) ?? (field === 'books' ? maps.sources.get(slug) : null);
      if (target && !target.articles.includes(a.slug)) errors.push(`${a.slug}: missing backlink on ${slug}`);
    }
  }
  if (a.series_slug && !maps.series.get(a.series_slug)?.articles.includes(a.slug)) errors.push(`${a.slug}: missing series membership`);
}
for (const name of ['people', 'places', 'books', 'sources', 'series']) {
  for (const item of data[name]) {
    for (const slug of item.articles ?? []) {
      if (!maps.articles.has(slug)) errors.push(`${item.slug}: unknown note ${slug}`);
      if (name === 'series' && maps.articles.get(slug)?.series_slug !== item.slug) errors.push(`${item.slug}: inconsistent series ${slug}`);
    }
  }
}
for (const item of [...data.articles, ...data.people, ...data.places, ...data.books, ...data.sources, ...read('routes')]) {
  for (const field of ['photos', 'cover', 'portrait', 'image']) {
    const files = Array.isArray(item[field]) ? item[field] : [item[field]];
    for (const file of files) if (file && !photoFiles.has(file)) errors.push(`${item.slug}: unknown photo ${file}`);
  }
}
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(`Данные: ${data.articles.length} заметка, ${data.people.length} персоны, ${data.books.length} книг, ${data.sources.length} источника, ${photos.length} изображения. Связи и теги корректны.`);
