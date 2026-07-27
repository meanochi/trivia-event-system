import { useAdminStore } from '../core/adminStore';
import { totalScore } from '../core/reducer';
import { GROUP_IDS } from '../core/types';

/**
 * פאנל הניקוד הידני האוניברסלי — קבוע בכל שלבי המשחק.
 * ‎±1‎ לכל שחקן; ניקוד זוגי יתווסף עם בניית שלב ב'.
 */
export default function ScorePanel() {
  const { game, content, dispatch } = useAdminStore();

  if (content.players.length === 0) {
    return (
      <section className="panel score-panel">
        <h2 className="section-title">פאנל ניקוד ידני</h2>
        <p className="hint">אין עדיין שחקנים — הוסיפו אותם בטאב "שחקנים".</p>
      </section>
    );
  }

  const pairs = game.stageB.pairs;
  const nameOf = (id: string) => content.players.find((p) => p.id === id)?.name ?? '—';

  return (
    <section className="panel score-panel">
      <h2 className="section-title">פאנל ניקוד ידני</h2>

      {game.activeStage === 'B' && pairs.length > 0 && (
        <div className="pair-score-panel">
          <h3 className="score-group-title">ניקוד זוגות (ראש בראש)</h3>
          <ul className="score-list">
            {pairs.map((p, i) => (
              <li key={p.id}>
                <span className="score-name">
                  זוג {i + 1}: {p.playerIds.map(nameOf).join(' ו')}
                </span>
                <span className="score-value">{p.score}</span>
                <span className="score-buttons">
                  <button
                    className="btn btn-mini"
                    onClick={() => dispatch({ type: 'MANUAL_ADJUST_PAIR', pairId: p.id, delta: 1 })}
                  >
                    +1
                  </button>
                  <button
                    className="btn btn-mini"
                    onClick={() => dispatch({ type: 'MANUAL_ADJUST_PAIR', pairId: p.id, delta: -1 })}
                  >
                    −1
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="score-groups">
        {GROUP_IDS.map((gid, gi) => {
          const members = content.players.filter((p) => p.groupId === gid);
          if (members.length === 0) return null;
          return (
            <div key={gid} className="score-group">
              <h3 className="score-group-title">קבוצה {gi + 1}</h3>
              <ul className="score-list">
                {members.map((p) => (
                  <li key={p.id}>
                    <span className="score-name">{p.name}</span>
                    <span className="score-value">{totalScore(game.scores[p.id])}</span>
                    <span className="score-buttons">
                      <button
                        className="btn btn-mini"
                        onClick={() =>
                          dispatch({ type: 'MANUAL_ADJUST_PLAYER', playerId: p.id, delta: 1 })
                        }
                      >
                        +1
                      </button>
                      <button
                        className="btn btn-mini"
                        onClick={() =>
                          dispatch({ type: 'MANUAL_ADJUST_PLAYER', playerId: p.id, delta: -1 })
                        }
                      >
                        −1
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}
