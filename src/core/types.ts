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

// ===== שלב ג' — פוקר פייס + חזיון תעתועים =====

export type StageCPhase = 'none' | 'intro' | 'special' | 'images' | 'summary';

export interface StageCState {
  /** 3 דו־קרבות × 2 שחקנים; ריק = טרם בוצע המעבר */
  duels: string[][];
  duelIndex: number;
  phase: StageCPhase;
  /** מאגרי השאלות שנתפסו באישור, לפי סדר */
  specialQuestionIds: string[];
  imageQuestionIds: string[];
  /** מצביעים גלובליים (משותפים לכל הדו־קרבות) */
  specialCursor: number;
  imageCursor: number;
  /** כמה תשובות נענו בחלק הנוכחי — קובע את התור (זוגי=שחקן א', אי-זוגי=שחקן ב') */
  answeredInPart: number;
}

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

// ===== שלב ב' — ראש בראש =====

export interface StageBPair {
  id: string;
  playerIds: string[];
  /** הניקוד בשלב זה הוא לזוג בלבד */
  score: number;
}

export type StageBMatchPhase = 'none' | 'intro' | 'round' | 'between' | 'summary';

export interface StageBState {
  /** 6 הזוגות לאחר אישור המפעיל; ריק = טרם בוצע המעבר משלב א' */
  pairs: StageBPair[];
  /** מאגר השאלות שנתפס באישור הזוגות, לפי סדר */
  questionIds: string[];
  /** מצביע השאלה הבאה (משותף לכל המקצים) */
  cursor: number;
  /** המקצה הנוכחי: 0..2 (מקצה i = זוגות 2i, 2i+1) */
  matchIndex: number;
  matchPhase: StageBMatchPhase;
  /** הסבב הפעיל במקצה: 0 = הזוג הראשון, 1 = השני */
  activeRound: 0 | 1;
  /** מזהי הזוגות המנצחים לפי מקצה */
  winners: (string | null)[];
}

/** המסך המוצג כרגע על מסך הקהל */
export type PublicScreen =
  | { kind: 'logo'; subtitle?: string }
  | { kind: 'stage-title'; stage: StageId }
  | { kind: 'stageA-intro'; groupId: GroupId }
  | { kind: 'stageA-question' }
  | { kind: 'stageA-summary'; groupId: GroupId }
  | { kind: 'stageB-pairs' }
  | { kind: 'stageB-match-intro'; matchIndex: number }
  | { kind: 'stageB-round'; matchIndex: number; round: 0 | 1 }
  | { kind: 'stageB-match-summary'; matchIndex: number }
  | { kind: 'stageC-duel-intro'; duelIndex: number }
  | { kind: 'stageC-special' }
  | { kind: 'stageC-image' }
  | { kind: 'stageC-duel-summary'; duelIndex: number };

// ===== שלב א' — הסיבוב המהיר =====

export interface StageARun {
  groupId: GroupId;
  /** חברי הקבוצה בסדר התורות */
  playerIds: string[];
  /** השאלות שהוקצו לסבב (עד 35, לפי סדר המאגר) */
  questionIds: string[];
  /** כמה שאלות כבר נענו */
  answered: number;
  phase: 'intro' | 'playing' | 'summary';
}

export interface StageAState {
  completedGroups: GroupId[];
  run: StageARun | null;
}

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
  stageA: StageAState;
  stageB: StageBState;
  stageC: StageCState;
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
  | { type: 'STAGE_A_LOAD_GROUP'; groupId: GroupId; playerIds: string[]; questionIds: string[] }
  | { type: 'STAGE_A_START' }
  | { type: 'STAGE_A_ANSWER'; correct: boolean }
  | { type: 'STAGE_A_FINISH_GROUP' }
  | { type: 'STAGE_B_SETUP'; pairs: { id: string; playerIds: string[] }[]; questionIds: string[] }
  | { type: 'STAGE_B_SHOW_PAIRS' }
  | { type: 'STAGE_B_MATCH_INTRO'; matchIndex: number }
  | { type: 'STAGE_B_START_ROUND'; round: 0 | 1 }
  | { type: 'STAGE_B_ANSWER'; correct: boolean }
  | { type: 'STAGE_B_END_ROUND' }
  | { type: 'STAGE_B_PICK_WINNER'; pairId: string }
  | { type: 'STAGE_B_NEXT_MATCH' }
  | { type: 'STAGE_C_SETUP'; duels: string[][]; specialQuestionIds: string[]; imageQuestionIds: string[] }
  | { type: 'STAGE_C_DUEL_INTRO'; duelIndex: number }
  | { type: 'STAGE_C_START_SPECIAL' }
  | { type: 'STAGE_C_ANSWER'; correct: boolean }
  | { type: 'STAGE_C_START_IMAGES' }
  | { type: 'STAGE_C_END_IMAGES' }
  | { type: 'STAGE_C_NEXT_DUEL' }
  | { type: 'TIMER_START'; totalMs?: number }
  | { type: 'TIMER_PAUSE' }
  | { type: 'TIMER_RESUME' }
  | { type: 'TIMER_RESET' }
  | { type: 'TICK'; dtMs: number };

// ===== סנכרון בין החלונות =====

/** המצב המלא שמסך הקהל צריך כדי לרנדר — נשלח בכל שינוי.
 *  הקהל לעולם אינו מקבל תשובות — רק את טקסט השאלה הנוכחית. */
export interface DisplaySnapshot {
  game: GameState;
  players: Player[];
  questionText: string | null;
  /** מזהה תמונת השאלה הנוכחית (חזיון תעתועים) — מסך הקהל טוען אותה מ-IndexedDB */
  questionImageId: string | null;
}

export type SyncMessage =
  | { type: 'STATE'; snapshot: DisplaySnapshot }
  | { type: 'SYNC_REQUEST' };
