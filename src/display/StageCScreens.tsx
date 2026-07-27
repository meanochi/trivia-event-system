import type { DisplaySnapshot } from '../core/types';
import { SPECIAL_PER_DUEL, stageCActivePlayerId, totalScore } from '../core/reducer';
import { formatTime } from '../core/format';
import { useImageUrl } from '../core/useImageUrl';
import Logo from '../components/Logo';

/** מסכי הקהל של שלב ג' — פוקר פייס + חזיון תעתועים */

function duelPlayers(snapshot: DisplaySnapshot, duelIndex?: number) {
  const c = snapshot.game.stageC;
  const duel = c.duels[duelIndex ?? c.duelIndex] ?? [];
  return duel.map((id) => snapshot.players.find((p) => p.id === id)).filter(Boolean);
}

export function StageCDuelIntro({
  snapshot,
  duelIndex,
}: {
  snapshot: DisplaySnapshot;
  duelIndex: number;
}) {
  const players = duelPlayers(snapshot, duelIndex);
  return (
    <div className="display-screen center">
      <div className="stage-kicker">פוקר פייס + חזיון תעתועים</div>
      <h1 className="group-title">דו־קרב {duelIndex + 1}</h1>
      <div className="versus-layout">
        <div className="duel-player-box green">{players[0]?.name}</div>
        <span className="vs-big">מול</span>
        <div className="duel-player-box pink">{players[1]?.name}</div>
      </div>
      <CornerLogo />
    </div>
  );
}

export function StageCSpecial({ snapshot }: { snapshot: DisplaySnapshot }) {
  const { game, questionText } = snapshot;
  const c = game.stageC;
  const players = duelPlayers(snapshot);
  const activeId = stageCActivePlayerId(game);

  return (
    <div className="display-screen stageb-layout">
      <header className="stageb-top">
        <div className="stagea-counter">
          פוקר פייס · שאלה {Math.min(c.answeredInPart + 1, SPECIAL_PER_DUEL)} / {SPECIAL_PER_DUEL}
        </div>
        <Logo size="small" />
      </header>

      <main className="stageb-main">
        <div className="display-question" key={questionText ?? ''}>
          {questionText ?? ''}
        </div>
      </main>

      <footer className="stageb-pairs-bar">
        {players.map((p) => (
          <div key={p!.id} className={`pair-score-box ${p!.id === activeId ? 'active' : ''}`}>
            <span className="pair-score-names">{p!.name}</span>
            <span className="pair-score-value">{totalScore(game.scores[p!.id])}</span>
          </div>
        ))}
      </footer>
    </div>
  );
}

export function StageCImage({ snapshot }: { snapshot: DisplaySnapshot }) {
  const { game, questionImageId } = snapshot;
  const players = duelPlayers(snapshot);
  const activeId = stageCActivePlayerId(game);
  const imageUrl = useImageUrl(questionImageId ?? undefined);
  const { timer } = game;

  return (
    <div className="display-screen stageb-layout">
      <header className="stageb-top">
        <div
          className={`display-timer ${timer.status} ${
            timer.remainingMs <= 10_000 && timer.status === 'running' ? 'urgent' : ''
          }`}
        >
          {formatTime(timer.remainingMs)}
          {timer.status === 'paused' && <span className="pause-badge">הפסקה</span>}
          {timer.status === 'finished' && <span className="pause-badge">הזמן נגמר!</span>}
        </div>
        <div className="stagea-counter">חזיון תעתועים — מה בתמונה?</div>
        <Logo size="small" />
      </header>

      <main className="stageb-main">
        {imageUrl ? (
          <img key={imageUrl} className="display-image" src={imageUrl} alt="" />
        ) : (
          <div className="display-question">…</div>
        )}
      </main>

      <footer className="stageb-pairs-bar">
        {players.map((p) => (
          <div key={p!.id} className={`pair-score-box ${p!.id === activeId ? 'active' : ''}`}>
            <span className="pair-score-names">{p!.name}</span>
            <span className="pair-score-value">{totalScore(game.scores[p!.id])}</span>
          </div>
        ))}
      </footer>
    </div>
  );
}

export function StageCDuelSummary({
  snapshot,
  duelIndex,
}: {
  snapshot: DisplaySnapshot;
  duelIndex: number;
}) {
  const players = duelPlayers(snapshot, duelIndex);
  const { game } = snapshot;
  return (
    <div className="display-screen center">
      <div className="stage-kicker">סיכום דו־קרב {duelIndex + 1}</div>
      <div className="versus-layout">
        {players.map((p) => (
          <div key={p!.id} className="pair-summary-box">
            <div className="duel-player-box">{p!.name}</div>
            <div className="pair-summary-score">{totalScore(game.scores[p!.id])}</div>
          </div>
        ))}
      </div>
      <CornerLogo />
    </div>
  );
}

function CornerLogo() {
  return (
    <div className="display-corner-logo">
      <Logo size="small" />
    </div>
  );
}
