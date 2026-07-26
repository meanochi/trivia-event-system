import { openDB, type IDBPDatabase } from 'idb';
import type { ContentState, GameState } from './types';

/**
 * שכבת האחסון — IndexedDB.
 * שלושה מחסנים: kv (מצב משחק + היסטוריה), content (שחקנים ושאלות), images (תמונות כ-Blobs).
 */

const DB_NAME = 'funkt-farkert';
const KV = 'kv';
const CONTENT = 'content';
const IMAGES = 'images';

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, 1, {
      upgrade(db) {
        db.createObjectStore(KV);
        db.createObjectStore(CONTENT);
        db.createObjectStore(IMAGES);
      },
    });
  }
  return dbPromise;
}

export interface PersistedGame {
  state: GameState;
  history: GameState[];
}

export async function loadGame(): Promise<PersistedGame | null> {
  try {
    const db = await getDb();
    return ((await db.get(KV, 'game')) as PersistedGame | undefined) ?? null;
  } catch {
    return null;
  }
}

export async function saveGame(data: PersistedGame): Promise<void> {
  try {
    const db = await getDb();
    await db.put(KV, data, 'game');
  } catch {
    // כשל שמירה אינו עוצר את המשחק
  }
}

export async function clearGame(): Promise<void> {
  try {
    const db = await getDb();
    await db.delete(KV, 'game');
  } catch {
    // התעלמות
  }
}

export async function loadContent(): Promise<ContentState | null> {
  try {
    const db = await getDb();
    return ((await db.get(CONTENT, 'content')) as ContentState | undefined) ?? null;
  } catch {
    return null;
  }
}

export async function saveContent(content: ContentState): Promise<void> {
  try {
    const db = await getDb();
    await db.put(CONTENT, content, 'content');
  } catch {
    // התעלמות
  }
}

export async function saveImage(id: string, blob: Blob): Promise<void> {
  const db = await getDb();
  await db.put(IMAGES, blob, id);
}

export async function loadImage(id: string): Promise<Blob | null> {
  try {
    const db = await getDb();
    return ((await db.get(IMAGES, id)) as Blob | undefined) ?? null;
  } catch {
    return null;
  }
}

export async function deleteImage(id: string): Promise<void> {
  try {
    const db = await getDb();
    await db.delete(IMAGES, id);
  } catch {
    // התעלמות
  }
}
