import { useAdminStore } from '../core/adminStore';
import { stageAActivePlayerId, stageACurrentQuestionId, totalScore } from '../core/reducer';
import { GROUP_IDS, type GroupId, type Player } from '../core/types';

const QUESTIONS_PER_GROUP = 35;

/** מהלך המשחק של שלב א' — הסיבוב המהיר */
export default function StageAPanel() {
  const { game, content, dispatch, undo, updateContent } = useAdminStore();
  const run = game.stageA.run;

  if (!run) return <GroupPicker />;
  if (run.phase === 'summary') {
    return (
      <>
        <StageASummaryPanel />
        <GroupPicker />
      </>
    );
  }
  if (run.phase === 'intro') return <IntroPanel />;
  return <PlayingPanel />;

  /* ===== בחירת קבוצה ===== */

  function GroupPicker() {
    const unusedQuestions = content.questions.filter((q) => q.kind === 'stageA' && !q.used);
    const allDone = game.stageA.completedGroups.length >= GROUP_IDS.length;
    return (
      <section className="panel">
        <h2 className="section-title">הסיבוב המהיר — בחירת קבוצה</h2>
        {allDone && (
          <div className="next-stage-box">
            <span>🎉 כל ארבע הקבוצות סיימו!</span>
            <button
              className="btn btn-pink btn-big"
              onClick={() => {
                dispatch({ type: 'SET_ACTIVE_STAGE', stage: 'B' });
                dispatch({ type: 'SHOW_STAGE_TITLE', stage: 'B' });
              }}
            >
              ⬅ המשך לשלב ב' — ראש בראש
            </button>
          </div>
        )}
        <p className="hint">
          במאגר {unusedQuestions.length} שאלות פנויות ·{' '}
          {unusedQuestions.length < QUESTIONS_PER_GROUP && (
            <strong className="warn-text">שימו לב: פחות מ-35 — הסבב יסתיים כשייגמרו</strong>
          )}
        </p>
        <div className="group-pick-grid">
          {GROUP_IDS.map((gid, gi) => {
            const members = content.players.filter((p) => p.groupId === gid);
            const done = game.stageA.completedGroups.includes(gid);
            return (
              <div key={gid} className={`group-pick ${done ? 'done' : ''}`}>
                <h3 className="score-group-title">
                  קבוצה {gi + 1} {done && <span className="done-badge">✓ הושלמה</span>}
                </h3>
                <p className="hint">{members.length} שחקנים</p>
                <button
                  className="btn btn-primary"
                  disabled={members.length === 0 || unusedQuestions.length === 0}
                  onClick={() => loadGroup(gid, members)}
                >
                  {done ? 'טען שוב' : 'טען קבוצה'}
                </button>
                {members.length !== 5 && members.length > 0 && (
                  <p className="hint warn-text">צפוי 5 — יש {members.length}</p>
                )}
              </div>
            );
          })}
        </div>
      </section>
    );
  }

  function loadGroup(groupId: GroupId, members: Player[]) {
    const questionIds = content.questions
      .filter((q) => q.kind === 'stageA' && !q.used)
      .sort((a, b) => a.order - b.order)
      .slice(0, QUESTIONS_PER_GROUP)
      .map((q) => q.id);
    dispatch({
      type: 'STAGE_A_LOAD_GROUP',
      groupId,
      playerIds: members.map((p) => p.id),
      questionIds,
    });
  }

  /* ===== הצגת הקבוצה (לפני התחלה) ===== */

  function IntroPanel() {
    const members = run!.playerIds
      .map((id) => content.players.find((p) => p.id === id))
      .filter(Boolean) as Player[];
    return (
      <section className="panel">
        <h2 className="section-title">קבוצה {GROUP_IDS.indexOf(run!.groupId) + 1} — מוצגת לקהל</h2>
        <p className="hint">השמות עולים כעת על מסך הקהל. כשהקבוצה מוכנה — התחילו את הסבב.</p>
        <div className="intro-names">
          {members.map((p) => (
            <span key={p.id} className="intro-name">{p.name}</span>
          ))}
        </div>
        <div className="screen-controls">
          <button className="btn btn-primary" onClick={() => dispatch({ type: 'STAGE_A_START' })}>
            ▶ התחל סבב ({run!.questionIds.length} שאלות)
          </button>
          <button className="btn" onClick={() => dispatch({ type: 'SHOW_LOGO' })}>
            חזרה ללוגו
          </button>
        </div>
      </section>
    );
  }

  /* ===== מהלך השאלות ===== */

  function PlayingPanel() {
    const questionId = stageACurrentQuestionId(game);
    const question = questionId ? content.questions.find((q) => q.id === questionId) : null;
    const activePlayer = content.players.find((p) => p.id === stageAActivePlayerId(game));
    const finished = run!.answered >= run!.questionIds.length;

    function answer(correct: boolean) {
      if (!questionId) return;
      // סימון השאלה כ"נוצלה" במאגר (אינדיקציה לעורך; לא חלק מה-Undo)
      updateContent((c) => ({
        ...c,
        questions: c.questions.map((q) => (q.id === questionId ? { ...q, used: true } : q)),
      }));
      dispatch({ type: 'STAGE_A_ANSWER', correct });
    }

    return (
      <section className="panel">
        <header className="playing-header">
          <h2 className="section-title">קבוצה {GROUP_IDS.indexOf(run!.groupId) + 1}</h2>
          <div className="question-counter">
            שאלה <strong>{Math.min(run!.answered + 1, run!.questionIds.length)}</strong> / {run!.questionIds.length}
          </div>
        </header>

        {finished ? (
          <div className="finish-box">
            <p>כל השאלות נענו! 🎉</p>
            <button className="btn btn-pink" onClick={() => dispatch({ type: 'STAGE_A_FINISH_GROUP' })}>
              סיום קבוצה — הצג סיכום לקהל
            </button>
          </div>
        ) : (
          <>
            <div className="turn-picker">
              <span className="hint">בתור (לחיצה על שם מעבירה את התור):</span>
              {run!.playerIds.map((id, i) => {
                const p = content.players.find((pp) => pp.id === id);
                return (
                  <button
                    key={id}
                    className={`turn-chip ${p?.id === activePlayer?.id ? 'active' : ''}`}
                    onClick={() => dispatch({ type: 'STAGE_A_SET_TURN', turnIdx: i })}
                  >
                    {p?.name ?? '—'}
                  </button>
                );
              })}
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
              <button className="btn btn-outline-yellow" onClick={undo} disabled={run!.answered === 0}>
                ⟲ שאלה קודמת
              </button>
            </div>
          </>
        )}
      </section>
    );
  }

}

