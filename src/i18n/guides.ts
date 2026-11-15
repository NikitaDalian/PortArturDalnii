import { locale } from './locale';
import type { Dossier } from '../components/places/dossiers';
const editions = import.meta.glob('./*/guides.json', { eager: true, import: 'default' }) as Record<string, Record<string, Dossier>>;
export function localizeGuides(original: Dossier[]): Dossier[] {
  if (locale === 'ru') return original;
  const edition = editions[`./${locale}/guides.json`];
  if (!edition) throw new Error(`Missing guide translations for ${locale}`);
  return original.map((guide) => {
    const translated = edition[guide.place];
    if (!translated) throw new Error(`Missing ${locale} guide: ${guide.place}`);
    return { ...guide, ...translated, place: guide.place, cover: guide.cover,
      notes: guide.notes, people: guide.people, library: guide.library,
      sections: translated.sections.map((section, index) => ({ ...section, id: guide.sections[index].id, refs: guide.sections[index].refs,
        ...(guide.sections[index].figure ? { figure: { ...guide.sections[index].figure!, caption: section.figure!.caption } } : {}),
      })),
      sources: guide.sources.map((source, index) => ({ ...source, title: translated.sources[index].title, note: translated.sources[index].note })),
      related: guide.related.map((item, index) => ({ ...item, label: translated.related[index].label })),
    };
  });
}
