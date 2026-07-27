import { useEffect } from 'react';
import confetti from 'canvas-confetti';
import type { DisplaySnapshot } from '../core/types';
import { finaleWeightedScore } from '../core/reducer';
import { formatTime } from '../core/format';
import Logo from '../components/Logo';

/** מסכי הקהל של שלב ד' — הגמר הגדול */

function finalists(snapshot: DisplaySnapshot) {
  return snapshot.game.stageD.finalistIds
    .map((id) => snapshot.players.find((p) => p.id === id))
    .filter(Boolean);
}

export function StageDFinalists({ snapshot }: { snapshot: DisplaySnapshot }) {
  const players = finalists(snapshot);
  const { scores } = snapshot.game;
  return (
    <div className="display-screen center">
      <div className="stage-kicker">הגמר הגדול</div>
      <h1 className="group-title">הפיינליסטים!</h1>
      <div className="finalists-row">
        {players.map((p, i) => (
          <div key={p!.id} className="finalist-card" style={{ animationDelay: `${0.4 + i * 0.5}s` }}>
            <span className="finalist-name">{p!.name}</span>
            <span className="finalist-score">{finaleWeightedScore(scores[p!.id])}</span>
          </div>
        ))}
      </div>
      <CornerLogo />
    </div>
  );
}

export function StageDRound({ snapshot }: { snapshot: DisplaySnapshot }) {
  const { game, questionText } = snapshot;
  const players = finalists(snapshot);
  const active = players[game.stageD.roundIndex];
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
        <div className="stagea-counter">הגמר הגדול</div>
        <Logo size="small" />
      </header>

      <main className="stageb-main">
        <div className="display-question" key={questionText ?? ''}>
          {questionText ?? ''}
        </div>
      </main>

      <footer className="stageb-pairs-bar finale-bar">
        {players.map((p) => (
          <div key={p!.id} className={`pair-score-box ${active?.id === p!.id ? 'active' : ''}`}>
            <span className="pair-score-names">{p!.name}</span>
            <span className="pair-score-value">{game.scores[p!.id]?.stageD ?? 0}</span>
          </div>
        ))}
      </footer>
    </div>
  );
}

export function StageDSummary({ snapshot }: { snapshot: DisplaySnapshot }) {
  const players = finalists(snapshot);
  const { game } = snapshot;
  const ranked = [...players].sort(
    (a, b) => (game.scores[b!.id]?.stageD ?? 0) - (game.scores[a!.id]?.stageD ?? 0),
  );
  return (
    <div className="display-screen center">
      <div className="stage-kicker">מצב הגמר</div>
      <div className="summary-board">
        {ranked.map((p, i) => (
          <div key={p!.id} className="summary-row" style={{ animationDelay: `${i * 0.15}s` }}>
            <span className="summary-rank">{i + 1}</span>
            <span className="summary-name">{p!.name}</span>
            <span className="summary-score">{game.scores[p!.id]?.stageD ?? 0}</span>
          </div>
        ))}
      </div>
      <CornerLogo />
    </div>
  );
}

export function StageDWinner({ snapshot }: { snapshot: DisplaySnapshot }) {
  const winner = snapshot.players.find((p) => p.id === snapshot.game.stageD.winnerId);

  // קונפטי + "זיקוקים" — פרצים חוזרים מכיוונים משתנים
  useEffect(() => {
    const colors = ['#ff2fa0', '#9be400', '#ffe300', '#ffffff'];
    confetti({ particleCount: 180, spread: 100, origin: { y: 0.6 }, colors });
    const interval = setInterval(() => {
      confetti({
        particleCount: 60,
        angle: 60 + Math.random() * 60,
        spread: 70,
        origin: { x: Math.random(), y: Math.random() * 0.4 },
        colors,
        startVelocity: 45,
      });
    }, 900);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="display-screen center winner-screen">
      <div className="winner-kicker">המנצח הגדול של פונקט פארקערט</div>
      <h1 className="winner-name">{winner?.name ?? '—'}</h1>
      <div className="winner-trophy" aria-hidden="true">🏆</div>
      <div className="winner-logo">
        <Logo size="medium" decorations />
      </div>
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
