import annotations from '../content-data/telegram-annotations.json';
import articles from '../data/articles.json';

export interface TelegramAnnotation {
  postId:number; quote:string; kind:'person'|'place'|'book'|'source'|'ship'|'weapon'|'term'; slug:string;
}
const postToNote = new Map(articles.flatMap(note => note.tg_ids.map(id => [id,note.slug] as const)));
const byPost = new Map<number,TelegramAnnotation[]>();
const byEntity = new Map<string,Set<string>>();
for (const annotation of annotations as TelegramAnnotation[]) {
  const note = postToNote.get(annotation.postId);
  if (!note || !annotation.quote.trim()) throw new Error('Invalid Telegram annotation: ' + JSON.stringify(annotation));
  const items = byPost.get(annotation.postId) ?? [];
  items.push(annotation);
  byPost.set(annotation.postId, items);
  const key = annotation.kind + '/' + annotation.slug;
  const slugs = byEntity.get(key) ?? new Set<string>();
  slugs.add(note);
  byEntity.set(key,slugs);
}
export const annotationsForPost = (id:number) => byPost.get(id) ?? [];
export const annotatedNoteSlugs = (kind:string,slug:string) => [...(byEntity.get(kind+'/'+slug) ?? [])];
