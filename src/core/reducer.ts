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
    timer: { totalMs: DEFAULT_TIMER_MS, remainingMs: DEFAULT_TIMER_MS, status: 'idle' },
    settings: {
      soundEnabled: true,
      musicPlaying: false,
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
      run: r.stageA?.run ?? null,
    },
    stageB: { ...emptyStageB(), ...(r.stageB ?? {}) },
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

export function emptyScore(): PlayerScore {
  return { stageA: 0, stageC: 0, external: 0, manual: 0 };
}

export function totalScore(s: PlayerScore | undefined): number {
  if (!s) return 0;
  return s.stageA + s.stageC + s.external + s.manual;
}

/** פעולות שנשמרות בהיסטוריית ה-Undo (פעולות משחק, לא ניווט תצוגה וטיימר) */
export function isUndoable(action: GameAction): boolean {
  switch (action.type) {
    case 'MANUAL_ADJUST_PLAYER':
    case 'MANUAL_ADJUST_PAIR':
    case 'STAGE_A_ANSWER':
    case 'STAGE_B_ANSWER':
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

/** השאלה המוצגת כרגע לקהל — מכל שלב שהוא */
export function currentQuestionId(state: GameState): string | null {
  return stageACurrentQuestionId(state) ?? stageBCurrentQuestionId(state);
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
  return run.playerIds[run.answered % run.playerIds.length];
}

function withPlayerScore(
  state: GameState,
  playerId: string,
  update: (s: PlayerScore) => PlayerScore,
): GameState {
  const current = state.scores[playerId] ?? emptyScore();
  return { ...state, scores: { ...state.scores, [playerId]: update(current) } };
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'SHOW_LOGO':
      return { ...state, publicScreen: { kind: 'logo', subtitle: action.subtitle } };

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

    case 'STAGE_A_LOAD_GROUP': {
      const run = {
        groupId: action.groupId,
        playerIds: action.playerIds,
        questionIds: action.questionIds,
        answered: 0,
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
        stageA: { ...next.stageA, run: { ...run, answered: run.answered + 1 } },
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
