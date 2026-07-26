import { useAdminStore } from '../core/adminStore';
import { STAGE_NAMES, type StageId } from '../core/types';
import ScorePanel from './ScorePanel';

const STAGES: StageId[] = ['A', 'B', 'C', 'D'];
const STAGE_LETTERS: Record<StageId, string> = { A: 'א', B: 'ב', C: 'ג', D: 'ד' };

/**
 * טאב המשחק — בקרת מסך הקהל, ניווט שלבים ופאנל ניקוד ידני.
 * מהלכי המשחק של כל שלב ייבנו בשלבי הפיתוח הבאים.
 */
export default function GameTab() {
  const { game, dispatch } = useAdminStore();
  const screen = game.publicScreen;

  return (
    <div className="game-tab">
      <section className="panel">
        <h2 className="section-title">מסך הקהל</h2>
        <p className="hint">
          מוצג כעת:{' '}
          <strong>
            {screen.kind === 'logo'
              ? 'לוגו התוכנית'
              : `כותרת שלב — ${STAGE_NAMES[screen.stage]}`}
          </strong>
        </p>
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
      </section>

      <section className="panel stage-placeholder">
        <h2 className="section-title">
          שלב {STAGE_LETTERS[game.activeStage]}' — {STAGE_NAMES[game.activeStage]}
        </h2>
        <p className="hint">
          מהלך המשחק של השלב ייבנה בשלב הפיתוח הבא. בינתיים ניתן לנהל את מסך הקהל, את התוכן
          (בטאבים שחקנים ושאלות) ואת הניקוד הידני.
        </p>
      </section>

      <ScorePanel />
    </div>
  );
}
