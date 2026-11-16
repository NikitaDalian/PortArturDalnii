import type { Hardware } from './hardware';
import records from '../data/ship_features.json';
import { fleetOverview } from './fleet';

/** Positions are percentages of the exact attributed photograph, never geographic coordinates. */
export interface ShipFeature {
  id: string; label: string; x: number; y: number; text: string;
  weaponSlug: string | null; refs: number[]; sourceUrls?: string[];
}
export interface ShipFeatures { shipSlug: string; period: string; photoFile?:string; features: ShipFeature[] }
export const shipFeatures = records as ShipFeatures[];
export const shipFeaturesBySlug = new Map(shipFeatures.map(record=>[record.shipSlug,record]));
export function validShipFeatures(ship: Hardware, record?: ShipFeatures): ShipFeatures | undefined {
  if (!record || ship.kind !== 'ship' || record.shipSlug !== ship.slug) return undefined;
  if(!ship.images.some(image=>image.file===record.photoFile))throw new Error(`Unknown annotation photograph: ${ship.slug}`);
  const sourceIds = new Set(ship.sources.map(source => source.id));
  const imageUrls = new Set([...ship.images.map(picture => picture.sourceUrl),...(fleetOverview.ships.find(row=>row.shipSlug===ship.slug)?.illustration.sourceUrls??[])]);
  const ids = new Set<string>();
  const features = record.features.filter(feature => {
    if (!feature.id || ids.has(feature.id) || !feature.label || !feature.text ||
      !Number.isFinite(feature.x) || !Number.isFinite(feature.y) ||
      feature.x < 0 || feature.x > 100 || feature.y < 0 || feature.y > 100 ||
      (!feature.refs.length && !feature.sourceUrls?.length) || !feature.refs.every(ref => sourceIds.has(ref)) ||
      (feature.sourceUrls?.some(url => !/^https:\/\//.test(url) || !imageUrls.has(url))) ||
      (feature.weaponSlug && !ship.armament.some(gun => gun.weaponSlug === feature.weaponSlug))) return false;
    ids.add(feature.id); return true;
  });
  if(features.length!==record.features.length)throw new Error(`Invalid ship explorer data: ${ship.slug}`);
  return features.length ? { ...record, features } : undefined;
}
