export function formatTime(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

let idCounter = 0;

/** מזהה ייחודי קצר — מבוסס זמן + מונה, ללא תלות חיצונית */
export function newId(prefix: string): string {
  idCounter = (idCounter + 1) % 10000;
  return `${prefix}_${Date.now().toString(36)}_${idCounter}`;
}
