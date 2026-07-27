import { useEffect, useState } from 'react';
import type { SyncMessage } from '../core/types';

/**
 * חיווי ויזואלי לתשובה: הבזק ירוק עם ✔ ענק לנכון, אדום עם ✘ לשגוי —
 * מסונכרן לאותם אירועים שמפעילים את הצלילים.
 */
export default function AnswerFlash() {
  const [flash, setFlash] = useState<{ kind: 'correct' | 'wrong'; key: number } | null>(null);

  useEffect(() => {
    const channel = new BroadcastChannel('funkt-farkert-sync');
    let counter = 0;
    channel.addEventListener('message', (e: MessageEvent<SyncMessage>) => {
      if (e.data?.type !== 'SOUND') return;
      if (e.data.name === 'correct' || e.data.name === 'wrong') {
        setFlash({ kind: e.data.name, key: ++counter });
      }
    });
    return () => channel.close();
  }, []);

  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 900);
    return () => clearTimeout(t);
  }, [flash]);

  if (!flash) return null;
  return (
    <div key={flash.key} className={`answer-flash ${flash.kind}`} aria-hidden="true">
      <span className="answer-flash-icon">{flash.kind === 'correct' ? '✔' : '✘'}</span>
    </div>
  );
}
