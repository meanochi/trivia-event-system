import { useEffect, useRef, useState } from 'react';
import type { DisplaySnapshot, SyncMessage } from '../core/types';
import { STAGE_NAMES } from '../core/types';
import Logo from '../components/Logo';
import { StageAIntro, StageAQuestion, StageASummary } from './StageAScreens';
import {
  StageBMatchIntro,
  StageBMatchSummary,
  StageBPairs,
  StageBRound,
} from './StageBScreens';
import {
  StageCDuelIntro,
  StageCDuelSummary,
  StageCImage,
  StageCSpecial,
} from './StageCScreens';
import {
  StageDFinalists,
  StageDRound,
  StageDSummary,
  StageDWinner,
} from './StageDScreens';
import SoundManager from './SoundManager';
import AmbientBackground from './AmbientBackground';
import AnswerFlash from './AnswerFlash';
import './display.css';

/**
 * מסך הקהל — "ראי" בלבד: מקבל snapshot מלא מהאדמין ומרנדר.
 */
/** משך השהיית המסך אחרי חיווי תשובה — נותן לקהל לראות את ה-✔/✘ */
const ANSWER_HOLD_MS = 1400;

export default function DisplayApp() {
  const [snapshot, setSnapshot] = useState<DisplaySnapshot | null>(null);

  useEffect(() => {
    const channel = new BroadcastChannel('funkt-farkert-sync');
    // השהיית מעבר אחרי תשובה: כשמגיע צליל נכון/שגוי (במסכים ללא טיימר רץ),
    // עדכוני המצב הבאים נאגרים ומוחלים רק אחרי שהחיווי הסתיים.
    let latest: DisplaySnapshot | null = null;
    let holdUntil = 0;
    let pending: DisplaySnapshot | null = null;
    let applyTimer: ReturnType<typeof setTimeout> | null = null;

    const apply = (s: DisplaySnapshot) => {
      latest = s;
      setSnapshot(s);
    };

    channel.addEventListener('message', (e: MessageEvent<SyncMessage>) => {
      if (e.data?.type === 'STATE') {
        const now = Date.now();
        if (now < holdUntil) {
          pending = e.data.snapshot;
          if (!applyTimer) {
            applyTimer = setTimeout(() => {
              applyTimer = null;
              if (pending) {
                apply(pending);
                pending = null;
              }
            }, holdUntil - now);
          }
        } else {
          apply(e.data.snapshot);
        }
      }
      if (e.data?.type === 'SOUND' && (e.data.name === 'correct' || e.data.name === 'wrong')) {
        // בסבבים מתוזמנים הקצב חשוב — לא משהים
        if (latest?.game.timer.status !== 'running') {
          holdUntil = Date.now() + ANSWER_HOLD_MS;
        }
      }
    });
    channel.postMessage({ type: 'SYNC_REQUEST' } satisfies SyncMessage);
    return () => {
      if (applyTimer) clearTimeout(applyTimer);
      channel.close();
    };
  }, []);

  return (
    <>
      <AmbientBackground />
      <SoundManager snapshot={snapshot} />
      <TransitionFlash screenKind={snapshot?.game.publicScreen.kind ?? null} />
      <AnswerFlash />
      <Screen snapshot={snapshot} />
      <FullscreenToggle />
      {/* באלקטרון החלון חסר מסגרת — רצועה שקופה בראש הדף מאפשרת גרירה */}
      {navigator.userAgent.includes('Electron') && <div className="drag-strip" aria-hidden="true" />}
    </>
  );
}

/** מסך מלא אמיתי — בלי מסגרת חלון וכפתורי דפדפן. לחיצה כפולה בכל מקום או על הכפתור בפינה. */
function FullscreenToggle() {
  const [fs, setFs] = useState<boolean>(() => !!document.fullscreenElement);

  useEffect(() => {
    const onChange = () => setFs(!!document.fullscreenElement);
    const toggle = () => {
      if (document.fullscreenElement) void document.exitFullscreen();
      else void document.documentElement.requestFullscreen().catch(() => {});
    };
    const onDblClick = () => toggle();
    // F11 — אותה התנהגות בדפדפן ובאלקטרון (מסך מלא של החלון)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'F11') {
        e.preventDefault();
        toggle();
      }
    };
    document.addEventListener('fullscreenchange', onChange);
    window.addEventListener('dblclick', onDblClick);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('fullscreenchange', onChange);
      window.removeEventListener('dblclick', onDblClick);
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  function toggle() {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen().catch(() => {});
  }

  return (
    <button
      className="fullscreen-btn"
      onClick={toggle}
      title={fs ? 'יציאה ממסך מלא (או Esc)' : 'מסך מלא (או לחיצה כפולה)'}
    >
      {fs ? '🗗' : '⛶'}
    </button>
  );
}

