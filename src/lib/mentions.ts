import { createMentionMatcher } from './mentionMatcher';
export { mentionContext, type MentionContext } from './mentionMatcher';
import { people, places, terms, referenceDescriptions, href, img, imgCrop, photoMeta, referencePhoto, canonicalPersonSlug, bookBySlug, sourceBySlug } from './data';
import aliases from '../data/entity_aliases.json';
import { locale, intlLocale, assetUrl } from '../i18n/locale';
import { hardware, subjectImage } from './hardware';
import { readingNotes } from './readingNotes';
import editorialNotes from '../content-data/telegram-editorial-notes.json';

export interface EntityPreview {
  id: string; kind: 'person' | 'place' | 'ship' | 'weapon' | 'term' | 'book' | 'source'; title: string; description: string;
  href: string; image: string | null; alt: string;
  linkLabel?: string; linkTitle?: string;
  additionalSources?: {title:string;url:string}[];
}
export interface MentionPart { text: string; entity?: EntityPreview }
const registry = new Map<string, EntityPreview>();
export function previewFor(kind:EntityPreview['kind'],slug:string):EntityPreview {
  if (kind === 'term' && Object.hasOwn(editorialNotes,slug)) {
    const note = editorialNotes[slug as keyof typeof editorialNotes];
    return {id:'term/'+slug,kind,title:note.title[locale],description:note.description[locale],
      href:note.source.url,linkLabel:'Источник пояснения',linkTitle:note.source.title,
      additionalSources:'additionalSources' in note ? note.additionalSources : undefined,image:null,alt:''};
  }
  const item = kind === 'book' ? bookBySlug.get(slug) : kind === 'source' ? sourceBySlug.get(slug) : undefined;
  if (item) return {id:kind+'/'+slug, kind, title:item.title, description:excerpt(item.annotation),
    href:kind === 'book' ? href.book(slug) : href.source(slug), image:null, alt:''};
  const key = kind + '/' + (kind === 'person' ? canonicalPersonSlug(slug) : slug);
  const record = registry.get(key);
  if (!record) throw new Error('Unknown footnote reference: ' + key);
  return record;
}
const names = new Map<string, Set<string>>();
const sentence = new Intl.Segmenter(intlLocale, { granularity: 'sentence' });
const excerpt = (text: string) => {
  const first = [...sentence.segment(text)].slice(0, 2).map(s => s.segment).join('').trim();
  if (first.length <= 420) return first;
  const words = [...new Intl.Segmenter(intlLocale, { granularity: 'word' }).segment(first)];
  return words.filter(s => s.index + s.segment.length <= 400).map(s => s.segment).join('').trim() + '…';
};
function addName(name: string, id: string) {
  const value = name.trim();
  if (value.length < 2 || value.length > 90 || !/[\p{L}]/u.test(value) || /[;。！？\n]/.test(value)) return;
  const ids = names.get(value) ?? new Set(); ids.add(id); names.set(value, ids);
}
function register(entity: EntityPreview, extra: string[] = []) {
  registry.set(entity.id, entity);
  [entity.title, entity.title.replace(/\s*\([^)]*\)/g, '').trim(), ...extra].forEach(name => addName(name, entity.id));
}
function surname(name: string) {
  const core = name.replace(/\s*\([^)]*\)/g, '').trim();
  const parts = core.split(locale === 'zh' ? /[·・]/ : /\s+/);
  const value = parts.at(-1) ?? '';
  return parts.length > 1 && value.length >= 3 && !/^[IVX]+$/.test(value) ? value : '';
}
for (const p of people) {
  register({ id: `person/${p.slug}`, kind: 'person', title: p.name, description: excerpt(p.bio || p.role || ''),
    href: href.person(p.slug), image: imgCrop(p.portrait, '4x5', 640), alt: photoMeta(p.portrait || '')?.subject ?? p.name,
  }, [p.short, surname(p.name)].filter(Boolean));
}
for (const p of places) {
  const photo = p.photos?.[0];
  register({ id: `place/${p.slug}`, kind: 'place', title: p.name, description: excerpt(p.summary || ''),
    href: href.place(p.slug), image: imgCrop(photo, '3x2', 640), alt: photoMeta(photo || '')?.subject ?? p.name });
}
for (const kind of ['people', 'geo'] as const) {
  for (const [slug, title] of Object.entries(terms[kind])) {
    const person = kind === 'people';
    if (person && registry.has(`person/${canonicalPersonSlug(slug)}`)) {
      addName(title, `person/${canonicalPersonSlug(slug)}`);
      continue;
    }
    const photo = referencePhoto(kind, slug);
    register({ id: `${person ? 'person' : 'place'}/${slug}`, kind: person ? 'person' : 'place', title,
      description: excerpt(referenceDescriptions[kind][slug]), href: href.reference(kind, slug),
      image: img(photo?.file, 640), alt: photo?.subject ?? '',
    }, person ? [surname(title)] : []);
  }
}
const edition = aliases[locale];
for (const kind of ['people', 'places'] as const) {
  for (const [slug, variants] of Object.entries(edition[kind])) {
    const id = `${kind === 'people' ? 'person' : 'place'}/${kind === 'people' ? canonicalPersonSlug(slug) : slug}`;
    if (!registry.has(id)) throw new Error(`Unknown mention entity: ${id}`);
    variants.forEach(value => addName(value, id));
  }
}
for (const item of hardware) {
  const picture = subjectImage(item);
  register({id:`${item.kind}/${item.slug}`,kind:item.kind,title:item.name,description:excerpt(item.summary),
    href:href.hardware(item.slug),image:picture ? assetUrl(picture.file) : null,alt:picture?.alt??''},[item.shortName,...item.aliases]);
}
for (const note of readingNotes) {
  register({id:`term/${note.slug}`,kind:'term',title:note.label,description:note.description,
    href:note.sources[0].url,image:null,alt:'',linkLabel:'Источник пояснения',linkTitle:note.sources[0].title},note.aliases);
}
// City names, personal names and the title “Цесаревич” need ship context.
// Exact quotes and descriptive aliases such as “броненосец «Победа»” remain eligible.
const ambiguousShips = new Set(['pobeda','poltava','sevastopol','tsesarevich','diana','pallada','borodino','orel','imperator-aleksandr-iii','strashnyi','amur','angara','mongoliya','bureya']);
const contextualNames = new Map<string,Set<string>>();
// These family names alone do not identify one historical person.
for (const [name,ids] of names) if (/^(?:Иванов[а-яё]*|Романов[а-яё]*|Ivanov|Romanov|伊万诺夫|罗曼诺夫)$/u.test(name)) {
  contextualNames.set(name,new Set([...ids].filter(id=>id==='person/ivanov-nikolai'||id==='person/kirill-vladimirovich')));
}
for(const item of hardware.filter(item=>ambiguousShips.has(item.slug))){
  const bare=[item.shortName,...item.aliases.filter(alias=>!/[\s«»"“”]/u.test(alias)&&!/[号號]$/u.test(alias))];
  for(const name of bare){const ids=contextualNames.get(name)??new Set<string>();ids.add(`ship/${item.slug}`);contextualNames.set(name,ids);}
}
// A definition is eligible only in an article explicitly reviewed for that term.
for (const [name,ids] of names) for (const id of ids) if (id.startsWith('term/')) {
  const restricted=contextualNames.get(name)??new Set<string>();restricted.add(id);contextualNames.set(name,restricted);
}
// The hospital ship also sailed under the name Orel. Require a descriptive alias in quotes.
export const linkMentions = createMentionMatcher(names, registry, { quotedEntities:new Set(hardware.filter(item=>item.kind==='ship'&&item.slug!=='orel').map(item=>`ship/${item.slug}`)), contextualNames, annotationEntities:new Set(readingNotes.map(note=>`term/${note.slug}`)) });
