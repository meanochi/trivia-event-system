/**
 * מנוע הסאונד — צלילים סינתטיים ב-Web Audio, ללא קבצים חיצוניים.
 * מושמע בחלון מסך הקהל (המחובר להגברה).
 */

export type SoundName = 'correct' | 'wrong' | 'tick' | 'timeup' | 'reveal' | 'winner';

let ctx: AudioContext | null = null;

function ac(): AudioContext {
  if (!ctx) {
    ctx = new AudioContext();
    // דפדפן רגיל דורש מחוות משתמש להפעלת אודיו — משחררים בלחיצה הראשונה
    const resume = () => {
      if (ctx && ctx.state === 'suspended') void ctx.resume();
    };
    document.addEventListener('click', resume);
    document.addEventListener('keydown', resume);
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function tone(
  c: AudioContext,
  {
    freq,
    at = 0,
    dur = 0.15,
    type = 'sine',
    vol = 0.22,
    sweepTo,
  }: {
    freq: number;
    at?: number;
    dur?: number;
    type?: OscillatorType;
    vol?: number;
    sweepTo?: number;
  },
) {
  const t0 = c.currentTime + at;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (sweepTo) osc.frequency.exponentialRampToValueAtTime(sweepTo, t0 + dur);
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(vol, t0 + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  osc.connect(gain).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

/** חשיפה לבדיקות אוטומטיות */
declare global {
  interface Window {
    __lastSound?: string;
    __musicOn?: boolean;
  }
}

export function playEffect(name: SoundName): void {
  window.__lastSound = name;
  try {
    const c = ac();
    switch (name) {
      case 'correct':
        tone(c, { freq: 880, dur: 0.12, type: 'triangle', vol: 0.3 });
        tone(c, { freq: 1318, at: 0.09, dur: 0.22, type: 'triangle', vol: 0.3 });
        break;
      case 'wrong':
        tone(c, { freq: 170, dur: 0.32, type: 'sawtooth', vol: 0.25, sweepTo: 110 });
        break;
      case 'tick':
        tone(c, { freq: 1050, dur: 0.045, type: 'square', vol: 0.12 });
        break;
      case 'timeup':
        tone(c, { freq: 520, dur: 0.75, type: 'triangle', vol: 0.32, sweepTo: 120 });
        tone(c, { freq: 260, at: 0.05, dur: 0.75, type: 'sawtooth', vol: 0.14, sweepTo: 60 });
        break;
      case 'reveal':
        [523, 659, 784, 1046].forEach((f, i) =>
          tone(c, { freq: f, at: i * 0.11, dur: 0.28, type: 'triangle', vol: 0.26 }),
        );
        break;
      case 'winner':
        // פנפרה: שלוש פעימות + סיום גבוה, בשתי שכבות
        [523, 523, 523, 784].forEach((f, i) =>
          tone(c, { freq: f, at: i * 0.17, dur: i === 3 ? 0.7 : 0.14, type: 'square', vol: 0.2 }),
        );
        [262, 262, 262, 392].forEach((f, i) =>
          tone(c, { freq: f, at: i * 0.17, dur: i === 3 ? 0.7 : 0.14, type: 'triangle', vol: 0.22 }),
        );
        [1046, 1318, 1568, 2093].forEach((f, i) =>
          tone(c, { freq: f, at: 0.75 + i * 0.09, dur: 0.35, type: 'triangle', vol: 0.18 }),
        );
        break;
    }
  } catch {
    // אודיו לא זמין — ממשיכים בשקט
  }
}

/* ===== מוזיקת רקע גנרטיבית ===== */

let musicGain: GainNode | null = null;
let musicInterval: ReturnType<typeof setInterval> | null = null;

/** לולאת רקע עדינה בסולם מינורי — עד שיוחלף בקובץ מוזיקה אמיתי */
export function startGenerativeMusic(volume: number): void {
  stopGenerativeMusic();
  window.__musicOn = true;
  try {
    const c = ac();
    musicGain = c.createGain();
    musicGain.gain.value = volume;
    const lowpass = c.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 2400;
    musicGain.connect(lowpass).connect(c.destination);

    // Am פנטטוני: A C D E G
    const scale = [220, 262, 294, 330, 392];
    const bass = [110, 98, 87, 98];
    let step = 0;
    let bar = 0;

    const playStep = () => {
      if (!musicGain) return;
      const t = c.currentTime;
      if (step % 8 === 0) {
        // בס בתחילת כל תיבה
        const b = c.createOscillator();
        const bg = c.createGain();
        b.type = 'sine';
        b.frequency.value = bass[bar % bass.length];
        bg.gain.setValueAtTime(0.5, t);
        bg.gain.exponentialRampToValueAtTime(0.001, t + 1.9);
        b.connect(bg).connect(musicGain);
        b.start(t);
        b.stop(t + 2);
        bar++;
      }
      const note = scale[(step * 3 + bar) % scale.length] * (step % 4 === 2 ? 2 : 1);
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = 'triangle';
      o.frequency.value = note;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.16, t + 0.03);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.42);
      o.connect(g).connect(musicGain);
      o.start(t);
      o.stop(t + 0.5);
      step++;
    };

    playStep();
    musicInterval = setInterval(playStep, 250);
  } catch {
    // אודיו לא זמין
  }
}

export function stopGenerativeMusic(): void {
  window.__musicOn = false;
  if (musicInterval) {
    clearInterval(musicInterval);
    musicInterval = null;
  }
  if (musicGain) {
    musicGain.disconnect();
    musicGain = null;
  }
}

export function setGenerativeMusicVolume(volume: number): void {
  if (musicGain) musicGain.gain.value = volume;
}
