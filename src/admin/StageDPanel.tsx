import { useMemo, useState } from 'react';
import { useAdminStore } from '../core/adminStore';
import {
  finaleWeightedScore,
  stageDCurrentQuestionId,
  totalScore,
} from '../core/reducer';
import { formatTime } from '../core/format';
import type { Player } from '../core/types';

/** שלב ד' — הגמר הגדול */
export default function StageDPanel() {
  const { game } = useAdminStore();
  if (game.stageD.phase === 'none') return <ExternalScoresPanel />;
  return <FinalePanel />;
}

/* ============================================================
   הזנת ניקוד חיצוני ושקלול
   ============================================================ */

function ExternalScoresPanel() {
  const { game, content, dispatch } = useAdminStore();

  // מועמדים: שחקני הדו־קרבות של שלב ג'; אם אין — כלל השחקנים
  const candidates = useMemo(() => {
    const fromDuels = game.stageC.duels.flat();
    const ids = fromDuels.length > 0 ? fromDuels : content.players.map((p) => p.id);
    return ids
      .map((id) => content.players.find((p) => p.id === id))
      .filter(Boolean) as Player[];
  }, [game.stageC.duels, content.players]);

  const n = game.settings.finalistCount;

  const ranked = useMemo(
    () =>
      [...candidates].sort(
        (a, b) => finaleWeightedScore(game.scores[b.id]) - finaleWeightedScore(game.scores[a.id]),
      ),
    [candidates, game.scores],
  );

  const autoFinalists = ranked.slice(0, n).map((p) => p.id);
  const [override, setOverride] = useState<Set<string> | null>(null);
  const finalists = override ? [...override] : autoFinalists;

  const boundaryTie =
    ranked.length > n &&
    finaleWeightedScore(game.scores[ranked[n - 1].id]) === finaleWeightedScore(game.scores[ranked[n].id]);

  function toggleFinalist(id: string) {
    const current = new Set(override ?? autoFinalists);
    if (current.has(id)) current.delete(id);
    else if (current.size < n) current.add(id);
    setOverride(current);
  }

  function reveal() {
    const questionIds = content.questions
      .filter((q) => q.kind === 'stageD' && !q.used)
      .sort((a, b) => a.order - b.order)
      .map((q) => q.id);
    // סדר הפיינליסטים לפי הדירוג
    const ordered = ranked.filter((p) => finalists.includes(p.id)).map((p) => p.id);
    dispatch({ type: 'STAGE_D_SETUP', finalistIds: ordered, questionIds });
  }

  const questionsAvailable = content.questions.filter((q) => q.kind === 'stageD' && !q.used).length;

  return (
    <section className="panel">
      <h2 className="section-title">הגמר הגדול — ניקוד חיצוני ושקלול</h2>
      <p className="hint">
        הזינו "ניקוד בונוס חיצוני" (שופטים/מפעיל) לכל מתמודד. השקלול: ניקוד אישי משלבים א'+ג'
        (וידני) + הניקוד החיצוני. עולים לגמר: <strong>{n} המובילים</strong> (ניתן לשינוי בהגדרות) ·
        שאלות גמר במאגר: {questionsAvailable}
      </p>
      {boundaryTie && !override && (
        <p className="hint warn-text">⚠ שוויון על מקום {n} — סמנו ידנית מי עולה לגמר</p>
      )}

      <div className="tablewrap">
        <table className="external-table">
          <thead>
            <tr>
              <th>פיינליסט?</th>
              <th>שחקן</th>
              <th>ניקוד מצטבר</th>
              <th>בונוס חיצוני</th>
              <th>שקלול</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((p) => {
              const s = game.scores[p.id];
              const isFinalist = finalists.includes(p.id);
              return (
                <tr key={p.id} className={isFinalist ? 'finalist-row' : ''}>
                  <td>
                    <input type="checkbox" checked={isFinalist} onChange={() => toggleFinalist(p.id)} />
                  </td>
                  <td>{p.name}</td>
                  <td className="num">{finaleWeightedScore(s) - (s?.external ?? 0)}</td>
                  <td>
                    <input
                      className="input external-input"
                      type="number"
                      value={s?.external ?? 0}
                      onChange={(e) =>
                        dispatch({
                          type: 'SET_EXTERNAL_SCORE',
                          playerId: p.id,
                          value: Number(e.target.value) || 0,
                        })
                      }
                    />
                  </td>
                  <td className="num total-cell">{finaleWeightedScore(s)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="screen-controls">
        <button className="btn btn-pink" disabled={finalists.length !== n} onClick={reveal}>
          🎉 שקלל והצג פיינליסטים
        </button>
        {finalists.length !== n && <span className="hint">יש לבחור בדיוק {n} פיינליסטים</span>}
      </div>
    </section>
  );
}

/* ============================================================
   ניהול הגמר
   ============================================================ */

function FinalePanel() {
  const { game, content, dispatch, undo, updateContent } = useAdminStore();
  const d = game.stageD;
  const finalists = d.finalistIds
    .map((id) => content.players.find((p) => p.id === id))
    .filter(Boolean) as Player[];

  const nameOf = (id: string | null) =>
    content.players.find((p) => p.id === id)?.name ?? '—';

  /* --- סבב פעיל --- */
  if (d.phase === 'round') {
    const player = finalists[d.roundIndex];
    const questionId = stageDCurrentQuestionId(game);
    const question = questionId ? content.questions.find((q) => q.id === questionId) : null;
    const running = game.timer.status === 'running';
    const outOfQuestions = d.cursor >= d.questionIds.length;

    function answer(correct: boolean) {
      if (!questionId) return;
      updateContent((c) => ({
        ...c,
        questions: c.questions.map((q) => (q.id === questionId ? { ...q, used: true } : q)),
      }));
      dispatch({ type: 'STAGE_D_ANSWER', correct });
    }

    return (
      <section className="panel">
        <header className="playing-header">
          <h2 className="section-title">הגמר · הסבב של {player?.name}</h2>
          <div className={`timer-inline ${game.timer.status}`}>{formatTime(game.timer.remainingMs)}</div>
        </header>

        <div className="screen-controls">
          {game.timer.status === 'running' && (
            <button className="btn btn-warning" onClick={() => dispatch({ type: 'TIMER_PAUSE' })}>
              ⏸ השהה
            </button>
          )}
          {game.timer.status === 'paused' && (
            <button className="btn btn-primary" onClick={() => dispatch({ type: 'TIMER_RESUME' })}>
              ▶ המשך משחק
            </button>
          )}
          <button className="btn btn-outline-pink" onClick={() => dispatch({ type: 'STAGE_D_END_ROUND' })}>
            ⏹ סיים סבב
          </button>
        </div>

        {game.timer.status === 'paused' && (
          <p className="hint warn-text">המשחק מושהה — כפתורי התשובות חסומים</p>
        )}
        {game.timer.status === 'finished' && <p className="hint warn-text">⏰ הזמן נגמר! לחצו "סיים סבב"</p>}
        {outOfQuestions && <p className="hint warn-text">נגמרו שאלות הגמר!</p>}

        {!outOfQuestions && (
          <>
            <div className="admin-question">{question?.text ?? '—'}</div>
            {question?.answer && <div className="admin-answer">תשובה: {question.answer}</div>}
          </>
        )}

        <div className="answer-buttons">
          <button className="btn btn-primary btn-big" disabled={!running || outOfQuestions} onClick={() => answer(true)}>
            ✔ חיובי (+1)
          </button>
          <button className="btn btn-pink btn-big" disabled={!running || outOfQuestions} onClick={() => answer(false)}>
            ✘ שלילי
          </button>
          <button className="btn btn-outline-yellow" onClick={undo}>
            ⟲ שאלה קודמת
          </button>
        </div>

        <FinaleStandings finalists={finalists} />
      </section>
    );
  }

  /* --- ניצחון --- */
  if (d.phase === 'winner') {
    return (
      <section className="panel">
        <h2 className="section-title">🏆 המנצח הוכרז: {nameOf(d.winnerId)}</h2>
        <p className="hint">מסך הקהל מציג כעת קונפטי וזיקוקים.</p>
        <div className="screen-controls">
          <button className="btn" onClick={() => dispatch({ type: 'SHOW_LOGO' })}>
            חזרה ללוגו
          </button>
        </div>
      </section>
    );
  }

  /* --- reveal / between / summary --- */
  const nextRound = d.completedRounds;
  const leader = [...finalists].sort(
    (a, b) => (game.scores[b.id]?.stageD ?? 0) - (game.scores[a.id]?.stageD ?? 0),
  )[0];
  const roundsDone = d.completedRounds >= finalists.length;
  const topTie =
    finalists.length > 1 &&
    roundsDone &&
    [...finalists]
      .map((p) => game.scores[p.id]?.stageD ?? 0)
      .sort((a, b) => b - a)
      .slice(0, 2)
      .every((v, _, arr) => v === arr[0]);

  return (
    <section className="panel">
      <h2 className="section-title">
        {d.phase === 'reveal' ? 'הפיינליסטים נחשפו לקהל' : roundsDone ? 'סיכום הגמר' : 'בין סבבים'}
      </h2>
      <FinaleStandings finalists={finalists} />

      {topTie && (
        <p className="hint warn-text">⚠ שוויון בצמרת — הכריעו ידנית (שאלת הכרעה או נקודה ידנית)</p>
      )}

      <div className="screen-controls">
        {!roundsDone && (
          <button
            className="btn btn-primary"
            onClick={() => dispatch({ type: 'STAGE_D_START_ROUND', roundIndex: nextRound })}
          >
            ▶ התחל את הסבב של {finalists[nextRound]?.name} ({formatTime(game.settings.finaleRoundMs)})
          </button>
        )}
        {d.phase !== 'reveal' && (
          <button className="btn" onClick={() => dispatch({ type: 'STAGE_D_SHOW_SUMMARY' })}>
            הצג מצב לקהל
          </button>
        )}
        {roundsDone &&
          finalists.map((p) => (
            <button
              key={p.id}
              className={`btn ${!topTie && p.id === leader?.id ? 'btn-pink' : 'btn-outline-pink'}`}
              onClick={() => dispatch({ type: 'STAGE_D_DECLARE_WINNER', playerId: p.id })}
            >
              🏆 הכרז על {p.name} כמנצח
            </button>
          ))}
      </div>
    </section>
  );
}

function FinaleStandings({ finalists }: { finalists: Player[] }) {
  const { game } = useAdminStore();
  return (
    <div className="match-score-line big">
      {finalists.map((p, i) => (
        <span key={p.id}>
          {i > 0 && ' · '}
          {p.name}: <strong>{game.scores[p.id]?.stageD ?? 0}</strong> בגמר
          {' '}(סה"כ {totalScore(game.scores[p.id])})
        </span>
      ))}
    </div>
  );
}
