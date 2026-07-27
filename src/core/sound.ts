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
        // סטינגר מנצח מלא: ריצה עולה + אקורד מוחזק עם נצנוץ
        tone(c, { freq: 659, dur: 0.1, type: 'triangle', vol: 0.3 });
        tone(c, { freq: 880, at: 0.08, dur: 0.1, type: 'triangle', vol: 0.32 });
        tone(c, { freq: 1318, at: 0.16, dur: 0.55, type: 'triangle', vol: 0.34 });
        tone(c, { freq: 1661, at: 0.16, dur: 0.55, type: 'triangle', vol: 0.2 });
        tone(c, { freq: 659, at: 0.16, dur: 0.6, type: 'sine', vol: 0.22 });
        tone(c, { freq: 2637, at: 0.2, dur: 0.4, type: 'sine', vol: 0.13 });
        tone(c, { freq: 3322, at: 0.3, dur: 0.35, type: 'sine', vol: 0.08 });
        break;
      case 'wrong':
        // צורם, כבד וארוך — נפילה דרמטית
        tone(c, { freq: 220, dur: 0.65, type: 'sawtooth', vol: 0.22, sweepTo: 92 });
        tone(c, { freq: 233, dur: 0.65, type: 'sawtooth', vol: 0.22, sweepTo: 98 });
        tone(c, { freq: 110, at: 0.03, dur: 0.7, type: 'triangle', vol: 0.24, sweepTo: 50 });
        tone(c, { freq: 55, at: 0.05, dur: 0.75, type: 'sine', vol: 0.28, sweepTo: 38 });
        break;
      case 'tick':
        tone(c, { freq: 1050, dur: 0.045, type: 'square', vol: 0.14 });
        break;
      case 'timeup':
        // בום אדיר + אזעקה משולשת מתמשכת
        tone(c, { freq: 85, dur: 1.4, type: 'sine', vol: 0.45, sweepTo: 40 });
        tone(c, { freq: 170, dur: 0.8, type: 'sawtooth', vol: 0.15, sweepTo: 60 });
        [0, 0.25, 0.5].forEach((at, i) => {
          tone(c, { freq: 466, at, dur: 0.2, type: 'square', vol: 0.22 - i * 0.03 });
          tone(c, { freq: 622, at, dur: 0.2, type: 'square', vol: 0.16 - i * 0.03 });
        });
        break;
      case 'reveal':
        // פנפרת חשיפה מלאה — ריצה ארוכה עם הד ואקורד סיום
        [523, 659, 784, 1046, 1318, 1568].forEach((f, i) =>
          tone(c, { freq: f, at: i * 0.1, dur: 0.3, type: 'triangle', vol: 0.26 }),
        );
        [523, 659, 784].forEach((f, i) =>
          tone(c, { freq: f, at: 0.14 + i * 0.1, dur: 0.22, type: 'sine', vol: 0.1 }),
        );
        tone(c, { freq: 1046, at: 0.65, dur: 0.7, type: 'triangle', vol: 0.28 });
        tone(c, { freq: 1318, at: 0.65, dur: 0.7, type: 'triangle', vol: 0.22 });
        tone(c, { freq: 2093, at: 0.7, dur: 0.6, type: 'sine', vol: 0.12 });
        break;
      case 'question':
        // הכרזת שאלה — פופ עולה + פעמון
        tone(c, { freq: 440, dur: 0.12, type: 'triangle', vol: 0.2, sweepTo: 880 });
        tone(c, { freq: 1760, at: 0.1, dur: 0.3, type: 'sine', vol: 0.12 });
        break;
      case 'player':
        // הופעת שחקן/תור — שלישיית פעמונים
        tone(c, { freq: 784, dur: 0.1, type: 'sine', vol: 0.15 });
        tone(c, { freq: 988, at: 0.08, dur: 0.1, type: 'sine', vol: 0.16 });
        tone(c, { freq: 1319, at: 0.16, dur: 0.28, type: 'sine', vol: 0.17 });
        break;
      case 'whoosh': {
        // מעבר מסך מרענן: סחיפה עולה + שני פעמונים בהירים
        const dur = 0.5;
        const t0 = c.currentTime;
        const buffer = c.createBuffer(1, c.sampleRate * dur, c.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) {
          const p = i / data.length;
          data[i] = (Math.random() * 2 - 1) * Math.sin(p * Math.PI);
        }
        const src = c.createBufferSource();
        src.buffer = buffer;
        const bp = c.createBiquadFilter();
        bp.type = 'bandpass';
        bp.Q.value = 1.4;
        bp.frequency.setValueAtTime(700, t0);
        bp.frequency.exponentialRampToValueAtTime(5200, t0 + dur * 0.8);
        const g = c.createGain();
        g.gain.setValueAtTime(0.16, t0);
        g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
        src.connect(bp).connect(g).connect(c.destination);
        src.start(t0);
        tone(c, { freq: 1046, at: 0.16, dur: 0.2, type: 'sine', vol: 0.15 });
        tone(c, { freq: 1568, at: 0.28, dur: 0.35, type: 'sine', vol: 0.16 });
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
    const vol = 0.16 + progress * 0.22;
    const freq = 140 + progress * 60;
    // פעימה ראשית — "תוף לב" + טיק מתכתי שנשמע תמיד
    tone(c, { freq, dur: 0.12, type: 'sine', vol, sweepTo: freq * 0.55 });
    tone(c, { freq: 1150, at: 0.01, dur: 0.04, type: 'square', vol: 0.08 + progress * 0.08 });
    if (urgent) {
      // דופק כפול מהיר + טיק גבוה — מתח שיא
      tone(c, { freq: freq * 1.12, at: 0.16, dur: 0.1, type: 'sine', vol: vol * 0.9, sweepTo: freq * 0.6 });
      tone(c, { freq: 1450, at: 0.17, dur: 0.05, type: 'square', vol: 0.16 });
    }
  } catch {
    // אודיו לא זמין
  }
}

