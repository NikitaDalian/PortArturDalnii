import reviews from '../data/guide_evidence.json';
import readings from '../data/document_readings.json';

export interface SourceAssessment {
  ref: number;
  url: string;
  kind: 'primary' | 'catalogue' | 'field' | 'secondary';
  locator: string;
  inspection: string;
  note: string;
  rights?: string;
}
export interface GuideReview {
  checkedAt: string;
  editor: string;
  scope: string;
  checks: { id: string; section: string; title: string; finding: string; status: 'confirmed' | 'attributed' | 'unresolved'; refs: number[] }[];
  sources: SourceAssessment[];
  revisions: { date: string; note: string }[];
}
export interface DocumentReading {
  title: string;
  intro: string;
  checkedAt: string;
  photo: number;
  caption: string;
  original: string;
  originalLanguage: string;
  translation: string;
  transcriptionNote: string;
  sections: { id: string; title: string; paragraphs: string[]; refs: number[] }[];
  sources: { title: string; url: string; locator: string; note: string }[];
  guide: string;
  rights: string;
}
export const guideReview = (slug: string) => (reviews as Record<string, GuideReview>)[slug];
export const documentReading = (slug: string) => (readings as Record<string, DocumentReading>)[slug];

/** Fail the build if a review points at a removed section or a renumbered source. */
export function validateReview(review: GuideReview, guide: { sections: { id: string }[]; sources: { url: string }[] }) {
  const refs = (values: number[]) => values.length > 0 && values.every(n => Number.isInteger(n) && n >= 1 && n <= guide.sources.length);
  const sections = new Set(guide.sections.map(section => section.id));
  const ids = review.checks.map(check => check.id);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(review.checkedAt) || !review.scope || !review.checks.length || new Set(ids).size !== ids.length) throw new Error('Incomplete source review');
  for (const check of review.checks) {
    if (!sections.has(check.section) || !refs(check.refs) || !check.title || !check.finding) throw new Error(`Invalid evidence reference: ${check.id}`);
  }
  for (const source of review.sources) {
    if (!refs([source.ref]) || !source.inspection || source.url !== guide.sources[source.ref - 1].url) throw new Error(`Invalid or renumbered source assessment: ${source.ref}`);
  }
}
