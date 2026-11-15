// Run only after reviewing a locale against the latest Russian source.
import { writeFileSync } from 'node:fs';
import { translationSources } from './translation_sources.mjs';
const language = process.argv[2];
if (!['en', 'zh'].includes(language)) throw new Error('Usage: node scripts/mark_translation_reviewed.mjs en|zh');
writeFileSync(new URL(`../src/i18n/${language}/source-manifest.json`, import.meta.url), JSON.stringify(translationSources(), null, 2) + '\n');
console.log(`${language}: source revision recorded after editorial review.`);
