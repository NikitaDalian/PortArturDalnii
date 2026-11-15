import data from '../data/fleet_overview.json';
import type { Hardware } from './hardware';
export interface FleetMeasurement {
  shipSlug:string;
  group:'port-arthur'|'chemulpo'|'japanese';
  profile:'battleship'|'armored-cruiser'|'protected-cruiser';
  lengthOverallM:number|null;
  normalDisplacementTonnes:number|null;
  measurementNote:string;
  sources:{url:string;title:string;locator:string}[];
}
export interface FleetOverview {
  title:string; dek:string; intro:string[];
  sections:Hardware['sections']; relatedNotes:string[]; sources:Hardware['sources'];
  ships:FleetMeasurement[];
}
export const fleetOverview = data as FleetOverview;
