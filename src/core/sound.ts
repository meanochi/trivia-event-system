/**
 * מנוע הסאונד — צלילים סינתטיים ב-Web Audio, ללא קבצים חיצוניים.
 * מושמע בחלון מסך הקהל (המחובר להגברה).
 */

export type SoundName =
  | 'correct'
  | 'wrong'
  | 'tick'
  | 'timeup'
  | 'reveal'
  | 'winner'
  | 'question'
  | 'player'
  | 'whoosh';

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
        // סטינגר עולה מנצח — שלוש פעימות מהירות + נצנוץ
        tone(c, { freq: 659, dur: 0.09, type: 'triangle', vol: 0.3 });
        tone(c, { freq: 880, at: 0.07, dur: 0.09, type: 'triangle', vol: 0.32 });
        tone(c, { freq: 1318, at: 0.14, dur: 0.3, type: 'triangle', vol: 0.34 });
        tone(c, { freq: 2637, at: 0.16, dur: 0.22, type: 'sine', vol: 0.12 });
        break;
      case 'wrong':
        // צורם ומתוח — שני מתנדים צורמים יורדים יחד
        tone(c, { freq: 196, dur: 0.42, type: 'sawtooth', vol: 0.2, sweepTo: 98 });
        tone(c, { freq: 208, dur: 0.42, type: 'sawtooth', vol: 0.2, sweepTo: 104 });
        tone(c, { freq: 98, at: 0.02, dur: 0.4, type: 'triangle', vol: 0.18, sweepTo: 55 });
        break;
      case 'tick':
        tone(c, { freq: 1050, dur: 0.045, type: 'square', vol: 0.12 });
        break;
      case 'timeup':
        // בום עמוק + אזעקה משולשת — סוף זמן דרמטי
        tone(c, { freq: 90, dur: 1.0, type: 'sine', vol: 0.4, sweepTo: 45 });
        [0, 0.22, 0.44].forEach((at) => {
          tone(c, { freq: 466, at, dur: 0.16, type: 'square', vol: 0.2 });
          tone(c, { freq: 622, at, dur: 0.16, type: 'square', vol: 0.14 });
        });
        break;
      case 'reveal':
        [523, 659, 784, 1046].forEach((f, i) =>
          tone(c, { freq: f, at: i * 0.11, dur: 0.28, type: 'triangle', vol: 0.26 }),
        );
        break;
      case 'question':
        // "פופ" קצר לשאלה חדשה
        tone(c, { freq: 540, dur: 0.09, type: 'triangle', vol: 0.18, sweepTo: 940 });
        break;
      case 'player':
        // צליל תור/הופעת שחקן — פעמון כפול עדין
        tone(c, { freq: 988, dur: 0.09, type: 'sine', vol: 0.14 });
        tone(c, { freq: 1319, at: 0.07, dur: 0.14, type: 'sine', vol: 0.14 });
        break;
      case 'whoosh': {
        // מעבר מסך — רעש מסונן בסחיפה
        const dur = 0.4;
        const t0 = c.currentTime;
        const buffer = c.createBuffer(1, c.sampleRate * dur, c.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
        const src = c.createBufferSource();
        src.buffer = buffer;
        const bp = c.createBiquadFilter();
        bp.type = 'bandpass';
        bp.Q.value = 1.2;
        bp.frequency.setValueAtTime(400, t0);
        bp.frequency.exponentialRampToValueAtTime(3200, t0 + dur * 0.7);
        const g = c.createGain();
        g.gain.setValueAtTime(0.22, t0);
        g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
        src.connect(bp).connect(g).connect(c.destination);
        src.start(t0);
        break;
      }
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

/**
 * פעימת הטיימר — "דופק" מתוח שמתחזק ומאיץ לקראת הסוף.
 * progress: 0 (התחלה) עד 1 (סוף הזמן). urgent: 10 השניות האחרונות.
 */
export function playTimerBeat(progress: number, urgent: boolean): void {
  window.__lastSound = 'beat';
  try {
    const c = ac();
    const vol = 0.05 + progress * 0.2;
    const freq = 130 + progress * 50;
    // פעימה ראשית — "תוף לב"
    tone(c, { freq, dur: 0.1, type: 'sine', vol, sweepTo: freq * 0.6 });
    if (urgent) {
      // דופק כפול + טיק מתכתי — מתח שיא
      tone(c, { freq: freq * 1.1, at: 0.14, dur: 0.08, type: 'sine', vol: vol * 0.8, sweepTo: freq * 0.7 });
      tone(c, { freq: 1250, at: 0.02, dur: 0.04, type: 'square', vol: 0.14 });
    }
  } catch {
    // אודיו לא זמין
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
