import type { GameAction, GameState, PlayerScore } from './types';

export const SCHEMA_VERSION = 1;

export const DEFAULT_TIMER_MS = 2 * 60 * 1000;

export function initialGameState(): GameState {
  return {
    schemaVersion: SCHEMA_VERSION,
    publicScreen: { kind: 'logo' },
    activeStage: 'A',
    scores: {},
    pairs: [],
    timer: { totalMs: DEFAULT_TIMER_MS, remainingMs: DEFAULT_TIMER_MS, status: 'idle' },
    settings: {
      soundEnabled: true,
      finaleRoundMs: 2 * 60 * 1000,
      pairRoundMs: 2 * 60 * 1000,
      imageRoundMs: 2 * 60 * 1000,
    },
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
      return true;
    default:
      return false;
  }
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
