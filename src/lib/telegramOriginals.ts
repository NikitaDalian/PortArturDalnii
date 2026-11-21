import archive from '../content-data/telegram-originals.json';

interface TelegramOriginal {
  date: string;
  html: string;
  forwardedFrom?: string;
}
export function originalsFor(ids: number[]) {
  return ids.map(id => {
    const original = (archive as Record<string, TelegramOriginal>)[id];
    if (!original) throw new Error(`Missing Telegram original for post ${id}`);
    return { id, ...original };
  });
}