/** קרן ניאון חולפת בכל החלפת מסך */
function TransitionFlash({ screenKind }: { screenKind: string | null }) {
  const [flashKey, setFlashKey] = useState(0);
  const prevRef = useRef<string | null>(null);
  useEffect(() => {
    if (prevRef.current !== null && screenKind !== null && prevRef.current !== screenKind) {
      setFlashKey((k) => k + 1);
    }
    prevRef.current = screenKind;
  }, [screenKind]);
  if (flashKey === 0) return null;
  return <div key={flashKey} className="transition-flash" />;
}

function Screen({ snapshot }: { snapshot: DisplaySnapshot | null }) {
  if (!snapshot) {
    return (
      <div className="display-screen center">
        <Logo size="hero" decorations />
        <div className="display-waiting">ממתין לחיבור למסך הניהול…</div>
      </div>
    );
  }

  const { game } = snapshot;
  const screen = game.publicScreen;

  if (screen.kind === 'logo') {
    return (
      <div className="display-screen center">
        <div className="logo-entrance">
          <Logo size="hero" decorations />
        </div>
        {screen.subtitle && <div className="display-subtitle">{screen.subtitle}</div>}
      </div>
    );
  }

  if (screen.kind === 'stageA-intro') return <StageAIntro snapshot={snapshot} groupId={screen.groupId} />;
  if (screen.kind === 'stageA-question') return <StageAQuestion snapshot={snapshot} />;
  if (screen.kind === 'stageA-summary') return <StageASummary snapshot={snapshot} groupId={screen.groupId} />;
  if (screen.kind === 'stageB-pairs') return <StageBPairs snapshot={snapshot} />;
  if (screen.kind === 'stageB-match-intro') return <StageBMatchIntro snapshot={snapshot} matchIndex={screen.matchIndex} />;
  if (screen.kind === 'stageB-round') return <StageBRound snapshot={snapshot} />;
  if (screen.kind === 'stageB-match-summary') return <StageBMatchSummary snapshot={snapshot} matchIndex={screen.matchIndex} />;
  if (screen.kind === 'stageC-duel-intro') return <StageCDuelIntro snapshot={snapshot} duelIndex={screen.duelIndex} />;
  if (screen.kind === 'stageC-special') return <StageCSpecial snapshot={snapshot} />;
  if (screen.kind === 'stageC-image') return <StageCImage snapshot={snapshot} />;
  if (screen.kind === 'stageC-duel-summary') return <StageCDuelSummary snapshot={snapshot} duelIndex={screen.duelIndex} />;
  if (screen.kind === 'stageD-finalists') return <StageDFinalists snapshot={snapshot} />;
  if (screen.kind === 'stageD-round') return <StageDRound snapshot={snapshot} />;
  if (screen.kind === 'stageD-summary') return <StageDSummary snapshot={snapshot} />;
  if (screen.kind === 'stageD-winner') return <StageDWinner snapshot={snapshot} />;

  // stage-title — כותרת שלב
  return (
    <div className="display-screen center">
      <div className="stage-kicker">שלב {stageLetter(screen.stage)}'</div>
      <h1 className="stage-title-big">{STAGE_NAMES[screen.stage]}</h1>
      <div className="stage-underline" aria-hidden="true" />
      <div className="display-corner-logo">
        <Logo size="small" />
      </div>
    </div>
  );
}

function stageLetter(stage: 'A' | 'B' | 'C' | 'D'): string {
  return { A: 'א', B: 'ב', C: 'ג', D: 'ד' }[stage];
}
