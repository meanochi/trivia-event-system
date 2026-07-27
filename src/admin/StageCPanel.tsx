import { useMemo, useState } from 'react';
import { useAdminStore } from '../core/adminStore';
import {
  SPECIAL_PER_DUEL,
  stageCActivePlayerId,
  stageCCurrentQuestionId,
  totalScore,
} from '../core/reducer';
import { formatTime } from '../core/format';
import { useImageUrl } from '../core/useImageUrl';
import type { Player } from '../core/types';

/** שלב ג' — פוקר פייס + חזיון תעתועים */
export default function StageCPanel() {
  const { game } = useAdminStore();
  if (game.stageC.duels.length === 0) return <TransitionPanel />;
  return <DuelPanel />;
}

/* ============================================================
   מעבר: 6 שחקני הזוגות המנצחים → 3 דו־קרבות
   ============================================================ */

function TransitionPanel() {
  const { game, content, dispatch } = useAdminStore();

  // ברירת מחדל: שחקני שלושת הזוגות המנצחים מראש בראש
  const winnersPlayers = useMemo(() => {
    const b = game.stageB;
    const ids: string[] = [];
    for (const w of b.winners) {
      const pair = b.pairs.find((p) => p.id === w);
      if (pair) ids.push(...pair.playerIds);
    }
    return ids;
  }, [game.stageB]);

  const [selected, setSelected] = useState<Set<string>>(() => new Set(winnersPlayers));
  const [duels, setDuels] = useState<string[][] | null>(null);

  const allWinnersKnown = winnersPlayers.length === 6;

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else if (next.size < 6) next.add(id);
    setSelected(next);
    setDuels(null);
  }

  const selectedPlayers = content.players.filter((p) => selected.has(p.id));

  function suggestDuels() {
    // ברירת מחדל: בני אותו זוג מנצח זה מול זה; בבחירה ידנית — לפי הסדר
    const ordered =
      allWinnersKnown && [...selected].every((id) => winnersPlayers.includes(id))
        ? winnersPlayers.filter((id) => selected.has(id))
        : selectedPlayers.map((p) => p.id);
    const result: string[][] = [];
    for (let i = 0; i < ordered.length; i += 2) result.push([ordered[i], ordered[i + 1]]);
    setDuels(result);
  }

  function swapPlayer(duelIdx: number, slot: number, newId: string) {
    if (!duels) return;
    const next = duels.map((d) => [...d]);
    const oldId = next[duelIdx][slot];
    for (let i = 0; i < next.length; i++) {
      for (let s = 0; s < 2; s++) {
        if (next[i][s] === newId) next[i][s] = oldId;
      }
    }
    next[duelIdx][slot] = newId;
    setDuels(next);
  }

  function approve() {
    if (!duels) return;
    const pick = (kind: string) =>
      content.questions
        .filter((q) => q.kind === kind && !q.used)
        .sort((a, b) => a.order - b.order)
        .map((q) => q.id);
    dispatch({
      type: 'STAGE_C_SETUP',
      duels,
      specialQuestionIds: pick('stageC-special'),
      imageQuestionIds: pick('stageC-image'),
    });
  }

  const nameOf = (id: string) => content.players.find((p) => p.id === id)?.name ?? '—';
  const specialCount = content.questions.filter((q) => q.kind === 'stageC-special' && !q.used).length;
  const imageCount = content.questions.filter((q) => q.kind === 'stageC-image' && !q.used).length;

  return (
    <section className="panel">
      <h2 className="section-title">מעבר לשלב ג' — הששייה</h2>
      {allWinnersKnown ? (
        <p className="hint">
          נבחרו אוטומטית 6 שחקני הזוגות המנצחים מראש בראש. אפשר לשנות בסימון (בדיוק 6).
        </p>
      ) : (
        <p className="hint warn-text">
          ⚠ מקצי ראש בראש טרם הוכרעו במלואם — בחרו ידנית 6 שחקנים ({selected.size}/6).
        </p>
      )}
      <p className="hint">
        מלאי: {specialCount} שאלות פוקר פייס (נדרשות {SPECIAL_PER_DUEL * 3}) · {imageCount} תמונות
        חזיון תעתועים
      </p>

      <div className="stagec-candidates">
        {content.players.map((p) => (
          <label key={p.id} className={`transition-row ${selected.has(p.id) ? 'picked' : ''}`}>
            <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggle(p.id)} />
            <span className="score-name">{p.name}</span>
            <span className="score-value">{totalScore(game.scores[p.id])}</span>
          </label>
        ))}
      </div>

      <div className="screen-controls">
        <button className="btn btn-primary" disabled={selected.size !== 6} onClick={suggestDuels}>
          ⚔ הצע דו־קרבות
        </button>
      </div>

      {duels && (
        <div className="pairs-editor">
          <h3 className="score-group-title">הדו־קרבות (ניתן להחליף שחקנים)</h3>
          <div className="pairs-grid">
            {duels.map((duel, di) => (
              <div key={di} className="pair-card">
                <div className="pair-card-title">דו־קרב {di + 1}</div>
                {[0, 1].map((slot) => (
                  <select
                    key={slot}
                    className="input select"
                    value={duel[slot]}
                    onChange={(e) => swapPlayer(di, slot, e.target.value)}
                  >
                    {selectedPlayers.map((p) => (
                      <option key={p.id} value={p.id}>
                        {nameOf(p.id)}
                      </option>
                    ))}
                  </select>
                ))}
              </div>
            ))}
          </div>
          <div className="screen-controls">
            <button
              className="btn btn-pink"
              onClick={approve}
              disabled={specialCount === 0 && imageCount === 0}
            >
              ✔ אשר דו־קרבות והצג לקהל
            </button>
            {specialCount === 0 && imageCount === 0 && (
              <span className="hint warn-text">אין שאלות במאגרי שלב ג' — הוסיפו בטאב השאלות</span>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

/* ============================================================
   ניהול דו־קרב
   ============================================================ */

function DuelPanel() {
  const { game, content, dispatch, undo, updateContent } = useAdminStore();
  const c = game.stageC;
  const duel = c.duels[c.duelIndex] ?? [];
  const players = duel.map((id) => content.players.find((p) => p.id === id)).filter(Boolean) as Player[];
  const duelNum = c.duelIndex + 1;

  if (c.phase === 'intro') {
    return (
      <section className="panel">
        <h2 className="section-title">
          דו־קרב {duelNum} מתוך {c.duels.length}
        </h2>
        <div className="match-pairs-line">
          <strong>{players[0]?.name}</strong> מול <strong>{players[1]?.name}</strong>
        </div>
        <div className="screen-controls">
          <button
            className="btn"
            onClick={() => dispatch({ type: 'STAGE_C_DUEL_INTRO', duelIndex: c.duelIndex })}
          >
            הצג את הדו־קרב לקהל
          </button>
          <button className="btn btn-primary" onClick={() => dispatch({ type: 'STAGE_C_START_SPECIAL' })}>
            ▶ התחל פוקר פייס (8 שאלות)
          </button>
          <button className="btn" onClick={() => dispatch({ type: 'STAGE_C_START_IMAGES' })}>
            ▶ דלג ישר לחזיון תעתועים
          </button>
        </div>
      </section>
    );
  }

  /* --- פוקר פייס --- */
  if (c.phase === 'special') {
    const questionId = stageCCurrentQuestionId(game);
    const question = questionId ? content.questions.find((q) => q.id === questionId) : null;
    const activePlayer = content.players.find((p) => p.id === stageCActivePlayerId(game));
    const partDone = c.answeredInPart >= SPECIAL_PER_DUEL || !questionId;

    function answer(correct: boolean) {
      if (!questionId) return;
      updateContent((cc) => ({
        ...cc,
        questions: cc.questions.map((q) => (q.id === questionId ? { ...q, used: true } : q)),
      }));
      dispatch({ type: 'STAGE_C_ANSWER', correct });
    }

    return (
      <section className="panel">
        <header className="playing-header">
          <h2 className="section-title">דו־קרב {duelNum} · פוקר פייס</h2>
          <div className="question-counter">
            שאלה <strong>{Math.min(c.answeredInPart + 1, SPECIAL_PER_DUEL)}</strong> / {SPECIAL_PER_DUEL}
          </div>
        </header>

        {partDone ? (
          <div className="finish-box">
            <p>חלק פוקר פייס הסתיים!</p>
            <button className="btn btn-pink" onClick={() => dispatch({ type: 'STAGE_C_START_IMAGES' })}>
              ▶ המשך לחזיון תעתועים ({formatTime(game.settings.imageRoundMs)})
            </button>
          </div>
        ) : (
          <>
            <div className="turn-line">
              בתור: <strong className="active-player-name">{activePlayer?.name ?? '—'}</strong>
            </div>
            <div className="admin-question">{question?.text ?? '—'}</div>
            {question?.answer && <div className="admin-answer">תשובה: {question.answer}</div>}
            <div className="answer-buttons">
              <button className="btn btn-primary btn-big" onClick={() => answer(true)}>
                ✔ נכון (+1)
              </button>
              <button className="btn btn-pink btn-big" onClick={() => answer(false)}>
                ✘ שגוי
              </button>
              <button className="btn btn-outline-yellow" onClick={undo} disabled={c.answeredInPart === 0}>
                ⟲ שאלה קודמת
              </button>
            </div>
          </>
        )}
        <DuelScoreLine players={players} />
      </section>
    );
  }

  /* --- חזיון תעתועים --- */
  if (c.phase === 'images') {
    return <ImagesPart players={players} duelNum={duelNum} />;
  }

  /* --- סיכום דו־קרב --- */
  return (
    <section className="panel">
      <h2 className="section-title">סיכום דו־קרב {duelNum}</h2>
      <DuelScoreLine players={players} big />
      <div className="screen-controls">
        {c.duelIndex < c.duels.length - 1 ? (
          <button className="btn btn-pink" onClick={() => dispatch({ type: 'STAGE_C_NEXT_DUEL' })}>
            ⬅ לדו־קרב הבא
          </button>
        ) : (
          <button className="btn btn-pink" onClick={() => dispatch({ type: 'SHOW_LOGO' })}>
            סיום השלב — חזרה ללוגו
          </button>
        )}
      </div>
    </section>
  );
}

function ImagesPart({ players, duelNum }: { players: Player[]; duelNum: number }) {
  const { game, content, dispatch, undo, updateContent } = useAdminStore();
  const c = game.stageC;
  const questionId = stageCCurrentQuestionId(game);
  const question = questionId ? content.questions.find((q) => q.id === questionId) : null;
  const activePlayer = content.players.find((p) => p.id === stageCActivePlayerId(game));
  const imageUrl = useImageUrl(question?.imageId);
  const running = game.timer.status === 'running';
  const outOfImages = c.imageCursor >= c.imageQuestionIds.length;

  function answer(correct: boolean) {
    if (!questionId) return;
    updateContent((cc) => ({
      ...cc,
      questions: cc.questions.map((q) => (q.id === questionId ? { ...q, used: true } : q)),
    }));
    dispatch({ type: 'STAGE_C_ANSWER', correct });
  }

  return (
    <section className="panel">
      <header className="playing-header">
        <h2 className="section-title">דו־קרב {duelNum} · חזיון תעתועים</h2>
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
        <button className="btn btn-outline-pink" onClick={() => dispatch({ type: 'STAGE_C_END_IMAGES' })}>
          ⏹ סיים חלק
        </button>
      </div>

      {game.timer.status === 'paused' && (
        <p className="hint warn-text">המשחק מושהה — כפתורי התשובות חסומים</p>
      )}
      {game.timer.status === 'finished' && <p className="hint warn-text">⏰ הזמן נגמר! לחצו "סיים חלק"</p>}
      {outOfImages && <p className="hint warn-text">נגמרו התמונות במאגר!</p>}

      {!outOfImages && (
        <div className="image-question-row">
          {imageUrl && <img className="admin-image-preview" src={imageUrl} alt="" />}
          <div>
            <div className="turn-line">
              בתור: <strong className="active-player-name">{activePlayer?.name ?? '—'}</strong>
            </div>
            {question?.answer && <div className="admin-answer">תשובה: {question.answer}</div>}
          </div>
        </div>
      )}

      <div className="answer-buttons">
        <button className="btn btn-primary btn-big" disabled={!running || outOfImages} onClick={() => answer(true)}>
          ✔ נכון (+1)
        </button>
        <button className="btn btn-pink btn-big" disabled={!running || outOfImages} onClick={() => answer(false)}>
          ✘ שגוי
        </button>
        <button className="btn btn-outline-yellow" onClick={undo}>
          ⟲ תמונה קודמת
        </button>
      </div>

      <DuelScoreLine players={players} />
    </section>
  );
}

function DuelScoreLine({ players, big = false }: { players: Player[]; big?: boolean }) {
  const { game } = useAdminStore();
  return (
    <div className={`match-score-line ${big ? 'big' : ''}`}>
      {players.map((p, i) => (
        <span key={p.id}>
          {i > 0 && ' · '}
          {p.name}: <strong>{totalScore(game.scores[p.id])}</strong>
        </span>
      ))}
    </div>
  );
}
