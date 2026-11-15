import { createMentionMatcher } from './mentionMatcher';
export { mentionContext, type MentionContext } from './mentionMatcher';
import { people, places, terms, referenceDescriptions, href, img, imgCrop, photoMeta, referencePhoto } from './data';
import aliases from '../data/entity_aliases.json';
import { locale, intlLocale } from '../i18n/locale';

export interface EntityPreview {
  id: string; kind: 'person' | 'place'; title: string; description: string;
  href: string; image: string | null; alt: string;
}
export interface MentionPart { text: string; entity?: EntityPreview }
const registry = new Map<string, EntityPreview>();
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
    const id = `${kind === 'people' ? 'person' : 'place'}/${slug}`;
    if (!registry.has(id)) throw new Error(`Unknown mention entity: ${id}`);
    variants.forEach(value => addName(value, id));
  }
}
export const linkMentions = createMentionMatcher(names, registry);
