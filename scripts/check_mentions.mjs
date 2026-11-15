import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createMentionMatcher, mentionContext } from '../src/lib/mentionMatcher.ts';
const registry = new Map(['person/a', 'person/b', 'person/witte', 'person/artur', 'place/port-artur', 'place/dalnii'].map(id => [id, { id }]));
const names = new Map([
  ['Безобразов', new Set(['person/a', 'person/b'])], ['Витте', new Set(['person/witte'])],
  ['Port Arthur', new Set(['place/port-artur'])], ['Arthur', new Set(['person/artur'])],
  ['Дальнего', new Set(['place/dalnii'])], ['维特', new Set(['person/witte'])],
]);
const match = createMentionMatcher(names, registry);
const links = parts => parts.filter(p => p.entity).map(p => p.entity.id);
assert.deepEqual(links(match('Безобразов встретил Витте.')), ['person/witte']);
assert.deepEqual(links(match('Безобразов', mentionContext([], ['person/b']))), ['person/b']);
assert.deepEqual(links(match('Витте, Витте.', mentionContext(['person/witte']))), []);
assert.deepEqual(links(match('Витте, Витте.')), ['person/witte']);
assert.deepEqual(links(match('Книга «Port Arthur» и Port Arthur.')), ['place/port-artur']);
assert.deepEqual(links(match('Port Arthur and Arthur.')), ['place/port-artur', 'person/artur']);
assert.deepEqual(links(match('Дальнего Востока и Дальнего.')), ['place/dalnii']);
assert.deepEqual(links(match('维特参与城市建设。')), ['person/witte']);
assert.deepEqual(links(match('SuperArthurian')), []);
for (const text of ['Витте и Безобразов; Port Arthur.', '«维特»与维特。', 'Дальнего Востока — Дальнего.', 'No matching words.']) {
  assert.equal(match(text).map(p => p.text).join(''), text, 'Linking must preserve the exact original text');
}
const read = name => JSON.parse(readFileSync(new URL(`../src/data/${name}.json`, import.meta.url), 'utf8'));
const shipRegistry = new Map(['ship/mikasa','ship/petropavlovsk','place/petropavlovsk'].map(id=>[id,{id}]));
const shipNames = new Map([['Микаса',new Set(['ship/mikasa'])],['Mikasa',new Set(['ship/mikasa'])],['三笠',new Set(['ship/mikasa'])],['Петропавловск',new Set(['ship/petropavlovsk','place/petropavlovsk'])]]);
const shipMatch=createMentionMatcher(shipNames,shipRegistry,{quotedEntities:new Set(['ship/mikasa','ship/petropavlovsk'])});
assert.deepEqual(links(shipMatch('Броненосец «Микаса» вышел в море.')),['ship/mikasa']);
assert.deepEqual(links(shipMatch('Книга «Микаса» лежала на столе.')),[]);
assert.deepEqual(links(shipMatch('The novel "Mikasa" and the ship "Mikasa".')),['ship/mikasa']);
assert.deepEqual(links(shipMatch('«Микаса вышла в море» — цитата.')),[]);
assert.deepEqual(links(shipMatch('“三笠”号与三笠。')),['ship/mikasa']);
assert.deepEqual(links(shipMatch('Петропавловск')),[],'Unquoted city/ship ambiguity is not guessed');
assert.deepEqual(links(shipMatch('Броненосец «Петропавловск»')),['ship/petropavlovsk']);
assert.deepEqual(links(shipMatch('Микаса',mentionContext(['ship/mikasa']))),[]);
for(const text of ['«Микаса», корабль «Петропавловск».','“三笠”号与三笠。','Книга «Микаса».'])assert.equal(shipMatch(text).map(p=>p.text).join(''),text);
const victoryNames=new Map([['Победа',new Set(['ship/pobeda'])],['броненосец «Победа»',new Set(['ship/pobeda'])]]);
const victoryMatch=createMentionMatcher(victoryNames,new Map([['ship/pobeda',{id:'ship/pobeda'}]]),{quotedEntities:new Set(['ship/pobeda']),contextualNames:new Map([['Победа',new Set(['ship/pobeda'])]])});
assert.deepEqual(links(victoryMatch('Победа досталась дорого.')),[],'Ordinary victory is not a ship');
assert.deepEqual(links(victoryMatch('«Победа» вышла в море.')),['ship/pobeda']);
assert.deepEqual(links(victoryMatch('В море вышел броненосец «Победа».')),['ship/pobeda']);
assert.deepEqual(links(victoryMatch('Победа',mentionContext([],['ship/pobeda']))),['ship/pobeda']);
const aliases = read('entity_aliases'); const terms = read('index_terms');
const valid = {
  people: new Set([...read('people').map(p => p.slug), ...Object.keys(terms.people)]),
  places: new Set([...read('places').map(p => p.slug), ...Object.keys(terms.geo)]),
};
for (const language of ['ru', 'en', 'zh']) for (const kind of ['people', 'places']) {
  assert.deepEqual(new Set(Object.keys(aliases[language][kind])), valid[kind], `${language}/${kind}: entity coverage`);
  for (const values of Object.values(aliases[language][kind])) for (const value of values) {
    assert.ok(typeof value === 'string' && value.trim().length >= 2 && value.length <= 90 && /\p{L}/u.test(value), `Invalid alias: ${value}`);
  }
}
const media = read('reference_media');
const photos = new Set(read('photos').map(p => p.file));
for (const kind of ['people', 'geo']) for (const [slug, file] of Object.entries(media[kind])) {
  assert.ok(slug in terms[kind], `Unknown reference image entity: ${kind}/${slug}`);
  assert.ok(photos.has(file), `Unknown reference image: ${file}`);
}
console.log('Mention matching: text preservation, ambiguity, self-links, repetition, quotations, CJK, alias coverage and reference images verified.');
