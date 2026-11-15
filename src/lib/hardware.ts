import records from '../data/hardware.json';
import { href } from './data';

export interface HardwareImage {
  file: string; alt: string; caption: string; credit: string;
  sourceUrl: string; license: string; width: number; height: number;
}
export interface Hardware {
  slug: string; kind: 'ship' | 'weapon'; name: string; shortName: string; category: string;
  countries: string[]; periods: string[]; aliases: string[]; summary: string; intro: string[];
  sections: { id: string; title: string; paragraphs: string[]; refs: number[] }[];
  specifications: { label: string; value: string; note: string; refs: number[] }[];
  timeline: { year: number; date: string; title: string; text: string; refs: number[] }[];
  crew: { name: string; role: string; personSlug: string | null; refs: number[] }[];
  armament: { weaponSlug: string; count: number | null; period: string; note: string; refs: number[] }[];
  images: HardwareImage[];
  relatedNotes: string[]; relatedEssays: string[]; relatedPeople: string[]; relatedPlaces: string[]; relatedSources: string[];
  sources: { id: number; title: string; author: string; date: string; url: string; locator: string; note: string }[];
  limitations: string[]; updatedAt: string;
}
export const hardware = records as Hardware[];
export const hardwareBySlug = new Map(hardware.map(item => [item.slug, item]));
export const hardwareKind = (kind: Hardware['kind']) => kind === 'ship' ? 'Корабли' : 'Вооружение';
export type HardwareRelation = 'notes' | 'essays' | 'people' | 'places' | 'library' | 'periods';
const relations = { notes:'relatedNotes', essays:'relatedEssays', people:'relatedPeople', places:'relatedPlaces', library:'relatedSources', periods:'periods' } as const;
// One stored relationship, two directions. Never derive ship map points from places.
export const hardwareFor = (kind: HardwareRelation, slug: string) => hardware.filter(item =>
  item[relations[kind]].includes(slug) || (kind === 'people' && item.crew.some(member => member.personSlug === slug)));
export const hardwareLinks = (kind: HardwareRelation, slug: string) => hardwareFor(kind, slug).map(item => ({ title:item.name, url:href.hardware(item.slug) }));
export const shipsUsing = (slug: string) => hardware.filter(item => item.kind === 'ship' && item.armament.some(gun => gun.weaponSlug === slug));
