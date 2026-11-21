import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.resolve(root, process.argv[2] || 'dist');
mkdirSync(path.join(root, '.astro', 'empty-public'), { recursive: true });
function run(script, args, language) {
  const result = spawnSync(process.execPath, ['--preserve-symlinks', '--preserve-symlinks-main', path.join(root, script), ...args], {
    cwd: root, stdio: 'inherit', env: { ...process.env, ASTRO_TELEMETRY_DISABLED: '1', PUBLIC_SITE_LANG: language },
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
const releases = JSON.parse(readFileSync(path.join(root, 'src/i18n/releases.json'), 'utf8'));
const editions = ['ru', ...['en', 'zh'].filter(language => releases[language])];
for (const language of editions) {
  const destination = language === 'ru' ? output : path.join(output, language);
  run('node_modules/astro/bin/astro.mjs', ['build', '--outDir', destination], language);
  // Index each language immediately, before the following locale is copied in.
  run('node_modules/pagefind/lib/runner/bin.cjs', ['--site', destination], language);
}
// Use the canonical URLs emitted by the templates, including the project base
// and language prefix. The redirect pages point at their canonical target.
const canonicalUrls = new Set();
for (const entry of readdirSync(output, {recursive:true, withFileTypes:true})) {
  if (!entry.isFile() || entry.name !== 'index.html') continue;
  const html = readFileSync(path.join(entry.parentPath,entry.name),'utf8');
  if (/<meta\b[^>]*(?:http-equiv="refresh"|content="[^"]*noindex)/i.test(html)) continue;
  const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
  if (canonical) canonicalUrls.add(canonical);
}
if (!canonicalUrls.size) throw new Error('Build contains no canonical pages');
const entries = [...canonicalUrls].sort().map(url => '  <url><loc>' + url + '</loc></url>');
writeFileSync(path.join(output,'sitemap.xml'), [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">', ...entries, '</urlset>', '',
].join('\n'));
console.log(`Built ${editions.join(', ')} in ${output}`);
