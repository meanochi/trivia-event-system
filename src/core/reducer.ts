import type { GameAction, GameState, PlayerScore } from './types';

export const SCHEMA_VERSION = 2;

export const DEFAULT_TIMER_MS = 2 * 60 * 1000;

export function initialGameState(): GameState {
  return {
    schemaVersion: SCHEMA_VERSION,
    publicScreen: { kind: 'logo' },
    activeStage: 'A',
    scores: {},
    stageA: { completedGroups: [], run: null },
    stageB: emptyStageB(),
    stageC: emptyStageC(),
    stageD: emptyStageD(),
    timer: { totalMs: DEFAULT_TIMER_MS, remainingMs: DEFAULT_TIMER_MS, status: 'idle' },
    settings: {
      soundEnabled: true,
      musicPlaying: false,
      musicVolume: 0.35,
      musicTrackId: null,
      finalistCount: 2,
      finaleRoundMs: 2 * 60 * 1000,
      pairRoundMs: 2 * 60 * 1000,
      imageRoundMs: 2 * 60 * 1000,
    },
  };
}

/**
 * מיגרציה של מצב שנשמר בגרסה ישנה של הקוד: כל שדה חסר מקבל ברירת מחדל.
 * קריטי לעדכוני גרסה — בלי זה, מצב ישן ב-IndexedDB מפיל את האדמין למסך ריק.
 */
export function migrateGameState(raw: unknown): GameState {
  const base = initialGameState();
  if (!raw || typeof raw !== 'object') return base;
  const r = raw as Partial<GameState>;
  return {
    ...base,
    ...r,
    schemaVersion: SCHEMA_VERSION,
    publicScreen: r.publicScreen ?? base.publicScreen,
    activeStage: r.activeStage ?? base.activeStage,
    scores: r.scores ?? base.scores,
    stageA: {
      completedGroups: r.stageA?.completedGroups ?? [],
      run: r.stageA?.run
        ? {
            ...r.stageA.run,
            // מצב ישן ללא turnIdx — נגזר ממספר התשובות
            turnIdx:
              r.stageA.run.turnIdx ??
              (r.stageA.run.answered ?? 0) % Math.max(1, r.stageA.run.playerIds?.length ?? 1),
          }
        : null,
    },
    stageB: { ...emptyStageB(), ...(r.stageB ?? {}) },
    stageC: {
      ...emptyStageC(),
      ...(r.stageC ?? {}),
      activeSlot: (r.stageC?.activeSlot ?? (r.stageC?.answeredInPart ?? 0) % 2) as 0 | 1,
    },
    stageD: { ...emptyStageD(), ...(r.stageD ?? {}) },
    timer: { ...base.timer, ...(r.timer ?? {}) },
    settings: { ...base.settings, ...(r.settings ?? {}) },
  };
}

export function emptyStageB() {
  return {
    pairs: [],
    questionIds: [],
    cursor: 0,
    matchIndex: 0,
    matchPhase: 'none' as const,
    activeRound: 0 as const,
    winners: [null, null, null] as (string | null)[],
  };
}

export function emptyStageC() {
  return {
    duels: [] as string[][],
    duelIndex: 0,
    phase: 'none' as const,
    specialQuestionIds: [] as string[],
    imageQuestionIds: [] as string[],
    specialCursor: 0,
    imageCursor: 0,
    answeredInPart: 0,
    activeSlot: 0 as const,
  };
}

/** מספר השאלות המיוחדות בכל דו־קרב: 4 לכל שחקן, לסירוגין */
export const SPECIAL_PER_DUEL = 8;

export function emptyStageD() {
  return {
    finalistIds: [] as string[],
    phase: 'none' as const,
    questionIds: [] as string[],
    cursor: 0,
    roundIndex: 0,
    completedRounds: 0,
    winnerId: null as string | null,
  };
}

export function emptyScore(): PlayerScore {
  return { stageA: 0, stageC: 0, stageD: 0, external: 0, manual: 0 };
}

/** סכימה עמידה לשדות חסרים — רשומות ניקוד ישנות עלולות להיות ללא ערוצים חדשים */
export function totalScore(s: PlayerScore | undefined): number {
  if (!s) return 0;
  return (s.stageA ?? 0) + (s.stageC ?? 0) + (s.stageD ?? 0) + (s.external ?? 0) + (s.manual ?? 0);
}

