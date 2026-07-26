import { useEffect, useState } from 'react';
import type { DisplaySnapshot, SyncMessage } from '../core/types';
import { STAGE_NAMES } from '../core/types';
import Logo from '../components/Logo';
import './display.css';

/**
 * מסך הקהל — "ראי" בלבד: מקבל snapshot מלא מהאדמין ומרנדר.
 */
export default function DisplayApp() {
  const [snapshot, setSnapshot] = useState<DisplaySnapshot | null>(null);

  useEffect(() => {
    const channel = new BroadcastChannel('funkt-farkert-sync');
    channel.addEventListener('message', (e: MessageEvent<SyncMessage>) => {
      if (e.data?.type === 'STATE') setSnapshot(e.data.snapshot);
    });
    channel.postMessage({ type: 'SYNC_REQUEST' } satisfies SyncMessage);
    return () => channel.close();
  }, []);

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
