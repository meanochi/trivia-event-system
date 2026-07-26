import type { QuestionKind } from './types';

/** הגדרות מאגרי השאלות: תווית, דרישת מלאי והסבר */
export interface PoolInfo {
  kind: QuestionKind;
  label: string;
  /** דרישה קשיחה הנגזרת ממבנה המשחק */
  required?: number;
  /** המלצה למאגרים מתוזמנים (אין דרישה קשיחה) */
  recommended?: number;
  note: string;
  isImages?: boolean;
}

export const POOLS: PoolInfo[] = [
  {
    kind: 'stageA',
    label: "שלב א' — הסיבוב המהיר",
    required: 140,
    note: '35 שאלות × 4 קבוצות = 140 שאלות נדרשות',
  },
  {
    kind: 'stageB',
    label: "שלב ב' — ראש בראש",
    recommended: 120,
    note: '6 סבבים מתוזמנים של 2:00 — מומלץ 120 ומעלה כדי שלא ייגמרו',
  },
  {
    kind: 'stageC-special',
    label: "שלב ג' — פוקר פייס",
    required: 24,
    note: '4 שאלות מיוחדות × 6 שחקנים = 24 שאלות נדרשות',
  },
  {
    kind: 'stageC-image',
    label: "שלב ג' — חזיון תעתועים",
    recommended: 45,
    note: '3 סבבי תמונות מתוזמנים של 2:00 — מומלץ 45 תמונות ומעלה',
    isImages: true,
  },
  {
    kind: 'stageD',
    label: "שלב ד' — הגמר הגדול",
    recommended: 40,
    note: 'סבבים מתוזמנים של 2:00 לכל פיינליסט — מומלץ 40 ומעלה',
  },
];

export function poolStatus(count: number, pool: PoolInfo): 'ok' | 'warn' | 'danger' {
  const target = pool.required ?? pool.recommended ?? 0;
  if (count >= target) return 'ok';
  if (pool.required) return count >= target * 0.75 ? 'warn' : 'danger';
  return count >= target * 0.5 ? 'warn' : 'danger';
}
