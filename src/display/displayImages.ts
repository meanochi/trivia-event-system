import { useEffect, useState } from 'react';
import type { SyncMessage } from '../core/types';
import { loadImage } from '../core/db';

/**
 * טעינת תמונות במסך הקהל — בשני מסלולים:
 * 1. ישירות מ-IndexedDB (אותו origin).
 * 2. גיבוי: בקשה מחלון האדמין דרך ערוץ הסנכרון (IMAGE_REQUEST → IMAGE).
 * המסלול הכפול פותר סביבות שבהן קריאת Blobs בין חלונות נכשלת.
 */

const cache = new Map<string, string>();
const waiters = new Map<string, Set<(url: string) => void>>();

const channel = new BroadcastChannel('funkt-farkert-sync');
channel.addEventListener('message', (e: MessageEvent<SyncMessage>) => {
  if (e.data?.type !== 'IMAGE') return;
  const { id, blob } = e.data;
  if (cache.has(id)) return;
  const url = URL.createObjectURL(blob);
  cache.set(id, url);
  waiters.get(id)?.forEach((w) => w(url));
  waiters.delete(id);
});

export function requestImageFromAdmin(id: string): void {
  channel.postMessage({ type: 'IMAGE_REQUEST', id } satisfies SyncMessage);
}

export function useDisplayImage(id: string | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(id ? (cache.get(id) ?? null) : null);

  useEffect(() => {
    if (!id) {
      setUrl(null);
      return;
    }
    const cached = cache.get(id);
    if (cached) {
      setUrl(cached);
      return;
    }
    let alive = true;
    setUrl(null);

    const onReady = (u: string) => {
      if (alive) setUrl(u);
    };
    if (!waiters.has(id)) waiters.set(id, new Set());
    waiters.get(id)!.add(onReady);

    // מסלול 1: קריאה ישירה; אם נכשלת — מסלול 2: בקשה מהאדמין
    void loadImage(id)
      .then((blob) => {
        if (!alive || cache.has(id)) return;
        if (blob) {
          const u = URL.createObjectURL(blob);
          cache.set(id, u);
          waiters.get(id)?.forEach((w) => w(u));
          waiters.delete(id);
        } else {
          requestImageFromAdmin(id);
        }
      })
      .catch(() => requestImageFromAdmin(id));

    return () => {
      alive = false;
      waiters.get(id)?.delete(onReady);
    };
  }, [id]);

  return url;
}
