"""Import only Telegram originals referred to by the site's notes.

Run with Python 3.10+ from any directory. Use --check to compare with the
tracked JSON, or repeat --archive to select a different set of export files.
"""

import argparse
import json
import re
from datetime import datetime, timezone
from html import escape
from pathlib import Path
from urllib.parse import urlsplit


SITE = Path(__file__).resolve().parents[1]
WORKSPACE = SITE.parent
CHANNEL_ID = 4318539651
DEFAULT_ARCHIVES = (
    WORKSPACE / 'TGArchive/json/result.json',
    WORKSPACE / '08.11-15.11_posts/result.json',
    WORKSPACE / 'ChatExport_2026-11-21/result.json',
)
ARTICLES = SITE / 'src/data/articles.json'
OUTPUT = SITE / 'src/content-data/telegram-originals.json'
FORMATTING = {
    'bold': ('<b>', '</b>'),
    'italic': ('<i>', '</i>'),
    'underline': ('<u>', '</u>'),
    'strikethrough': ('<s>', '</s>'),
    'code': ('<code>', '</code>'),
    'spoiler': ('<span class="telegram-spoiler">', '</span>'),
}
BARE_LINK = re.compile(r'(?:[^\W_]+(?:-+[^\W_]+)*\.)+[^\W\d_]{2,}(?::[0-9]+)?(?:[/?#].*)?\Z')
PARAGRAPH_BREAK = re.compile(r'\n(?:[ \t]*\n)+')


def read(path):
    return json.loads(path.read_text(encoding='utf-8-sig'))


def iso_date(message):
    local = datetime.fromisoformat(message['date'])
    stamp = message.get('date_unixtime')
    if stamp is not None:
        utc = datetime.fromtimestamp(int(stamp), timezone.utc)
        if local.tzinfo is None:
            offset = local.replace(tzinfo=timezone.utc) - utc
            if offset.total_seconds() % 60:
                raise ValueError(f"Message {message['id']} has a sub-minute timezone offset")
            local = local.replace(tzinfo=timezone(offset))
        elif local != utc:
            raise ValueError(f"Message {message['id']} has inconsistent dates")
    return local.isoformat(timespec='seconds')


def safe_link(entity):
    kind = entity['type']
    url = entity.get('href') if kind == 'text_link' else entity['text']
    if not isinstance(url, str) or any(c.isspace() or ord(c) < 32 or c == '\\' for c in url):
        return None
    if kind == 'link' and BARE_LINK.fullmatch(url):
        # Telegram Desktop's HTML export expands these web addresses to HTTPS.
        url = f'https://{url}'
    try:
        parsed = urlsplit(url)
        if parsed.scheme in ('http', 'https') and parsed.hostname and parsed.username is None:
            return url
    except ValueError:
        pass
    return None


def entities_for(message):
    text = message.get('text', '')
    mixed = [text] if isinstance(text, str) else text
    fallback = [dict(type='plain', text=item) if isinstance(item, str) else item for item in mixed]
    entities = message.get('text_entities', fallback)
    plain = ''.join(item['text'] for item in entities)
    if plain != ''.join(item['text'] for item in fallback):
        raise ValueError(f"Message {message['id']} has inconsistent text and text_entities")
    if not plain.strip():
        raise ValueError(f"Message {message['id']} has no original text")
    return plain, entities


def html_fragment(plain, entities):
    spans = []
    offset = 0
    for entity in entities:
        kind = entity['type']
        opening, closing = FORMATTING.get(kind, ('', ''))
        if kind in ('link', 'text_link') and (href := safe_link(entity)):
            opening = f'<a href="{escape(href, quote=True)}" rel="noopener noreferrer">'
            closing = '</a>'
        end = offset + len(entity['text'])
        if end != offset:
            spans.append((offset, end, opening, closing))
        offset = end

    def paragraph(start, end):
        chunks = []
        for left, right, opening, closing in spans:
            if right <= start or left >= end:
                continue
            piece = escape(plain[max(start, left):min(end, right)], quote=False).replace('\n', '<br>')
            chunks.extend((opening, piece, closing))
        return f'<p>{"".join(chunks)}</p>'

    blocks = []
    start = 0
    for separator in PARAGRAPH_BREAK.finditer(plain):
        blocks.extend((paragraph(start, separator.start()), separator[0]))
        start = separator.end()
    blocks.append(paragraph(start, len(plain)))
    return ''.join(blocks)


