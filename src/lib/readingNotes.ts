import records from '../data/reading_notes.json';
import summaryLimits from '../data/reading_note_limits.json';
export interface ReadingNote {
  slug:string; label:string; aliases:string[]; description:string;
  sources:{title:string;url:string}[];
  relatedNotes:string[]; relatedEssays:string[];
}
export const readingNotes = records as ReadingNote[];
export const readingSummaryLimit = (slug:string) => (summaryLimits as Record<string,number>)[slug]??6;
export const readingNoteIdsFor = (kind:'notes'|'essays',slug:string) => readingNotes
  .filter(note=>(kind==='notes'?note.relatedNotes:note.relatedEssays).includes(slug))
  .map(note=>`term/${note.slug}`);
