// Translation must never change routing, geography, relationships or source links.
import fs from 'node:fs';
import { translatedFiles, translationSources } from './translation_sources.mjs';
import { reviewedBaselineStatus } from './translation_workflow.mjs';
const root = new URL('../src/', import.meta.url);
const read = (path) => JSON.parse(fs.readFileSync(new URL(path, root), 'utf8'));
const files = translatedFiles;
const invariant = new Set(['slug', 'series_slug', 'type', 'kind', 'country', 'group', 'city', 'coord_confidence', 'era', 'crop', 'level', 'layer', 'layers', 'season', 'articles', 'people', 'place', 'places', 'books', 'photos', 'cover', 'portrait', 'image', 'file', 'posts', 'review_post', 'tg_ids', 'lat', 'lng', 'polyline']);
const errors = [];
for (const key of ['id', 'section', 'status', 'ref', 'refs', 'checkedAt', 'photo', 'guide', 'original', 'originalLanguage', 'navigationName', 'navigationAddress']) invariant.add(key);
for (const key of ['periods','sourceLanguages','relatedNotes','relatedEssays','relatedPlaces','relatedPeople','relatedSources','weaponSlug','personSlug','shipSlug','profile','countries','updatedAt']) invariant.add(key);
const releases = read('i18n/releases.json');
function compare(original, translated, path, key = '') {
  // Local name aliases have different inflections and counts across languages.
  if (key === 'aliases' && Array.isArray(original)) {
    if (!Array.isArray(translated) || !translated.length || translated.some(value=>typeof value!=='string'||!value.trim()||value.length>90) || new Set(translated).size!==translated.length) errors.push(`${path}: invalid localized aliases`);
    return;
  }
  if (original === null || typeof original !== 'object') {
    if (typeof translated !== typeof original || (original === null && translated !== null)) errors.push(`${path}: changed value type`);
    else if ((typeof original !== 'string' || invariant.has(key) || /^(https?:\/\/|photos\/)/.test(original)) && original !== translated) errors.push(`${path}: changed invariant`);
    else if (typeof original === 'string' && original.trim() && !translated.trim()) errors.push(`${path}: empty translation`);
    else if (typeof original === 'string' && ['year', 'years', 'author_years', 'date'].includes(key)) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(original) && original !== translated) errors.push(`${path}: changed ISO date`);
      // Timeline display dates may say "19th-century 1880s" in Chinese;
      // their separate numeric year is checked as an invariant above.
      if (key === 'date') return;
      // Chinese dates put the year first and spell months as numbers.
      const available = (translated.match(/\d+/g) ?? []).map(Number);
      for (const number of (original.match(/\d+/g) ?? []).map(Number)) {
        const index = available.indexOf(number);
        if (index < 0) errors.push(`${path}: lost date number ${number}`);
        else available.splice(index, 1);
      }
    }
    return;
  }
  if (!translated || typeof translated !== 'object' || Array.isArray(original) !== Array.isArray(translated)) { errors.push(`${path}: changed structure`); return; }
  if (Array.isArray(original) && original.length !== translated.length) errors.push(`${path}: changed array length`);
  if (JSON.stringify(Object.keys(original).sort()) !== JSON.stringify(Object.keys(translated).sort())) errors.push(`${path}: changed fields`);
  for (const k of Object.keys(original)) compare(original[k], translated[k], `${path}.${k}`, Array.isArray(original) ? key : k);
}
for (const language of ['en', 'zh']) {
  if (!releases[language]) continue;
  errors.push(...reviewedBaselineStatus(language).errors);
  try {
    const reviewed = read(`i18n/${language}/source-manifest.json`);
    for (const [file, hash] of Object.entries(translationSources())) {
      if (reviewed[file] !== hash) errors.push(`${language}/${file}: source changed; review translation before publishing`);
    }
  } catch (error) { errors.push(`${language}: missing source review manifest`); }
  for (const file of files) {
    try { compare(read(`data/${file}.json`), read(`i18n/${language}/${file}.json`), `${language}/${file}`); }
    catch (error) { errors.push(`${language}/${file}: ${error.message}`); }
  }
  try {
    const ui = read(`i18n/${language}/ui.json`);
    if (!Object.keys(ui).length || Object.values(ui).some(v => typeof v !== 'string' || !v.trim())) errors.push(`${language}/ui: invalid dictionary`);
    const guides = read(`i18n/${language}/guides.json`);
    for (const slug of ['nikolaevskaya-ploshchad', 'gavan-port-artura', 'ukreplenie-5']) {
      const guide = guides[slug];
      if (!guide?.title || !guide.intro || guide.sections?.length !== 4 || !guide.sections.every(s => s.title && s.paragraphs?.length && s.refs?.length)) errors.push(`${language}/guides: incomplete ${slug}`);
    }
  } catch (error) { errors.push(`${language}: ${error.message}`); }
}
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log(`Published translations verified: ${Object.keys(releases).filter(k => releases[k]).join(', ') || 'none yet'}.`);
