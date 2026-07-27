import { useEffect, useReducer } from 'react';
import type { SyncMessage } from '../core/types';
import { loadImage } from '../core/db';

/**
 * טעינת תמונות במסך הקהל — בשני מסלולים:
 * 1. ישירות מ-IndexedDB (אותו origin).
 * 2. גיבוי אמין: בקשה מהאדמין דרך ערוץ הסנכרון; התשובה חוזרת כ-data URL
 *    (מחרוזת base64) שעוברת בכל סביבה, בלי תלות בשיתוף Blobs בין חלונות.
 * תמונה שנכשלת ברינדור מסולקת מהמטמון ונטענת מחדש מהאדמין.
 */

const cache = new Map<string, string>();
const pending = new Set<string>();
const listeners = new Map<string, Set<() => void>>();

function notify(id: string): void {
  listeners.get(id)?.forEach((fn) => fn());
}

function setCached(id: string, url: string): void {
  const old = cache.get(id);
  if (old?.startsWith('blob:')) URL.revokeObjectURL(old);
  cache.set(id, url);
  pending.delete(id);
  notify(id);
}

const channel = new BroadcastChannel('funkt-farkert-sync');
channel.addEventListener('message', (e: MessageEvent<SyncMessage>) => {
  if (e.data?.type !== 'IMAGE') return;
  // תשובת האדמין תמיד גוברת — גם אם יש כבר משהו במטמון (אולי שבור)
  setCached(e.data.id, e.data.dataUrl);
});

export function requestImageFromAdmin(id: string): void {
  channel.postMessage({ type: 'IMAGE_REQUEST', id } satisfies SyncMessage);
}

/** תמונה שנכשלה ברינדור: סילוק מהמטמון ובקשה מחודשת מהאדמין */
export function reportBrokenImage(id: string): void {
  const old = cache.get(id);
  if (old?.startsWith('blob:')) URL.revokeObjectURL(old);
  cache.delete(id);
  notify(id);
  requestImageFromAdmin(id);
}

function startLoading(id: string): void {
  if (cache.has(id) || pending.has(id)) return;
  pending.add(id);
  void loadImage(id)
    .then((blob) => {
      if (cache.has(id)) return;
      if (blob) {
        setCached(id, URL.createObjectURL(blob));
      } else {
        requestImageFromAdmin(id);
      }
    })
    .catch(() => requestImageFromAdmin(id));
}

export function useDisplayImage(id: string | null | undefined): string | null {
  const [, rerender] = useReducer((x: number) => x + 1, 0);

  useEffect(() => {
    if (!id) return;
    if (!listeners.has(id)) listeners.set(id, new Set());
    listeners.get(id)!.add(rerender);
    startLoading(id);
    return () => {
      listeners.get(id)?.delete(rerender);
    };
  }, [id]);

  return id ? (cache.get(id) ?? null) : null;
}
