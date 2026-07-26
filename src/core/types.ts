/**
 * מודל הנתונים המלא של פונקט פארקערט.
 * מקור האמת: docs/SPEC.html גרסה 1.2.
 */

// ===== תוכן (מנוהל במסכי העריכה, לא חלק מהיסטוריית ה-Undo) =====

export interface Player {
  id: string;
  name: string;
  /** קבוצת שלב א' (1–4), null אם טרם שובץ */
  groupId: GroupId | null;
}

export type GroupId = 'g1' | 'g2' | 'g3' | 'g4';

export const GROUP_IDS: GroupId[] = ['g1', 'g2', 'g3', 'g4'];

export type QuestionKind = 'stageA' | 'stageB' | 'stageC-special' | 'stageC-image' | 'stageD';

export interface Question {
  id: string;
  kind: QuestionKind;
  text: string;
  /** תשובה — מוצגת למפעיל בלבד */
  answer?: string;
  /** מזהה תמונה ב-IndexedDB (שאלות חזיון תעתועים בלבד) */
  imageId?: string;
  /** סדר הצגה בתוך המאגר */
  order: number;
  /** האם השאלה כבר נשאלה במשחק הנוכחי */
  used: boolean;
}

export interface ContentState {
  players: Player[];
  questions: Question[];
}

// ===== מצב המשחק (עובר דרך ה-Reducer, נשמר בהיסטוריית Undo) =====

export type StageId = 'A' | 'B' | 'C' | 'D';

export const STAGE_NAMES: Record<StageId, string> = {
  A: 'הסיבוב המהיר',
  B: 'ראש בראש',
  C: 'פוקר פייס + חזיון תעתועים',
  D: 'הגמר הגדול',
};

export type TimerStatus = 'idle' | 'running' | 'paused' | 'finished';

export interface TimerState {
  totalMs: number;
  remainingMs: number;
  status: TimerStatus;
}

/** ניקוד אישי מצטבר, לפי שלב — מאפשר שקלול גמיש לקראת הגמר */
export interface PlayerScore {
  stageA: number;
  stageC: number;
  external: number;
  manual: number;
}

export interface PairState {
  id: string;
  playerIds: [string, string];
  score: number;
}

/** המסך המוצג כרגע על מסך הקהל */
export type PublicScreen =
  | { kind: 'logo'; subtitle?: string }
  | { kind: 'stage-title'; stage: StageId };

export interface GameSettings {
  soundEnabled: boolean;
  /** מוזיקת רקע — זמינה בכל שלבי המשחק, כולל בזמן השאלות */
  musicPlaying: boolean;
  /** מספר הפיינליסטים בגמר (2 ברירת מחדל, אפשרות ל-3) */
  finalistCount: 2 | 3;
  /** משך סבב גמר לכל מתמודד */
  finaleRoundMs: number;
  /** משך סבב זוג בראש בראש */
  pairRoundMs: number;
  /** משך חזיון תעתועים */
  imageRoundMs: number;
}

export interface GameState {
  schemaVersion: number;
  publicScreen: PublicScreen;
  /** השלב הפעיל (לצורך ניווט באדמין) */
  activeStage: StageId;
  scores: Record<string, PlayerScore>;
  pairs: PairState[];
  timer: TimerState;
  settings: GameSettings;
}

export type ScoreChannel = keyof PlayerScore;

// ===== פעולות =====

export type GameAction =
  | { type: 'SHOW_LOGO'; subtitle?: string }
  | { type: 'SHOW_STAGE_TITLE'; stage: StageId }
  | { type: 'SET_ACTIVE_STAGE'; stage: StageId }
  | { type: 'MANUAL_ADJUST_PLAYER'; playerId: string; delta: number }
  | { type: 'MANUAL_ADJUST_PAIR'; pairId: string; delta: number }
  | { type: 'UPDATE_SETTINGS'; patch: Partial<GameSettings> }
  | { type: 'TIMER_START'; totalMs?: number }
  | { type: 'TIMER_PAUSE' }
  | { type: 'TIMER_RESUME' }
  | { type: 'TIMER_RESET' }
  | { type: 'TICK'; dtMs: number };

// ===== סנכרון בין החלונות =====

/** המצב המלא שמסך הקהל צריך כדי לרנדר — נשלח בכל שינוי */
export interface DisplaySnapshot {
  game: GameState;
  players: Player[];
}

export type SyncMessage =
  | { type: 'STATE'; snapshot: DisplaySnapshot }
  | { type: 'SYNC_REQUEST' };
