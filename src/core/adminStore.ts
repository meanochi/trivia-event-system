import { create } from 'zustand';
import type {
  ContentState,
  DisplaySnapshot,
  GameAction,
  GameState,
  SyncMessage,
} from './types';
import {
  currentQuestionId,
  gameReducer,
  initialGameState,
  isUndoable,
  migrateGameState,
} from './reducer';
import { clearGame, loadContent, loadGame, loadImage, saveContent, saveGame } from './db';

/**
 * ה-Store של חלון האדמין — מקור האמת היחיד.
 * מצב המשחק עובר דרך ה-Reducer (עם Undo); התוכן מנוהל בנפרד (ללא Undo).
 * כל שינוי משודר למסך הקהל ונשמר ל-IndexedDB.
 */

const channel = new BroadcastChannel('funkt-farkert-sync');

interface AdminStore {
  game: GameState;
  content: ContentState;
  historyLength: number;
  loaded: boolean;
  dispatch: (action: GameAction) => void;
  undo: () => void;
  resetGame: () => void;
  updateContent: (updater: (c: ContentState) => ContentState) => void;
}

let history: GameState[] = [];

const EMPTY_CONTENT: ContentState = { players: [], questions: [] };

function soundForAction(action: GameAction): 'correct' | 'wrong' | 'reveal' | 'winner' | null {
  switch (action.type) {
    case 'STAGE_A_ANSWER':
    case 'STAGE_B_ANSWER':
    case 'STAGE_C_ANSWER':
    case 'STAGE_D_ANSWER':
      return action.correct ? 'correct' : 'wrong';
    case 'STAGE_B_SETUP':
    case 'STAGE_B_REVEAL_PAIR':
    case 'STAGE_C_SETUP':
    case 'STAGE_D_SETUP':
      return 'reveal';
    case 'STAGE_D_DECLARE_WINNER':
      return 'winner';
    default:
      return null;
  }
}

function snapshotOf(game: GameState, content: ContentState): DisplaySnapshot {
  const questionId = currentQuestionId(game);
  const question = questionId ? content.questions.find((q) => q.id === questionId) : null;
  return {
    game,
    players: content.players,
    questionText: question?.text ?? null,
    questionImageId: question?.imageId ?? null,
  };
}

export const useAdminStore = create<AdminStore>((set, get) => {
  function commitGame(next: GameState, persist = true) {
    set({ game: next, historyLength: history.length });
    channel.postMessage({
      type: 'STATE',
      snapshot: snapshotOf(next, get().content),
    } satisfies SyncMessage);
    if (persist) void saveGame({ state: next, history });
  }

  return {
    game: initialGameState(),
    content: EMPTY_CONTENT,
    historyLength: 0,
    loaded: false,

    dispatch(action) {
      const prev = get().game;
      const next = gameReducer(prev, action);
      if (next === prev) return;
      if (isUndoable(action)) history.push(prev);
      // הצליל נשלח לפני עדכון המצב — כך מסך הקהל מספיק להציג את החיווי
      // על השאלה הנוכחית ולהשהות את המעבר לשאלה הבאה
      if (next.settings.soundEnabled) {
        const sound = soundForAction(action);
        if (sound) channel.postMessage({ type: 'SOUND', name: sound } satisfies SyncMessage);
      }
      // טיקים נשמרים לדיסק לכל היותר פעם בשנייה
      const persist =
        action.type !== 'TICK' ||
        Math.floor(prev.timer.remainingMs / 1000) !== Math.floor(next.timer.remainingMs / 1000);
      commitGame(next, persist);
    },

    undo() {
      const prev = history.pop();
      if (prev) {
        // Undo מבטל ניקוד ומהלך — לא את הזמן שרץ בינתיים
        commitGame({ ...prev, timer: get().game.timer });
      }
    },

    resetGame() {
      history = [];
      void clearGame();
      // איפוס משחק מנקה גם את סימוני "נוצלה" — משחק חדש מתחיל עם מלוא המאגר
      const content = get().content;
      const freshContent = {
        ...content,
        questions: content.questions.map((q) => (q.used ? { ...q, used: false } : q)),
      };
      set({ content: freshContent });
      void saveContent(freshContent);
      // ההגדרות שורדות איפוס — ובפרט קובץ המוזיקה שהועלה, העוצמה ומשכי הסבבים
      commitGame({ ...initialGameState(), settings: get().game.settings });
    },

    updateContent(updater) {
      const next = updater(get().content);
      set({ content: next });
      void saveContent(next);
      // התוכן משפיע על מסך הקהל (שמות שחקנים) — משדרים גם אותו
      channel.postMessage({
        type: 'STATE',
        snapshot: snapshotOf(get().game, next),
      } satisfies SyncMessage);
      // שאלות שנוספו באמצע משחק מצטרפות לסבב הפעיל — ה-Reducer מסנן כפילויות
      // ומתעלם משלבים שאינם פעילים, כך שקריאה מיותרת אינה משנה דבר
      const kinds = ['stageA', 'stageB', 'stageC-special', 'stageC-image', 'stageD'] as const;
      for (const kind of kinds) {
        const questionIds = next.questions
          .filter((q) => q.kind === kind && !q.used)
          .sort((a, b) => a.order - b.order)
          .map((q) => q.id);
        if (questionIds.length > 0) {
          get().dispatch({ type: 'APPEND_STAGE_QUESTIONS', kind, questionIds });
        }
      }
    },
  };
});

/** טעינת מצב שמור בעליית האדמין — טיימר רץ חוזר תמיד מושהה */
export async function restoreAdminState(): Promise<void> {
  const [persistedGame, persistedContent] = await Promise.all([loadGame(), loadContent()]);
  const content = persistedContent ?? EMPTY_CONTENT;
  let game = initialGameState();
  if (persistedGame) {
    // מיגרציה: מצב (והיסטוריית Undo) שנשמרו בגרסת קוד ישנה מקבלים ברירות מחדל לשדות חדשים
    history = (persistedGame.history ?? []).map(migrateGameState);
    game = migrateGameState(persistedGame.state);
    if (game.timer.status === 'running') {
      game = { ...game, timer: { ...game.timer, status: 'paused' } };
    }
  }
  useAdminStore.setState({ game, content, historyLength: history.length, loaded: true });
  channel.postMessage({ type: 'STATE', snapshot: snapshotOf(game, content) } satisfies SyncMessage);
  if (persistedGame) void saveGame({ state: game, history });
}

/** מענה לבקשות סנכרון ותמונות מחלון התצוגה */
channel.addEventListener('message', (e: MessageEvent<SyncMessage>) => {
  if (e.data?.type === 'SYNC_REQUEST') {
    const { game, content, loaded } = useAdminStore.getState();
    if (loaded) {
      channel.postMessage({ type: 'STATE', snapshot: snapshotOf(game, content) } satisfies SyncMessage);
    }
  }
  if (e.data?.type === 'IMAGE_REQUEST') {
    const { loaded } = useAdminStore.getState();
    if (!loaded) return;
    const id = e.data.id;
    void loadImage(id).then((blob) => {
      if (!blob) return;
      // data URL — מחרוזת פשוטה שעוברת בכל סביבה, בלי תלות ב-Blobs בין חלונות
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          channel.postMessage({ type: 'IMAGE', id, dataUrl: reader.result } satisfies SyncMessage);
        }
      };
      reader.readAsDataURL(blob);
    });
  }
});