/** השקלול לבחירת הפיינליסטים: ניקוד אישי (שלבים א'+ג' וידני) + ניקוד חיצוני.
 *  ניקוד הזוגות בשלב ב' אינו נספר (הוא זוגי). ראו שאלות פתוחות באפיון. */
export function finaleWeightedScore(s: PlayerScore | undefined): number {
  if (!s) return 0;
  return (s.stageA ?? 0) + (s.stageC ?? 0) + (s.external ?? 0) + (s.manual ?? 0);
}

/** פעולות שנשמרות בהיסטוריית ה-Undo (פעולות משחק, לא ניווט תצוגה וטיימר) */
export function isUndoable(action: GameAction): boolean {
  switch (action.type) {
    case 'MANUAL_ADJUST_PLAYER':
    case 'MANUAL_ADJUST_PAIR':
    case 'STAGE_A_ANSWER':
    case 'STAGE_B_ANSWER':
    case 'STAGE_C_ANSWER':
    case 'STAGE_D_ANSWER':
      return true;
    default:
      return false;
  }
}

/** מזהה השאלה הנוכחית בסבב ראש בראש (null אם אין סבב פעיל או שנגמרו) */
export function stageBCurrentQuestionId(state: GameState): string | null {
  const b = state.stageB;
  if (b.matchPhase !== 'round') return null;
  return b.questionIds[b.cursor] ?? null;
}

/** הזוג שמשחק כעת בראש בראש */
export function stageBActivePair(state: GameState) {
  const b = state.stageB;
  if (b.matchPhase !== 'round') return null;
  return b.pairs[b.matchIndex * 2 + b.activeRound] ?? null;
}

/** שני הזוגות של המקצה הנוכחי */
export function stageBMatchPairs(state: GameState) {
  const b = state.stageB;
  return [b.pairs[b.matchIndex * 2], b.pairs[b.matchIndex * 2 + 1]] as const;
}

/** מזהה השאלה הנוכחית בשלב ג' (פוקר פייס או חזיון תעתועים) */
export function stageCCurrentQuestionId(state: GameState): string | null {
  const c = state.stageC;
  if (c.phase === 'special') return c.specialQuestionIds[c.specialCursor] ?? null;
  if (c.phase === 'images') return c.imageQuestionIds[c.imageCursor] ?? null;
  return null;
}

/** השחקן שבתורו בדו־קרב הנוכחי של שלב ג' */
export function stageCActivePlayerId(state: GameState): string | null {
  const c = state.stageC;
  if (c.phase !== 'special' && c.phase !== 'images') return null;
  const duel = c.duels[c.duelIndex];
  if (!duel || duel.length === 0) return null;
  return duel[c.activeSlot];
}

/** מזהה השאלה הנוכחית בסבב הגמר */
export function stageDCurrentQuestionId(state: GameState): string | null {
  const d = state.stageD;
  if (d.phase !== 'round') return null;
  return d.questionIds[d.cursor] ?? null;
}

/** הפיינליסט שמשחק כעת בגמר */
export function stageDActivePlayerId(state: GameState): string | null {
  const d = state.stageD;
  if (d.phase !== 'round') return null;
  return d.finalistIds[d.roundIndex] ?? null;
}

/** השאלה המוצגת כרגע לקהל — מכל שלב שהוא */
export function currentQuestionId(state: GameState): string | null {
  return (
    stageACurrentQuestionId(state) ??
    stageBCurrentQuestionId(state) ??
    stageCCurrentQuestionId(state) ??
    stageDCurrentQuestionId(state)
  );
}

/** מזהה השאלה הנוכחית בסבב שלב א' (null אם אין סבב פעיל או שנגמרו) */
export function stageACurrentQuestionId(state: GameState): string | null {
  const run = state.stageA.run;
  if (!run || run.phase !== 'playing') return null;
  return run.questionIds[run.answered] ?? null;
}

/** השחקן שבתורו בסבב שלב א' */
export function stageAActivePlayerId(state: GameState): string | null {
  const run = state.stageA.run;
  if (!run || run.playerIds.length === 0) return null;
  return run.playerIds[run.turnIdx % run.playerIds.length];
}

function withPlayerScore(
  state: GameState,
  playerId: string,
  update: (s: PlayerScore) => PlayerScore,
): GameState {
  const current = state.scores[playerId] ?? emptyScore();
  return { ...state, scores: { ...state.scores, [playerId]: update(current) } };
}

