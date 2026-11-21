import { annotationsForPost } from './telegramAnnotations';
import { previewFor, type EntityPreview } from './mentions';

const textHtml = (s:string) => s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const attr = (s:string) => textHtml(s).replaceAll('"','&quot;');
interface Match {start:number; end:number; entity:EntityPreview}

// The importer emits only allowlisted tags and escaped text. Match a reviewed
// phrase within one text node and leave author links and their attributes intact.
export function annotatedTelegramText(post:{id:number; html:string}, label:string, startNumber:number) {
  const annotations = annotationsForPost(post.id);
  const matches:Match[] = [];
  for (const note of annotations) {
    const needle = textHtml(note.quote);
    const hits:number[] = [];
    let protectedText = false;
    for (const token of post.html.matchAll(/<[^>]*>|[^<]+/g)) {
      const value = token[0];
      if (value.startsWith('<')) {
        if (/^<(a|code)\b/.test(value)) protectedText = true;
        if (/^<\/(a|code)>/.test(value)) protectedText = false;
      } else if (!protectedText) {
        for (let i=value.indexOf(needle); i!==-1; i=value.indexOf(needle,i+needle.length)) hits.push(token.index! + i);
      }
    }
    if (hits.length !== 1) throw new Error(`Post ${post.id}: expected one unlinked occurrence of "${note.quote}", found ${hits.length}`);
    matches.push({start:hits[0], end:hits[0]+needle.length, entity:previewFor(note.kind,note.slug)});
  }
  matches.sort((a,b) => a.start-b.start);
  let html = '', cursor = 0;
  const notes = matches.map((match,i) => {
    if (match.start < cursor) throw new Error('Overlapping Telegram footnotes in post ' + post.id);
    const number = startNumber + i, id = 'fn-' + post.id + '-' + match.entity.id.replace('/','-');
    const phrase = post.html.slice(match.start,match.end);
    html += post.html.slice(cursor,match.start) + `<a id="ref-${id}" class="note-ref" data-footnote="${number}" href="#${id}" aria-label="${phrase.replaceAll('"','&quot;')} (${attr(label)} ${number})">${phrase}</a>`;
    cursor = match.end;
    return { id, number, entity:match.entity };
  });
  return { html:html+post.html.slice(cursor), notes };
}
