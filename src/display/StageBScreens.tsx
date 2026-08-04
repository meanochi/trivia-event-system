import type { DisplaySnapshot, StageBPair } from '../core/types';
import { pairTotalScore, stageBActivePair } from '../core/reducer';
import { formatTime } from '../core/format';
import Logo from '../components/Logo';

/** מסכי הקהל של שלב ב' — ראש בראש */

function usePairNames(snapshot: DisplaySnapshot) {
  return (pair: StageBPair | undefined | null): string[] =>
    (pair?.playerIds ?? []).map(
      (id) => snapshot.players.find((p) => p.id === id)?.name ?? '—',
    );
}

function matchPairs(snapshot: DisplaySnapshot, matchIndex: number) {
  const pairs = snapshot.game.stageB.pairs;
  return [pairs[matchIndex * 2], pairs[matchIndex * 2 + 1]] as const;
}

export function StageBPairs({ snapshot }: { snapshot: DisplaySnapshot }) {
  const names = usePairNames(snapshot);
  const { pairs, revealedPairs } = snapshot.game.stageB;

  // חלוקת הזוגות נחשפת זוג-זוג — זוג שטרם נחשף מוצג כקלף מסתורין
  const box = (idx: number) =>
    idx < revealedPairs ? (
      <PairBox key={`revealed-${idx}`} names={names(pairs[idx])} revealing={idx === revealedPairs - 1} />
    ) : (
      <div key={`mystery-${idx}`} className="pair-box mystery" aria-hidden="true">
        <span className="pair-box-name">?</span>
      </div>
    );

  return (
    <div className="display-screen center">
      <div className="stage-kicker">ראש בראש — הזוגות</div>
      {revealedPairs === 0 && <div className="pairs-tease">מי ישחק עם מי?…</div>}
      <div className="pairs-board">
        {[0, 1, 2].map((m) => (
          <div key={m} className="pairs-match" style={{ animationDelay: `${m * 0.2}s` }}>
            <div className="pairs-match-label">מקצה {m + 1}</div>
            <div className="pairs-match-row">
              {box(m * 2)}
              <span className="vs">מול</span>
              {box(m * 2 + 1)}
            </div>
          </div>
        ))}
      </div>
      <CornerLogo />
    </div>
  );
}

export function StageBMatchIntro({
  snapshot,
  matchIndex,
}: {
  snapshot: DisplaySnapshot;
  matchIndex: number;
}) {
  const names = usePairNames(snapshot);
  const [pairA, pairB] = matchPairs(snapshot, matchIndex);
  return (
    <div className="display-screen center">
      <div className="stage-kicker">מקצה {matchIndex + 1}</div>
      <div className="versus-layout">
        <PairBox names={names(pairA)} big accent="green" />
        <span className="vs-big">מול</span>
        <PairBox names={names(pairB)} big accent="pink" />
      </div>
      <CornerLogo />
    </div>
  );
}

export function StageBRound({ snapshot }: { snapshot: DisplaySnapshot }) {
  const { game, questionText } = snapshot;
  const names = usePairNames(snapshot);
  const [pairA, pairB] = matchPairs(snapshot, game.stageB.matchIndex);
  const active = stageBActivePair(game);
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
        <Logo size="small" />
      </header>

      <main className="stageb-main">
        <div className="display-question" key={questionText ?? ''}>
          {questionText ?? ''}
        </div>
      </main>

      <footer className="stageb-pairs-bar">
        {[pairA, pairB].map((pair) => (
          <div key={pair.id} className={`pair-score-box ${active?.id === pair.id ? 'active' : ''}`}>
            <span className="pair-score-names">{names(pair).join(' · ')}</span>
            <span className="pair-score-value">{pair.score}</span>
          </div>
        ))}
      </footer>
    </div>
  );
}

export function StageBMatchSummary({
  snapshot,
  matchIndex,
}: {
  snapshot: DisplaySnapshot;
  matchIndex: number;
}) {
  const names = usePairNames(snapshot);
  const [pairA, pairB] = matchPairs(snapshot, matchIndex);
  const winner = snapshot.game.stageB.winners[matchIndex];

  return (
    <div className="display-screen center">
      <div className="stage-kicker">סיכום מקצה {matchIndex + 1}</div>
      <div className="versus-layout">
        {[pairA, pairB].map((pair) => (
          <div
            key={pair.id}
            className={`pair-summary-box ${winner === pair.id ? 'winner' : ''} ${
              winner && winner !== pair.id ? 'loser' : ''
            }`}
          >
            <PairBox names={names(pair)} big accent={winner === pair.id ? 'green' : undefined} />
            <div className="pair-summary-score">{pairTotalScore(pair)}</div>
            {winner === pair.id && <div className="winner-badge">עולים לשלב ג'! 🏆</div>}
          </div>
        ))}
      </div>
      <CornerLogo />
    </div>
  );
}

function PairBox({
  names,
  big = false,
  accent,
  revealing = false,
}: {
  names: string[];
  big?: boolean;
  accent?: 'green' | 'pink';
  revealing?: boolean;
}) {
  return (
    <div className={`pair-box ${big ? 'big' : ''} ${accent ?? ''} ${revealing ? 'revealing' : ''}`}>
      {names.map((n, i) => (
        <span key={i} className="pair-box-name">
          {n}
        </span>
      ))}
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