/** מסך המשחק החי לפי מצב השלב הפעיל — לחזרה אחרי שהמפעיל שוטט במסכים אחרים */
export function liveGameScreen(state: GameState): GameState['publicScreen'] | null {
  switch (state.activeStage) {
    case 'A':
      if (state.stageA.run?.phase === 'playing') return { kind: 'stageA-question' };
      if (state.stageA.run?.phase === 'intro')
        return { kind: 'stageA-intro', groupId: state.stageA.run.groupId };
      if (state.stageA.run?.phase === 'summary')
        return { kind: 'stageA-summary', groupId: state.stageA.run.groupId };
      return null;
    case 'B': {
      const b = state.stageB;
      if (b.matchPhase === 'round')
        return { kind: 'stageB-round', matchIndex: b.matchIndex, round: b.activeRound };
      if (b.matchPhase === 'intro') return { kind: 'stageB-match-intro', matchIndex: b.matchIndex };
      if (b.matchPhase === 'between' || b.matchPhase === 'summary')
        return { kind: 'stageB-match-summary', matchIndex: b.matchIndex };
      if (b.pairs.length > 0) return { kind: 'stageB-pairs' };
      return null;
    }
    case 'C': {
      const c = state.stageC;
      if (c.phase === 'special') return { kind: 'stageC-special' };
      if (c.phase === 'images') return { kind: 'stageC-image' };
      if (c.phase === 'intro') return { kind: 'stageC-duel-intro', duelIndex: c.duelIndex };
      if (c.phase === 'summary') return { kind: 'stageC-duel-summary', duelIndex: c.duelIndex };
      return null;
    }
    case 'D': {
      const d = state.stageD;
      if (d.phase === 'round') return { kind: 'stageD-round', roundIndex: d.roundIndex };
      if (d.phase === 'winner') return { kind: 'stageD-winner' };
      if (d.phase === 'reveal') return { kind: 'stageD-finalists' };
      if (d.phase === 'between' || d.phase === 'summary') return { kind: 'stageD-summary' };
      return null;
    }
  }
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'SHOW_LOGO':
      return { ...state, publicScreen: { kind: 'logo', subtitle: action.subtitle } };

    case 'RESTORE_GAME_SCREEN': {
      const live = liveGameScreen(state);
      if (!live) return state;
      return { ...state, publicScreen: live };
    }

    case 'SHOW_STAGE_TITLE':
      return { ...state, publicScreen: { kind: 'stage-title', stage: action.stage } };

    case 'SET_ACTIVE_STAGE':
      return { ...state, activeStage: action.stage };

    case 'MANUAL_ADJUST_PLAYER':
      return withPlayerScore(state, action.playerId, (s) => ({ ...s, manual: s.manual + action.delta }));

    case 'MANUAL_ADJUST_PAIR': {
      const pairs = state.stageB.pairs.map((p) =>
        p.id === action.pairId ? { ...p, score: p.score + action.delta } : p,
      );
      return { ...state, stageB: { ...state.stageB, pairs } };
    }

    case 'UPDATE_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.patch } };

    case 'APPEND_STAGE_QUESTIONS': {
      // שאלות שנוספו למאגר באמצע משחק מצטרפות לסבב הפעיל מיד
      const merge = (existing: string[], cap?: number) => {
        const have = new Set(existing);
        const fresh = action.questionIds.filter((id) => !have.has(id));
        if (fresh.length === 0) return null;
        const merged = [...existing, ...fresh];
        return cap ? merged.slice(0, cap) : merged;
      };
      switch (action.kind) {
        case 'stageA': {
          const run = state.stageA.run;
          if (!run || run.phase === 'summary') return state;
          const merged = merge(run.questionIds, 35);
          if (!merged || merged.length === run.questionIds.length) return state;
          return { ...state, stageA: { ...state.stageA, run: { ...run, questionIds: merged } } };
        }
        case 'stageB': {
          if (state.stageB.pairs.length === 0) return state;
          const merged = merge(state.stageB.questionIds);
          if (!merged) return state;
          return { ...state, stageB: { ...state.stageB, questionIds: merged } };
        }
        case 'stageC-special': {
          if (state.stageC.duels.length === 0) return state;
          const merged = merge(state.stageC.specialQuestionIds);
          if (!merged) return state;
          return { ...state, stageC: { ...state.stageC, specialQuestionIds: merged } };
        }
        case 'stageC-image': {
          if (state.stageC.duels.length === 0) return state;
          const merged = merge(state.stageC.imageQuestionIds);
          if (!merged) return state;
          return { ...state, stageC: { ...state.stageC, imageQuestionIds: merged } };
        }
        case 'stageD': {
          if (state.stageD.finalistIds.length === 0) return state;
          const merged = merge(state.stageD.questionIds);
          if (!merged) return state;
          return { ...state, stageD: { ...state.stageD, questionIds: merged } };
        }
      }
      return state;
    }

    case 'STAGE_A_LOAD_GROUP': {
      const run = {
        groupId: action.groupId,
        playerIds: action.playerIds,
        questionIds: action.questionIds,
        answered: 0,
        turnIdx: 0,
        phase: 'intro' as const,
      };
      return {
        ...state,
        activeStage: 'A',
        stageA: { ...state.stageA, run },
        publicScreen: { kind: 'stageA-intro', groupId: action.groupId },
      };
    }

    case 'STAGE_A_START': {
      const run = state.stageA.run;
      if (!run || run.phase !== 'intro') return state;
      return {
        ...state,
        stageA: { ...state.stageA, run: { ...run, phase: 'playing' } },
        publicScreen: { kind: 'stageA-question' },
      };
    }

    case 'STAGE_A_ANSWER': {
      const run = state.stageA.run;
      if (!run || run.phase !== 'playing' || run.answered >= run.questionIds.length) return state;
      const playerId = stageAActivePlayerId(state);
      let next = state;
      if (action.correct && playerId) {
        next = withPlayerScore(state, playerId, (s) => ({ ...s, stageA: s.stageA + 1 }));
      }
      return {
        ...next,
        stageA: {
          ...next.stageA,
          run: {
            ...run,
            answered: run.answered + 1,
            turnIdx: (run.turnIdx + 1) % Math.max(1, run.playerIds.length),
          },
        },
      };
    }

    case 'STAGE_A_SET_TURN': {
      const run = state.stageA.run;
      if (!run || run.phase !== 'playing') return state;
      return {
        ...state,
        stageA: { ...state.stageA, run: { ...run, turnIdx: action.turnIdx % Math.max(1, run.playerIds.length) } },
      };
    }

    case 'STAGE_A_FINISH_GROUP': {
      const run = state.stageA.run;
      if (!run) return state;
      const completedGroups = state.stageA.completedGroups.includes(run.groupId)
        ? state.stageA.completedGroups
        : [...state.stageA.completedGroups, run.groupId];
      return {
        ...state,
        stageA: { completedGroups, run: { ...run, phase: 'summary' } },
        publicScreen: { kind: 'stageA-summary', groupId: run.groupId },
      };
    }

    case 'STAGE_B_SETUP': {
      return {
        ...state,
        activeStage: 'B',
        stageB: {
          ...emptyStageB(),
          pairs: action.pairs.map((p) => ({ ...p, score: 0 })),
          questionIds: action.questionIds,
        },
        publicScreen: { kind: 'stageB-pairs' },
      };
    }

    case 'STAGE_B_SHOW_PAIRS':
      return { ...state, publicScreen: { kind: 'stageB-pairs' } };

    case 'STAGE_B_MATCH_INTRO': {
      return {
        ...state,
        stageB: { ...state.stageB, matchIndex: action.matchIndex, matchPhase: 'intro' },
        publicScreen: { kind: 'stageB-match-intro', matchIndex: action.matchIndex },
      };
    }

    case 'STAGE_B_START_ROUND': {
      const b = state.stageB;
      if (b.matchPhase !== 'intro' && b.matchPhase !== 'between') return state;
      const totalMs = state.settings.pairRoundMs;
      return {
        ...state,
        stageB: { ...b, matchPhase: 'round', activeRound: action.round },
        timer: { totalMs, remainingMs: totalMs, status: 'running' },
        publicScreen: { kind: 'stageB-round', matchIndex: b.matchIndex, round: action.round },
      };
    }

    case 'STAGE_B_ANSWER': {
      const b = state.stageB;
      // תשובות מתקבלות רק כשהשעון רץ — השהיה חוסמת (לפי האפיון)
      if (b.matchPhase !== 'round' || state.timer.status !== 'running') return state;
      if (b.cursor >= b.questionIds.length) return state;
      const activePairIdx = b.matchIndex * 2 + b.activeRound;
      const pairs = action.correct
        ? b.pairs.map((p, i) => (i === activePairIdx ? { ...p, score: p.score + 1 } : p))
        : b.pairs;
      return { ...state, stageB: { ...b, pairs, cursor: b.cursor + 1 } };
    }

    case 'STAGE_B_END_ROUND': {
      const b = state.stageB;
      if (b.matchPhase !== 'round') return state;
      const done = b.activeRound === 1;
      return {
        ...state,
        stageB: { ...b, matchPhase: done ? 'summary' : 'between' },
        timer: { ...state.timer, remainingMs: state.settings.pairRoundMs, status: 'idle' },
        publicScreen: { kind: 'stageB-match-summary', matchIndex: b.matchIndex },
      };
    }

    case 'STAGE_B_PICK_WINNER': {
      const b = state.stageB;
      const winners = [...b.winners];
      winners[b.matchIndex] = action.pairId;
      return { ...state, stageB: { ...b, winners } };
    }

    case 'STAGE_B_NEXT_MATCH': {
      const b = state.stageB;
      const nextIndex = b.matchIndex + 1;
      if (nextIndex > 2) return state;
      return {
        ...state,
        stageB: { ...b, matchIndex: nextIndex, matchPhase: 'intro' },
        publicScreen: { kind: 'stageB-match-intro', matchIndex: nextIndex },
      };
    }

    case 'STAGE_C_SETUP': {
      return {
        ...state,
        activeStage: 'C',
        stageC: {
          ...emptyStageC(),
          duels: action.duels,
          specialQuestionIds: action.specialQuestionIds,
          imageQuestionIds: action.imageQuestionIds,
          phase: 'intro',
        },
        publicScreen: { kind: 'stageC-duel-intro', duelIndex: 0 },
      };
    }

    case 'STAGE_C_DUEL_INTRO': {
      return {
        ...state,
        stageC: { ...state.stageC, duelIndex: action.duelIndex, phase: 'intro' },
        publicScreen: { kind: 'stageC-duel-intro', duelIndex: action.duelIndex },
      };
    }

    case 'STAGE_C_START_SPECIAL': {
      const c = state.stageC;
      if (c.phase !== 'intro') return state;
      return {
        ...state,
        stageC: { ...c, phase: 'special', answeredInPart: 0, activeSlot: 0 },
        publicScreen: { kind: 'stageC-special' },
      };
    }

    case 'STAGE_C_ANSWER': {
      const c = state.stageC;
      if (c.phase === 'special') {
        if (c.answeredInPart >= SPECIAL_PER_DUEL) return state;
        if (c.specialCursor >= c.specialQuestionIds.length) return state;
        const playerId = stageCActivePlayerId(state);
        let next = state;
        if (action.correct && playerId) {
          next = withPlayerScore(state, playerId, (s) => ({ ...s, stageC: s.stageC + 1 }));
        }
        return {
          ...next,
          stageC: {
            ...c,
            specialCursor: c.specialCursor + 1,
            answeredInPart: c.answeredInPart + 1,
            activeSlot: c.activeSlot === 0 ? 1 : 0,
          },
        };
      }
      if (c.phase === 'images') {
        // תשובות רק כשהשעון רץ — השהיה חוסמת
        if (state.timer.status !== 'running') return state;
        if (c.imageCursor >= c.imageQuestionIds.length) return state;
        const playerId = stageCActivePlayerId(state);
        let next = state;
        if (action.correct && playerId) {
          next = withPlayerScore(state, playerId, (s) => ({ ...s, stageC: s.stageC + 1 }));
        }
        return {
          ...next,
          stageC: {
            ...c,
            imageCursor: c.imageCursor + 1,
            answeredInPart: c.answeredInPart + 1,
            activeSlot: c.activeSlot === 0 ? 1 : 0,
          },
        };
      }
      return state;
    }

    case 'STAGE_C_SET_TURN': {
      const c = state.stageC;
      if (c.phase !== 'special' && c.phase !== 'images') return state;
      return { ...state, stageC: { ...c, activeSlot: action.slot } };
    }

    case 'STAGE_C_START_IMAGES': {
      const c = state.stageC;
      if (c.phase !== 'special' && c.phase !== 'intro') return state;
      const totalMs = state.settings.imageRoundMs;
      return {
        ...state,
        stageC: { ...c, phase: 'images', answeredInPart: 0, activeSlot: 0 },
        timer: { totalMs, remainingMs: totalMs, status: 'running' },
        publicScreen: { kind: 'stageC-image' },
      };
    }

    case 'STAGE_C_END_IMAGES': {
      const c = state.stageC;
      if (c.phase !== 'images') return state;
      return {
        ...state,
        stageC: { ...c, phase: 'summary' },
        timer: { ...state.timer, remainingMs: state.settings.imageRoundMs, status: 'idle' },
        publicScreen: { kind: 'stageC-duel-summary', duelIndex: c.duelIndex },
      };
    }

    case 'STAGE_C_NEXT_DUEL': {
      const c = state.stageC;
      const nextIndex = c.duelIndex + 1;
      if (nextIndex >= c.duels.length) return state;
      return {
        ...state,
        stageC: { ...c, duelIndex: nextIndex, phase: 'intro', answeredInPart: 0 },
        publicScreen: { kind: 'stageC-duel-intro', duelIndex: nextIndex },
      };
    }

    case 'SET_EXTERNAL_SCORE':
      return withPlayerScore(state, action.playerId, (s) => ({ ...s, external: action.value }));

    case 'STAGE_D_SETUP': {
      return {
        ...state,
        activeStage: 'D',
        stageD: {
          ...emptyStageD(),
          finalistIds: action.finalistIds,
          questionIds: action.questionIds,
          phase: 'reveal',
        },
        publicScreen: { kind: 'stageD-finalists' },
      };
    }

    case 'STAGE_D_START_ROUND': {
      const d = state.stageD;
      if (d.phase === 'round' || d.phase === 'winner') return state;
      const totalMs = state.settings.finaleRoundMs;
      return {
        ...state,
        stageD: { ...d, phase: 'round', roundIndex: action.roundIndex },
        timer: { totalMs, remainingMs: totalMs, status: 'running' },
        publicScreen: { kind: 'stageD-round', roundIndex: action.roundIndex },
      };
    }

    case 'STAGE_D_ANSWER': {
      const d = state.stageD;
      if (d.phase !== 'round' || state.timer.status !== 'running') return state;
      if (d.cursor >= d.questionIds.length) return state;
      const playerId = d.finalistIds[d.roundIndex];
      let next = state;
      if (action.correct && playerId) {
        next = withPlayerScore(state, playerId, (s) => ({ ...s, stageD: (s.stageD ?? 0) + 1 }));
      }
      return { ...next, stageD: { ...d, cursor: d.cursor + 1 } };
    }

    case 'STAGE_D_END_ROUND': {
      const d = state.stageD;
      if (d.phase !== 'round') return state;
      const completedRounds = Math.max(d.completedRounds, d.roundIndex + 1);
      const allDone = completedRounds >= d.finalistIds.length;
      return {
        ...state,
        stageD: { ...d, phase: allDone ? 'summary' : 'between', completedRounds },
        timer: { ...state.timer, remainingMs: state.settings.finaleRoundMs, status: 'idle' },
        publicScreen: { kind: 'stageD-summary' },
      };
    }

    case 'STAGE_D_SHOW_SUMMARY':
      return {
        ...state,
        stageD: { ...state.stageD, phase: state.stageD.phase === 'between' ? 'between' : 'summary' },
        publicScreen: { kind: 'stageD-summary' },
      };

    case 'STAGE_D_DECLARE_WINNER': {
      return {
        ...state,
        stageD: { ...state.stageD, phase: 'winner', winnerId: action.playerId },
        publicScreen: { kind: 'stageD-winner' },
      };
    }

    case 'TIMER_START': {
      if (state.timer.status === 'running') return state;
      const totalMs = action.totalMs ?? state.timer.totalMs;
      return { ...state, timer: { totalMs, remainingMs: totalMs, status: 'running' } };
    }
    case 'TIMER_PAUSE':
      if (state.timer.status !== 'running') return state;
      return { ...state, timer: { ...state.timer, status: 'paused' } };
    case 'TIMER_RESUME':
      if (state.timer.status !== 'paused') return state;
      return { ...state, timer: { ...state.timer, status: 'running' } };
    case 'TIMER_RESET':
      return { ...state, timer: { ...state.timer, remainingMs: state.timer.totalMs, status: 'idle' } };
    case 'TICK': {
      if (state.timer.status !== 'running') return state;
      const remainingMs = Math.max(0, state.timer.remainingMs - action.dtMs);
      return {
        ...state,
        timer: { ...state.timer, remainingMs, status: remainingMs === 0 ? 'finished' : 'running' },
      };
    }
  }
}
