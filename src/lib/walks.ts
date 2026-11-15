import data from '../data/walk_guides.json';
import type { Route } from './data';

export interface WalkStop {
  place: string;
  navigationName: string;
  navigationAddress: string;
  nextLeg: string;
}
export interface WalkGuide {
  checkedAt: string;
  start: string;
  finish: string;
  walkingMinutes: [number, number];
  visitMinutes: [number, number];
  distanceNote: string;
  access: string;
  stops: WalkStop[];
  sources: { title: string; url: string; note: string }[];
}
export function walkGuide(route: Route): WalkGuide | undefined {
  const guide = (data as Record<string, WalkGuide>)[route.slug];
  if (!guide) return undefined;
  if (route.transport !== 'walk' || guide.stops.length !== route.stops.length ||
      guide.stops.some((stop, i) => stop.place !== route.stops[i].place)) {
    throw new Error(`Walking guide does not match route: ${route.slug}`);
  }
  for (const range of [guide.walkingMinutes, guide.visitMinutes]) {
    if (range.length !== 2 || range.some(n => !Number.isFinite(n) || n < 0) || range[0] > range[1]) {
      throw new Error(`Invalid walking guide time estimate: ${route.slug}`);
    }
  }
  return guide;
}
