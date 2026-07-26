import type { DisplaySnapshot, GroupId } from '../core/types';
import { GROUP_IDS } from '../core/types';
import { stageAActivePlayerId, totalScore } from '../core/reducer';
import Logo from '../components/Logo';

/** מסכי הקהל של שלב א' — הסיבוב המהיר */

export function StageAIntro({ snapshot, groupId }: { snapshot: DisplaySnapshot; groupId: GroupId }) {
  const run = snapshot.game.stageA.run;
  const members = (run?.playerIds ?? [])
    .map((id) => snapshot.players.find((p) => p.id === id))
    .filter(Boolean);

  return (
    <div className="display-screen center">
      <div className="stage-kicker">הסיבוב המהיר</div>
      <h1 className="group-title">קבוצה {GROUP_IDS.indexOf(groupId) + 1}</h1>
      <div className="intro-cards">
        {members.map((p, i) => (
          <div key={p!.id} className="intro-card" style={{ animationDelay: `${i * 0.18}s` }}>
            <span className="intro-card-name">{p!.name}</span>
            <span className="intro-card-score">0</span>
          </div>
        ))}
      </div>
      <CornerLogo />
    </div>
  );
}

export function StageAQuestion({ snapshot }: { snapshot: DisplaySnapshot }) {
  const { game, players, questionText } = snapshot;
  const run = game.stageA.run;
  const activeId = stageAActivePlayerId(game);
  const members = (run?.playerIds ?? [])
    .map((id) => players.find((p) => p.id === id))
    .filter(Boolean);

  return (
    <div className="display-screen stagea-layout">
      <header className="stagea-top">
        <div className="stagea-counter">
          שאלה {Math.min((run?.answered ?? 0) + 1, run?.questionIds.length ?? 0)} / {run?.questionIds.length ?? 0}
        </div>
        <CornerLogo inline />
      </header>

      <main className="stagea-main">
        <div className="display-question" key={questionText ?? ''}>
          {questionText ?? ''}
        </div>
      </main>

      <aside className="stagea-scores">
        {members.map((p) => (
          <div key={p!.id} className={`score-row ${p!.id === activeId ? 'active' : ''}`}>
            <span className="score-row-name">{p!.name}</span>
            <span className="score-row-value">{totalScore(game.scores[p!.id])}</span>
          </div>
        ))}
      </aside>
    </div>
  );
}

export function StageASummary({ snapshot, groupId }: { snapshot: DisplaySnapshot; groupId: GroupId }) {
  const { game, players } = snapshot;
  const run = game.stageA.run;
  const ranked = (run?.playerIds ?? [])
    .map((id) => players.find((p) => p.id === id))
    .filter(Boolean)
    .map((p) => ({ p: p!, score: totalScore(game.scores[p!.id]) }))
    .sort((a, b) => b.score - a.score);

  return (
    <div className="display-screen center">
      <div className="stage-kicker">סיכום קבוצה {GROUP_IDS.indexOf(groupId) + 1}</div>
      <div className="summary-board">
        {ranked.map(({ p, score }, i) => (
          <div
            key={p.id}
            className={`summary-row ${i < 3 ? 'advancing' : ''}`}
            style={{ animationDelay: `${i * 0.15}s` }}
          >
            <span className="summary-rank">{i + 1}</span>
            <span className="summary-name">{p.name}</span>
            <span className="summary-score">{score}</span>
          </div>
        ))}
      </div>
      <CornerLogo />
    </div>
  );
}

function CornerLogo({ inline = false }: { inline?: boolean }) {
  if (inline) return <Logo size="small" />;
  return (
    <div className="display-corner-logo">
      <Logo size="small" />
    </div>
  );
}