/* ===== מוזיקת רקע גנרטיבית ===== */

let musicGain: GainNode | null = null;
let musicInterval: ReturnType<typeof setInterval> | null = null;

/** לולאת רקע סוערת ואנרגטית — קצב דוחף, בס פועם, מתופים ואקורדים */
export function startGenerativeMusic(volume: number): void {
  stopGenerativeMusic();
  window.__musicOn = true;
  try {
    const c = ac();
    musicGain = c.createGain();
    musicGain.gain.value = volume;
    const lowpass = c.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 4200;
    musicGain.connect(lowpass).connect(c.destination);

    // לופ אקורדים אנרגטי: Am → F → C → G (תיבה לכל אקורד, 8 צעדים לתיבה)
    const CHORDS = [
      { bass: 110, notes: [220, 262, 330, 440] },
      { bass: 87.3, notes: [175, 220, 262, 349] },
      { bass: 130.8, notes: [262, 330, 392, 523] },
      { bass: 98, notes: [196, 247, 294, 392] },
    ];
    const STEP = 0.165; // ~180 פעימות שמיניות בדקה — דוחף

    function noiseBurst(t: number, dur: number, vol: number, highpass = 5000) {
      if (!musicGain) return;
      const buf = c.createBuffer(1, Math.ceil(c.sampleRate * dur), c.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
      const src = c.createBufferSource();
      src.buffer = buf;
      const hp = c.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = highpass;
      const g = c.createGain();
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      src.connect(hp).connect(g).connect(musicGain);
      src.start(t);
    }

    function note(t: number, freq: number, dur: number, vol: number, type: OscillatorType = 'triangle') {
      if (!musicGain) return;
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = type;
      o.frequency.value = freq;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(vol, t + 0.015);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.connect(g).connect(musicGain);
      o.start(t);
      o.stop(t + dur + 0.05);
    }

    let step = 0;
    const playStep = () => {
      if (!musicGain) return;
      const t = c.currentTime;
      const bar = Math.floor(step / 8) % CHORDS.length;
      const inBar = step % 8;
      const chord = CHORDS[bar];

      // בס פועם בכל צעד — המנוע של האנרגיה
      note(t, chord.bass, 0.16, inBar % 2 === 0 ? 0.5 : 0.34, 'sawtooth');
      note(t, chord.bass / 2, 0.18, 0.3, 'sine');

      // "היי-האט" בכל צעד, מודגש באוף-ביט
      noiseBurst(t, 0.04, inBar % 2 === 1 ? 0.14 : 0.07);

      // "סנר" על 2 ו-4
      if (inBar === 2 || inBar === 6) noiseBurst(t, 0.12, 0.2, 1800);

      // ליד — ארפג'יו מתרוצץ עם קפיצות אוקטבה
      const seq = [0, 2, 1, 3, 2, 0, 3, 1];
      const lead = chord.notes[seq[inBar]] * (inBar === 3 || inBar === 7 ? 2 : 1);
      note(t, lead, 0.22, 0.16);

      // סטאב אקורד בתחילת כל תיבה
      if (inBar === 0) {
        chord.notes.forEach((f) => note(t, f, 0.3, 0.1, 'square'));
      }
      step++;
    };

    playStep();
    musicInterval = setInterval(playStep, STEP * 1000);
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