def original_for(message):
    plain, entities = entities_for(message)
    original = {'date': iso_date(message), 'html': html_fragment(plain, entities)}
    forwarded = message.get('forwarded_from')
    if isinstance(forwarded, str) and forwarded.strip():
        original['forwardedFrom'] = forwarded
    return original


def revision_time(message, original):
    epoch = message.get('edited_unixtime')
    if epoch is None and not message.get('edited'):
        epoch = message.get('date_unixtime')
    if epoch is not None:
        return int(epoch)
    posted = datetime.fromisoformat(original['date'])
    edited = datetime.fromisoformat(message.get('edited', original['date']))
    if edited.tzinfo is None:
        edited = edited.replace(tzinfo=posted.tzinfo or timezone.utc)
    return edited.timestamp()


def import_originals(archives):
    articles = read(ARTICLES)
    required = {}
    for article in articles:
        for message_id in article['tg_ids']:
            if message_id in required:
                raise ValueError(f"Message {message_id} appears in multiple notes")
            required[message_id] = article['slug']

    selected = {}
    overlaps = {}
    for archive in archives:
        export = read(archive)
        if export.get('id') != CHANNEL_ID or export.get('type') != 'public_channel':
            raise ValueError(f'Unexpected Telegram export: {archive}')
        matched = set()
        for message in export['messages']:
            message_id = message['id']
            if message_id not in required or message['type'] != 'message':
                continue
            if message.get('from_id') != f'channel{CHANNEL_ID}' or message_id in matched:
                raise ValueError(f'{archive}: unexpected sender or duplicate record for {message_id}')
            matched.add(message_id)
            original = original_for(message)
            revision = revision_time(message, original)
            if message_id in selected:
                previous_revision, previous, previous_archive = selected[message_id]
                if original['date'] != previous['date'] or (revision == previous_revision and original != previous):
                    raise ValueError(f'Conflicting versions of message {message_id}: {previous_archive} and {archive}')
                overlaps[message_id] = 'identical' if original == previous else 'latest edit selected'
                if revision <= previous_revision:
                    continue
            selected[message_id] = revision, original, archive
        print(f'{archive.parent.name}/{archive.name}: {len(matched)} matching messages')

    missing = sorted(required.keys() - selected.keys())
    if missing:
        details = ', '.join(f'{message_id} ({required[message_id]})' for message_id in missing)
        raise ValueError(f'Missing originals: {details}')
    for message_id, result in sorted(overlaps.items()):
        print(f'Duplicate export entry {message_id}: {result}')
    print(f'{len(articles)} notes, {len(required)} original messages, no missing IDs.')
    return {str(message_id): selected[message_id][1] for message_id in sorted(required)}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--archive', type=Path, action='append', help='Telegram result.json (repeatable)')
    parser.add_argument('--check', action='store_true', help='compare with the tracked JSON without writing')
    args = parser.parse_args()
    originals = import_originals(args.archive or DEFAULT_ARCHIVES)
    serialized = (json.dumps(originals, ensure_ascii=False, indent=2) + '\n').encode('utf-8')
    if args.check:
        if OUTPUT.read_bytes() != serialized:
            parser.error(f'Generated originals differ from {OUTPUT}')
        print('Tracked originals match the exports.')
        return
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    temporary = OUTPUT.with_suffix('.json.tmp')
    temporary.write_bytes(serialized)
    temporary.replace(OUTPUT)


if __name__ == '__main__':
    main()
