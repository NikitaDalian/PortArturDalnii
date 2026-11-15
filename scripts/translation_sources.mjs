import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
export const translatedFiles = ['articles', 'books', 'people', 'places', 'routes', 'series', 'sources', 'photos', 'seasons', 'index_terms', 'reference_descriptions', 'layers', 'guide_evidence', 'document_readings'];
export function translationSources() {
  const files = [...translatedFiles.map(name => `data/${name}.json`), 'components/places/dossiers.ts'];
  return Object.fromEntries(files.map(file => {
    const text = readFileSync(new URL(`../src/${file}`, import.meta.url), 'utf8').replaceAll('\r\n', '\n');
    return [file, createHash('sha256').update(text).digest('hex')];
  }));
}