/** פאנל סיכום קבוצה — מוצג כשהסבב בשלב summary */
export function StageASummaryPanel() {
  const { game, content, dispatch } = useAdminStore();
  const run = game.stageA.run;
  if (!run || run.phase !== 'summary') return null;

  const ranked = run.playerIds
    .map((id) => content.players.find((p) => p.id === id))
    .filter(Boolean)
    .map((p) => ({ player: p!, score: totalScore(game.scores[p!.id]) }))
    .sort((a, b) => b.score - a.score);

  return (
    <section className="panel">
      <h2 className="section-title">
        סיכום קבוצה {GROUP_IDS.indexOf(run.groupId) + 1} — מוצג לקהל
      </h2>
      <ol className="summary-list">
        {ranked.map(({ player, score }, i) => (
          <li key={player.id} className={i < 3 ? 'advancing' : ''}>
            <span className="rank">{i + 1}</span>
            <span className="score-name">{player.name}</span>
            {i < 3 && <span className="advance-badge">עולה לשלב ב'</span>}
            <span className="score-value">{score}</span>
          </li>
        ))}
      </ol>
      {ranked.length > 3 && ranked[2].score === ranked[3]?.score && (
        <p className="hint warn-text">
          ⚠ שוויון על המקום השלישי — ההכרעה מי עולה תיעשה במסך המעבר לשלב ב' (או בנקודה ידנית).
        </p>
      )}
      <div className="screen-controls">
        <button className="btn btn-pink" onClick={() => dispatch({ type: 'SHOW_LOGO' })}>
          חזרה ללוגו (מעבר קבוצה)
        </button>
      </div>
    </section>
  );
}
