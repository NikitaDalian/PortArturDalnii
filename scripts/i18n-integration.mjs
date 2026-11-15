import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from '@babel/parser';
import MagicString from 'magic-string';
import { translatedFiles } from './translation_sources.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const normalized = (value) => value.replaceAll('\\', '/');
const sourceRoot = normalized(path.join(root, 'src')) + '/';
const translatedData = new Set(translatedFiles);
const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// The original templates are shared by all three builds. Data is selected before
// compilation; UI literals are translated after Astro has compiled templates to JS.
// Walking the syntax tree avoids editing identifiers, expressions, CSS or comments.
export default function i18nIntegration(language) {
  if (language === 'ru') return { name: 'project-i18n', hooks: {} };
  const dictionaryPath = path.join(root, 'src', 'i18n', language, 'ui.json');
  if (!fs.existsSync(dictionaryPath)) throw new Error(`Missing ${language} UI translations`);
  const dictionary = JSON.parse(fs.readFileSync(dictionaryPath, 'utf8'));
  const fragments = Object.fromEntries(Object.entries(dictionary).filter(([key]) => key.trim()).map(([key, value]) => [key.trim(), value.trim()]));
  const keys = Object.keys(fragments).sort((a, b) => b.length - a.length);
  const pattern = new RegExp(keys.map((key) => `${/^[\p{L}\p{N}_]/u.test(key) ? '(?<![\\p{L}\\p{N}_])' : ''}${escapeRegex(key)}${/[\p{L}\p{N}_]$/u.test(key) ? '(?![\\p{L}\\p{N}_])' : ''}`).join('|'), 'gu');
  const translate = (text) => dictionary[text] ?? (fragments[text.trim()] ? text.replace(text.trim(), fragments[text.trim()]) : text.replace(pattern, (match) => fragments[match]));
  return {
    name: 'project-i18n',
    hooks: {
      'astro:config:setup': ({ updateConfig }) => updateConfig({ vite: { plugins: [
        {
          name: 'project-localized-data', enforce: 'pre',
          resolveId(source, importer) {
            if (!importer || !source.endsWith('.json') || !source.startsWith('.')) return;
            const resolved = normalized(path.resolve(path.dirname(importer.split('?')[0]), source));
            if (!resolved.startsWith(sourceRoot + 'data/')) return;
            const name = path.basename(resolved, '.json');
            if (!translatedData.has(name)) return;
            const target = path.join(root, 'src', 'i18n', language, name + '.json');
            if (!fs.existsSync(target)) throw new Error(`Missing ${language} content: ${name}.json`);
            return target;
          },
        },
        {
          name: 'project-localized-ui', enforce: 'post',
          transform(code, id) {
            const clean = normalized(id.split('?')[0]);
            if (!clean.startsWith(sourceRoot) || clean.includes('/i18n/en/') || clean.includes('/i18n/zh/') || clean.endsWith('.json') || /[?&]type=style/.test(id) || !/[А-Яа-яЁё]/.test(code)) return;
            if (!/\.(astro|ts|js)$/.test(clean)) return;
            let ast;
            try { ast = parse(code, { sourceType: 'module', plugins: ['typescript', 'jsx'] }); }
            catch (error) { throw new Error(`Cannot safely localize compiled module ${id}: ${error.message}`); }
            const result = new MagicString(code);
            function visit(node) {
              if (!node || typeof node !== 'object') return;
              if (node.type === 'StringLiteral') {
                const value = translate(node.value);
                if (value !== node.value) result.overwrite(node.start, node.end, JSON.stringify(value));
                return;
              }
              if (node.type === 'TemplateElement') {
                const value = translate(node.value.cooked ?? node.value.raw);
                if (value !== (node.value.cooked ?? node.value.raw)) result.overwrite(node.start, node.end, value.replaceAll('\\', '\\\\').replaceAll('`', '\\`').replaceAll('${', '\\${'));
                return;
              }
              for (const [key, child] of Object.entries(node)) {
                if (['loc', 'extra', 'comments', 'tokens'].includes(key)) continue;
                if (Array.isArray(child)) child.forEach(visit);
                else if (child && typeof child === 'object') visit(child);
              }
            }
            visit(ast);
            return result.hasChanged() ? { code: result.toString(), map: result.generateMap({ hires: true }) } : null;
          },
        },
      ] } }),
    },
  };
}
