import type { GameAction, GameState, PlayerScore } from './types';

export const SCHEMA_VERSION = 2;

export const DEFAULT_TIMER_MS = 2 * 60 * 1000;

export function initialGameState(): GameState {
  return {
    schemaVersion: SCHEMA_VERSION,
    publicScreen: { kind: 'logo' },
    activeStage: 'A',
    scores: {},
    pairs: [],
    stageA: { completedGroups: [], run: null },
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
    pairs: r.pairs ?? base.pairs,
    stageA: {
      completedGroups: r.stageA?.completedGroups ?? [],
      run: r.stageA?.run ?? null,
    },
    timer: { ...base.timer, ...(r.timer ?? {}) },
    settings: { ...base.settings, ...(r.settings ?? {}) },
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
      return true;
    default:
      return false;
  }
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
      const pairs = state.pairs.map((p) =>
        p.id === action.pairId ? { ...p, score: p.score + action.delta } : p,
      );
      return { ...state, pairs };
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
