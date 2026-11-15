// Semantic tags and reciprocal links must resolve before rendering pages.
import { readFileSync, existsSync } from 'node:fs';
import { validateHardware } from './hardware_validation.mjs';
import { validateFleetOverview } from './fleet_validation.mjs';
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
const editorialPeriods = read('editorial_periods');
const validPeriods = new Set(Object.keys(read('layers')));
if (!editorialPeriods || Array.isArray(editorialPeriods) || typeof editorialPeriods !== 'object') {
  errors.push('editorial_periods: expected an object keyed by article slug');
} else {
  for (const [slug, periods] of Object.entries(editorialPeriods)) {
    if (!maps.articles.has(slug)) errors.push(`editorial_periods/${slug}: unknown article`);
    if (!Array.isArray(periods) || periods.length === 0) {
      errors.push(`editorial_periods/${slug}: expected a nonempty period list`);
      continue;
    }
    if (new Set(periods).size !== periods.length) errors.push(`editorial_periods/${slug}: duplicate period`);
    for (const period of periods) {
      if (!validPeriods.has(period)) errors.push(`editorial_periods/${slug}: unknown period ${String(period)}`);
    }
  }
}
const descriptions = read('reference_descriptions');
const essays = read('essays');
const essaySlugs = new Set();
for (const essay of essays) {
  const name = `essay/${essay.slug}`;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(essay.slug) || essaySlugs.has(essay.slug)) errors.push(`${name}: invalid or duplicate slug`);
  essaySlugs.add(essay.slug);
  for (const field of ['title','dek','perspective']) if (!essay[field]?.trim()) errors.push(`${name}: missing ${field}`);
  if (essay.illustration) {
    const illustration = essay.illustration;
    for (const field of ['alt','caption','credit']) if (!illustration[field]?.trim()) errors.push(`${name}: missing illustration ${field}`);
    if (!/^https:\/\//.test(illustration.sourceUrl)) errors.push(`${name}: missing illustration source URL`);
    if (!/^\/images\/essays\/[a-z0-9-]+\.webp$/.test(illustration.image) || !existsSync(new URL(`../public${illustration.image}`, import.meta.url))) errors.push(`${name}: missing or invalid illustration asset`);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(essay.date)) errors.push(`${name}: invalid publication date`);
  if (!essay.periods?.length || essay.periods.some(k=>!validPeriods.has(k))) errors.push(`${name}: invalid subject periods`);
  if (!essay.sourceLanguages?.length || essay.sourceLanguages.some(k=>!['ru','en','ja','zh'].includes(k))) errors.push(`${name}: invalid source language`);
  const sectionIds=new Set();
  if (!essay.sections?.length || !essay.sources?.length || !essay.limitations?.length) errors.push(`${name}: incomplete sourced essay`);
  for (const section of essay.sections ?? []) {
    if (!/^[a-z][a-z0-9-]*$/.test(section.id) || sectionIds.has(section.id) || ['essay-sources','sources-title','limits-title'].includes(section.id)) errors.push(`${name}: invalid section id`);
    sectionIds.add(section.id);
    if (!section.title?.trim() || !section.paragraphs?.length || section.paragraphs.some(p=>!p.trim())) errors.push(`${name}/${section.id}: missing prose`);
    if (!section.refs?.length || section.refs.some(ref=>!Number.isInteger(ref)||ref<1||ref>essay.sources.length)) errors.push(`${name}/${section.id}: missing source reference`);
  }
  for (const [index,source] of (essay.sources ?? []).entries()) {
    if (source.id!==index+1 || !/^https:\/\//.test(source.url) || !source.title?.trim() || !source.locator?.trim() || !source.note?.trim()) errors.push(`${name}: incomplete or misnumbered source`);
  }
  for (const [field,target] of Object.entries({relatedNotes:maps.articles,relatedPlaces:maps.places,relatedPeople:maps.people,relatedSources:maps.sources})) {
    if (!Array.isArray(essay[field]) || essay[field].some(slug=>!target.has(slug))) errors.push(`${name}: invalid ${field} relationship`);
  }
}
for (const kind of ['people', 'geo']) {
  for (const slug of Object.keys(terms[kind])) {
    if (!descriptions[kind]?.[slug]?.trim()) errors.push(`${kind}/${slug}: missing reference description`);
  }
  for (const slug of Object.keys(descriptions[kind] ?? {})) {
    if (!terms[kind][slug]) errors.push(`${kind}/${slug}: orphan reference description`);
  }
}
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
const reviews = read('guide_evidence');
for (const [slug, review] of Object.entries(reviews)) {
  if (!maps.places.has(slug) || !review.checks?.length || !review.sources?.length) errors.push(`${slug}: incomplete guide review`);
  if (review.sources.some(source => !['primary', 'catalogue', 'field', 'secondary'].includes(source.kind))) errors.push(`${slug}: unknown source kind`);
  if (review.checks.some(check => !['confirmed', 'attributed', 'unresolved'].includes(check.status))) errors.push(`${slug}: unknown evidence status`);
}
for (const [slug, reading] of Object.entries(read('document_readings'))) {
  if (!maps.sources.has(slug) || !maps.places.has(reading.guide)) errors.push(`${slug}: orphan document reading`);
  if (!photoIds.includes(String(reading.photo))) errors.push(`${slug}: unknown document image`);
  if (!reading.original || !reading.translation || !reading.transcriptionNote || !reading.sections?.length) errors.push(`${slug}: incomplete document reading`);
  const sectionIds = reading.sections.map(section => section.id);
  if (new Set(sectionIds).size !== sectionIds.length) errors.push(`${slug}: duplicate document sections`);
}
errors.push(...validateFleetOverview(read('fleet_overview'),read('hardware'),maps.articles));
errors.push(...validateHardware(read('hardware'),{
  assetsExist:file=>existsSync(new URL(`../public${file}`,import.meta.url)),
  people:maps.people,places:maps.places,notes:maps.articles,essays:new Set(essays.map(item=>item.slug)),sources:maps.sources,periods:validPeriods,
}));
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(`Данные: ${data.articles.length} заметка, ${data.people.length} персоны, ${data.books.length} книг, ${data.sources.length} источника, ${photos.length} изображения. Связи и теги корректны.`);
