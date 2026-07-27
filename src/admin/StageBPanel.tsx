import { useMemo, useState } from 'react';
import { useAdminStore } from '../core/adminStore';
import {
  stageBActivePair,
  stageBCurrentQuestionId,
  stageBMatchPairs,
  totalScore,
} from '../core/reducer';
import { formatTime } from '../core/format';
import { GROUP_IDS, type Player } from '../core/types';

/** שלב ב' — ראש בראש: מעבר משלב א', ניהול מקצים וסבבים */
export default function StageBPanel() {
  const { game } = useAdminStore();
  if (game.stageB.pairs.length === 0) return <TransitionPanel />;
  return <MatchPanel />;
}

/* ============================================================
   מעבר משלב א': בחירת 12 העולים + הצעת זוגות
   ============================================================ */

interface Candidate {
  player: Player;
  score: number;
}

function TransitionPanel() {
  const { game, content, dispatch } = useAdminStore();

  // דירוג לכל קבוצה
  const groups = useMemo(() => {
    return GROUP_IDS.map((gid, gi) => {
      const ranked: Candidate[] = content.players
        .filter((p) => p.groupId === gid)
        .map((p) => ({ player: p, score: totalScore(game.scores[p.id]) }))
        .sort((a, b) => b.score - a.score);
      const tieOnBoundary =
        ranked.length > 3 && ranked[2].score === ranked[3].score;
      return { gid, gi, ranked, tieOnBoundary };
    });
  }, [content.players, game.scores]);

  // בחירה: ברירת מחדל — 3 המובילים מכל קבוצה
  const [selected, setSelected] = useState<Set<string>>(() => {
    const s = new Set<string>();
    for (const g of groups) g.ranked.slice(0, 3).forEach((c) => s.add(c.player.id));
    return s;
  });

  const [pairs, setPairs] = useState<string[][] | null>(null);

  function toggle(playerId: string, gid: string) {
    const next = new Set(selected);
    if (next.has(playerId)) {
      next.delete(playerId);
    } else {
      const groupSelected = content.players.filter(
        (p) => p.groupId === gid && next.has(p.id),
      ).length;
      if (groupSelected >= 3) return; // עד 3 מכל קבוצה
      next.add(playerId);
    }
    setSelected(next);
    setPairs(null);
  }

  const selectedPlayers = content.players.filter((p) => selected.has(p.id));
  const canSuggest = selectedPlayers.length === 12;

  function suggestPairs() {
    // חלוקה לפי ניקוד יורד, עם האילוץ: זוג לא מאותה קבוצה של שלב א'
    const sorted = [...selectedPlayers].sort(
      (a, b) => totalScore(game.scores[b.id]) - totalScore(game.scores[a.id]),
    );
    const remaining = [...sorted];
    const result: string[][] = [];
    while (remaining.length > 0) {
      const first = remaining.shift()!;
      const idx = remaining.findIndex((p) => p.groupId !== first.groupId);
      const partner = idx >= 0 ? remaining.splice(idx, 1)[0] : remaining.shift()!;
      result.push([first.id, partner.id]);
    }
    // תיקון: אם נוצר זוג מאותה קבוצה — ניסיון החלפה עם זוג אחר
    for (let i = 0; i < result.length; i++) {
      const [a, b] = result[i].map((id) => content.players.find((p) => p.id === id)!);
      if (a.groupId !== b.groupId) continue;
      for (let j = 0; j < result.length && result[i].length; j++) {
        if (i === j) continue;
        const [c, d] = result[j].map((id) => content.players.find((p) => p.id === id)!);
        if (b.groupId !== c.groupId && a.groupId !== d.groupId) {
          [result[i][1], result[j][0]] = [result[j][0], result[i][1]];
          break;
        }
        if (b.groupId !== d.groupId && a.groupId !== c.groupId) {
          [result[i][1], result[j][1]] = [result[j][1], result[i][1]];
          break;
        }
      }
    }
    setPairs(result);
  }

  function swapPlayer(pairIdx: number, slot: number, newPlayerId: string) {
    if (!pairs) return;
    const next = pairs.map((p) => [...p]);
    // החלפה: השחקן החדש מוחלף עם היושב במקום — כך כל שחקן מופיע בדיוק פעם אחת
    const oldId = next[pairIdx][slot];
    for (let i = 0; i < next.length; i++) {
      for (let s = 0; s < 2; s++) {
        if (next[i][s] === newPlayerId) next[i][s] = oldId;
      }
    }
    next[pairIdx][slot] = newPlayerId;
    setPairs(next);
  }

  function approve() {
    if (!pairs) return;
    const questionIds = content.questions
      .filter((q) => q.kind === 'stageB' && !q.used)
      .sort((a, b) => a.order - b.order)
      .map((q) => q.id);
    dispatch({
      type: 'STAGE_B_SETUP',
      pairs: pairs.map((playerIds, i) => ({ id: `pair${i + 1}`, playerIds })),
      questionIds,
    });
  }

  const groupOf = (id: string) => content.players.find((p) => p.id === id)?.groupId ?? null;
  const questionsAvailable = content.questions.filter((q) => q.kind === 'stageB' && !q.used).length;

  return (
    <section className="panel">
      <h2 className="section-title">מעבר לראש בראש — בחירת 12 העולים</h2>
      <p className="hint">
        3 המובילים מכל קבוצה נבחרו אוטומטית. אפשר לשנות בסימון. נבחרו: {selectedPlayers.length}/12 ·
        שאלות פנויות במאגר: {questionsAvailable}
      </p>

      <div className="transition-grid">
        {groups.map(({ gid, gi, ranked, tieOnBoundary }) => (
          <div key={gid} className="transition-group">
            <h3 className="score-group-title">קבוצה {gi + 1}</h3>
            {tieOnBoundary && (
              <p className="hint warn-text">⚠ שוויון על מקום 3 — בחרו ידנית מי עולה</p>
            )}
            <ul className="transition-list">
              {ranked.map(({ player, score }, i) => (
                <li key={player.id}>
                  <label className={`transition-row ${selected.has(player.id) ? 'picked' : ''}`}>
                    <input
                      type="checkbox"
                      checked={selected.has(player.id)}
                      onChange={() => toggle(player.id, gid)}
                    />
                    <span className="rank">{i + 1}</span>
                    <span className="score-name">{player.name}</span>
                    <span className="score-value">{score}</span>
                  </label>
                </li>
              ))}
              {ranked.length === 0 && <li className="hint">אין שחקנים</li>}
            </ul>
          </div>
        ))}
      </div>

      <div className="screen-controls">
        <button className="btn btn-primary" disabled={!canSuggest} onClick={suggestPairs}>
          🤝 הצע חלוקה לזוגות
        </button>
        {!canSuggest && <span className="hint">יש לבחור בדיוק 12 שחקנים</span>}
      </div>

      {pairs && (
        <div className="pairs-editor">
          <h3 className="score-group-title">הזוגות המוצעים (ניתן להחליף שחקנים)</h3>
          <div className="pairs-grid">
            {pairs.map((pair, pi) => {
              const sameGroup = groupOf(pair[0]) !== null && groupOf(pair[0]) === groupOf(pair[1]);
              return (
                <div key={pi} className={`pair-card ${sameGroup ? 'invalid' : ''}`}>
                  <div className="pair-card-title">
                    זוג {pi + 1} <span className="hint">(מקצה {Math.floor(pi / 2) + 1})</span>
                  </div>
                  {[0, 1].map((slot) => (
                    <select
                      key={slot}
                      className="input select"
                      value={pair[slot]}
                      onChange={(e) => swapPlayer(pi, slot, e.target.value)}
                    >
                      {selectedPlayers.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} (ק{GROUP_IDS.indexOf(p.groupId!) + 1})
                        </option>
                      ))}
                    </select>
                  ))}
                  {sameGroup && <div className="hint warn-text">⚠ שניהם מאותה קבוצה בשלב א'</div>}
                </div>
              );
            })}
          </div>
          <div className="screen-controls">
            <button className="btn btn-pink" onClick={approve} disabled={questionsAvailable === 0}>
              ✔ אשר זוגות והצג לקהל
            </button>
            {questionsAvailable === 0 && (
              <span className="hint warn-text">אין שאלות במאגר ראש בראש — הוסיפו בטאב השאלות</span>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

/* ============================================================
   ניהול מקצה
   ============================================================ */

function MatchPanel() {
  const { game, content, dispatch, undo, updateContent } = useAdminStore();
  const b = game.stageB;
  const [pairA, pairB] = stageBMatchPairs(game);

  const nameOf = (id: string) => content.players.find((p) => p.id === id)?.name ?? '—';
  const pairLabel = (pair: { playerIds: string[] } | undefined) =>
    pair ? pair.playerIds.map(nameOf).join(' ו') : '—';

  if (!pairA || !pairB) return null;

  const matchNum = b.matchIndex + 1;

  /* --- לפני/בין סבבים --- */
  if (b.matchPhase === 'none' || b.matchPhase === 'intro') {
    return (
      <section className="panel">
        <h2 className="section-title">מקצה {matchNum} מתוך 3</h2>
        <div className="match-pairs-line">
          <strong>{pairLabel(pairA)}</strong> מול <strong>{pairLabel(pairB)}</strong>
        </div>
        <div className="screen-controls">
          <button className="btn" onClick={() => dispatch({ type: 'STAGE_B_SHOW_PAIRS' })}>
            הצג את כל הזוגות לקהל
          </button>
          <button
            className="btn"
            onClick={() => dispatch({ type: 'STAGE_B_MATCH_INTRO', matchIndex: b.matchIndex })}
          >
            הצג את המקצה לקהל
          </button>
          <button
            className="btn btn-primary"
            onClick={() => dispatch({ type: 'STAGE_B_START_ROUND', round: 0 })}
          >
            ▶ התחל סבב — {pairLabel(pairA)} ({formatTime(game.settings.pairRoundMs)})
          </button>
        </div>
      </section>
    );
  }

  /* --- סבב פעיל --- */
  if (b.matchPhase === 'round') {
    const activePair = stageBActivePair(game);
    const questionId = stageBCurrentQuestionId(game);
    const question = questionId ? content.questions.find((q) => q.id === questionId) : null;
    const running = game.timer.status === 'running';
    const outOfQuestions = b.cursor >= b.questionIds.length;

    function answer(correct: boolean) {
      if (!questionId) return;
      updateContent((c) => ({
        ...c,
        questions: c.questions.map((q) => (q.id === questionId ? { ...q, used: true } : q)),
      }));
      dispatch({ type: 'STAGE_B_ANSWER', correct });
    }

    return (
      <section className="panel">
        <header className="playing-header">
          <h2 className="section-title">
            מקצה {matchNum} · סבב של {pairLabel(activePair ?? undefined)}
          </h2>
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
          <button className="btn btn-outline-pink" onClick={() => dispatch({ type: 'STAGE_B_END_ROUND' })}>
            ⏹ סיים סבב
          </button>
        </div>

        {game.timer.status === 'paused' && (
          <p className="hint warn-text">המשחק מושהה — כפתורי התשובות חסומים</p>
        )}
        {game.timer.status === 'finished' && (
          <p className="hint warn-text">⏰ הזמן נגמר! לחצו "סיים סבב"</p>
        )}
        {outOfQuestions && <p className="hint warn-text">נגמרו השאלות במאגר!</p>}

        {!outOfQuestions && (
          <>
            <div className="admin-question">{question?.text ?? '—'}</div>
            {question?.answer && <div className="admin-answer">תשובה: {question.answer}</div>}
          </>
        )}

        <div className="answer-buttons">
          <button className="btn btn-primary btn-big" disabled={!running || outOfQuestions} onClick={() => answer(true)}>
            ✔ נכון (+1 לזוג)
          </button>
          <button className="btn btn-pink btn-big" disabled={!running || outOfQuestions} onClick={() => answer(false)}>
            ✘ שגוי
          </button>
          <button className="btn btn-outline-yellow" onClick={undo}>
            ⟲ שאלה קודמת
          </button>
        </div>

        <div className="match-score-line">
          {pairLabel(pairA)}: <strong>{pairA.score}</strong> · {pairLabel(pairB)}:{' '}
          <strong>{pairB.score}</strong>
        </div>
      </section>
    );
  }

  /* --- בין סבבים --- */
  if (b.matchPhase === 'between') {
    return (
      <section className="panel">
        <h2 className="section-title">מקצה {matchNum} — סיום סבב ראשון</h2>
        <div className="match-score-line">
          {pairLabel(pairA)}: <strong>{pairA.score}</strong> · {pairLabel(pairB)}:{' '}
          <strong>{pairB.score}</strong>
        </div>
        <div className="screen-controls">
          <button
            className="btn btn-primary"
            onClick={() => dispatch({ type: 'STAGE_B_START_ROUND', round: 1 })}
          >
            ▶ התחל סבב — {pairLabel(pairB)} ({formatTime(game.settings.pairRoundMs)})
          </button>
        </div>
      </section>
    );
  }

  /* --- סיכום מקצה --- */
  const winner = b.winners[b.matchIndex];
  const tie = pairA.score === pairB.score;
  const suggested = pairA.score > pairB.score ? pairA.id : pairB.id;

  return (
    <section className="panel">
      <h2 className="section-title">סיכום מקצה {matchNum}</h2>
      <div className="match-score-line big">
        {pairLabel(pairA)}: <strong>{pairA.score}</strong> · {pairLabel(pairB)}:{' '}
        <strong>{pairB.score}</strong>
      </div>
      {tie && !winner && (
        <p className="hint warn-text">
          ⚠ שוויון! הכריעו ידנית (למשל שאלת הכרעה, או נקודה ידנית בפאנל הניקוד) ואז בחרו מנצח.
        </p>
      )}
      {!winner ? (
        <div className="screen-controls">
          {[pairA, pairB].map((p) => (
            <button
              key={p.id}
              className={`btn ${!tie && p.id === suggested ? 'btn-primary' : ''}`}
              onClick={() => dispatch({ type: 'STAGE_B_PICK_WINNER', pairId: p.id })}
            >
              🏆 {pairLabel(p)} מנצחים
            </button>
          ))}
        </div>
      ) : (
        <>
          <p className="advance-badge" style={{ display: 'inline-block' }}>
            {pairLabel(b.pairs.find((p) => p.id === winner))} עולים לשלב ג'!
          </p>
          <div className="screen-controls">
            {b.matchIndex < 2 ? (
              <button className="btn btn-pink" onClick={() => dispatch({ type: 'STAGE_B_NEXT_MATCH' })}>
                ⬅ למקצה הבא
              </button>
            ) : (
              <button className="btn btn-pink" onClick={() => dispatch({ type: 'SHOW_LOGO' })}>
                סיום השלב — חזרה ללוגו
              </button>
            )}
          </div>
        </>
      )}
    </section>
  );
}
