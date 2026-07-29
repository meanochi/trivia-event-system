import { useAdminStore } from '../core/adminStore';
import { liveGameScreen } from '../core/reducer';
import { STAGE_NAMES, type StageId } from '../core/types';
import { useAnswerHotkeys } from './useAnswerHotkeys';
import ScorePanel from './ScorePanel';
import StageAPanel from './StageAPanel';
import StageBPanel from './StageBPanel';
import StageCPanel from './StageCPanel';
import StageDPanel from './StageDPanel';

const STAGES: StageId[] = ['A', 'B', 'C', 'D'];
const STAGE_LETTERS: Record<StageId, string> = { A: 'א', B: 'ב', C: 'ג', D: 'ד' };

/**
 * טאב המשחק — בקרת מסך הקהל, ניווט שלבים ופאנל ניקוד ידני.
 * מהלכי המשחק של כל שלב ייבנו בשלבי הפיתוח הבאים.
 */
export default function GameTab() {
  const { game, dispatch } = useAdminStore();
  const screen = game.publicScreen;
  useAnswerHotkeys();

  function screenLabel(): string {
    switch (screen.kind) {
      case 'logo':
        return 'לוגו התוכנית';
      case 'stage-title':
        return `כותרת שלב — ${STAGE_NAMES[screen.stage]}`;
      case 'stageA-intro':
        return 'הצגת קבוצה';
      case 'stageA-question':
        return 'שאלה — הסיבוב המהיר';
      case 'stageA-summary':
        return 'סיכום קבוצה';
      case 'stageB-pairs':
        return 'הזוגות — ראש בראש';
      case 'stageB-match-intro':
        return `הצגת מקצה ${screen.matchIndex + 1}`;
      case 'stageB-round':
        return 'סבב ראש בראש';
      case 'stageB-match-summary':
        return `סיכום מקצה ${screen.matchIndex + 1}`;
      case 'stageC-duel-intro':
        return `הצגת דו־קרב ${screen.duelIndex + 1}`;
      case 'stageC-special':
        return 'פוקר פייס';
      case 'stageC-image':
        return 'חזיון תעתועים';
      case 'stageC-duel-summary':
        return `סיכום דו־קרב ${screen.duelIndex + 1}`;
      case 'stageD-finalists':
        return 'חשיפת הפיינליסטים';
      case 'stageD-round':
        return 'סבב גמר';
      case 'stageD-summary':
        return 'מצב הגמר';
      case 'stageD-winner':
        return '🏆 הכרזת המנצח';
    }
  }

  return (
    <div className="game-tab">
      <section className="panel">
        <h2 className="section-title">מסך הקהל</h2>
        <p className="hint">
          מוצג כעת: <strong>{screenLabel()}</strong>
        </p>
        {(() => {
          const live = liveGameScreen(game);
          const mismatch = live && JSON.stringify(live) !== JSON.stringify(screen);
          if (!mismatch) return null;
          return (
            <div className="next-stage-box">
              <span>⚠ מסך הקהל לא מציג את המשחק הפעיל!</span>
              <button className="btn btn-primary" onClick={() => dispatch({ type: 'RESTORE_GAME_SCREEN' })}>
                📺 חזרה למשחק החי
              </button>
            </div>
          );
        })()}
        <div className="screen-controls">
          <button
            className={`btn ${screen.kind === 'logo' ? 'btn-pink' : 'btn-outline-pink'}`}
            onClick={() => dispatch({ type: 'SHOW_LOGO' })}
          >
            הצג לוגו
          </button>
          {STAGES.map((s) => (
            <button
              key={s}
              className={`btn ${
                screen.kind === 'stage-title' && screen.stage === s ? 'btn-pink' : ''
              }`}
              onClick={() => {
                dispatch({ type: 'SET_ACTIVE_STAGE', stage: s });
                dispatch({ type: 'SHOW_STAGE_TITLE', stage: s });
              }}
            >
              שלב {STAGE_LETTERS[s]}' — {STAGE_NAMES[s]}
            </button>
          ))}
        </div>
        <p className="hint keys-hint">⌨ קיצור מקלדת בזמן שאלה: חץ למעלה ↑ נכון · חץ למטה ↓ שגוי</p>
      </section>

      {game.activeStage === 'A' && <StageAPanel />}
      {game.activeStage === 'B' && <StageBPanel />}
      {game.activeStage === 'C' && <StageCPanel />}
      {game.activeStage === 'D' && <StageDPanel />}

      <ScorePanel />
    </div>
  );
}
