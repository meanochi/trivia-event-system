import { useEffect, useRef, useState } from 'react';
import type { DisplaySnapshot, SyncMessage } from '../core/types';
import {
  playEffect,
  playTimerBeat,
  setGenerativeMusicVolume,
  startGenerativeMusic,
  stopGenerativeMusic,
} from '../core/sound';
import { stageAActivePlayerId, stageCActivePlayerId } from '../core/reducer';
import { loadImage } from '../core/db';

/**
 * מנהל הסאונד של מסך הקהל:
 * - אפקטים לפי הודעות מהאדמין (נכון/שגוי/חשיפה/ניצחון)
 * - טיק-טק ב-10 השניות האחרונות + צליל סיום זמן (לפי מצב הטיימר)
 * - מוזיקת רקע: קובץ שהועלה, או הלחן הגנרטיבי המובנה
 */
export default function SoundManager({ snapshot }: { snapshot: DisplaySnapshot | null }) {
  const soundEnabled = snapshot?.game.settings.soundEnabled ?? true;
  const enabledRef = useRef(soundEnabled);
  enabledRef.current = soundEnabled;

  // אפקטים מהאדמין (נכון/שגוי/חשיפה/ניצחון) — עדיפות עליונה
  const lastAdminSoundRef = useRef(0);
  useEffect(() => {
    const channel = new BroadcastChannel('funkt-farkert-sync');
    channel.addEventListener('message', (e: MessageEvent<SyncMessage>) => {
      if (e.data?.type === 'SOUND' && enabledRef.current) {
        lastAdminSoundRef.current = Date.now();
        playEffect(e.data.name);
      }
    });
    return () => channel.close();
  }, []);

  // צלילים נגזרים ממצב המשחק: מעבר מסך, שאלה חדשה, החלפת תור.
  // מדוכאים כשאפקט אדמין (נכון/שגוי) הושמע זה עתה — כדי שלא יהיה עומס צלילים.
  const derivedRef = useRef<{ screen: string; question: string | null; player: string | null } | null>(null);
  useEffect(() => {
    if (!snapshot) return;
    const current = {
      screen: snapshot.game.publicScreen.kind,
      question: snapshot.questionText,
      player: stageAActivePlayerId(snapshot.game) ?? stageCActivePlayerId(snapshot.game),
    };
    const prev = derivedRef.current;
    derivedRef.current = current;
    if (!prev || !soundEnabled) return;
    const adminJustPlayed = Date.now() - lastAdminSoundRef.current < 350;

    if (current.screen !== prev.screen) {
      playEffect('whoosh');
      return; // מעבר מסך גובר על השאר
    }
    if (adminJustPlayed) return;
    if (current.question && current.question !== prev.question) {
      playEffect('question');
      return;
    }
    if (current.player && prev.player && current.player !== prev.player) {
      playEffect('player');
    }
  }, [snapshot, soundEnabled]);

  // טיימר: פעימת מתח מתגברת לאורך כל הריצה + צליל סיום
  const prevTimerRef = useRef<{ status: string; sec: number } | null>(null);
  useEffect(() => {
    if (!snapshot) return;
    const { timer } = snapshot.game;
    const sec = Math.ceil(timer.remainingMs / 1000);
    const prev = prevTimerRef.current;
    prevTimerRef.current = { status: timer.status, sec };
    if (!soundEnabled || !prev) return;
    if (timer.status === 'running' && sec !== prev.sec && sec > 0) {
      const progress = timer.totalMs > 0 ? 1 - timer.remainingMs / timer.totalMs : 0;
      playTimerBeat(progress, sec <= 10);
    }
    if (timer.status === 'finished' && prev.status === 'running') {
      playEffect('timeup');
    }
  }, [snapshot, soundEnabled]);

  // מוזיקת רקע
  const settings = snapshot?.game.settings;
  const musicOn = Boolean(settings?.musicPlaying && soundEnabled);
  const musicVolume = settings?.musicVolume ?? 0.35;
  const musicTrackId = settings?.musicTrackId ?? null;
  const [trackUrl, setTrackUrl] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    let objUrl: string | null = null;
    if (musicTrackId) {
      void loadImage(musicTrackId).then((blob) => {
        if (blob && alive) {
          objUrl = URL.createObjectURL(blob);
          setTrackUrl(objUrl);
        }
      });
    } else {
      setTrackUrl(null);
    }
    return () => {
      alive = false;
      if (objUrl) URL.revokeObjectURL(objUrl);
    };
  }, [musicTrackId]);

  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const useFile = musicOn && trackUrl;
    // לחן מובנה רק כשאין קובץ
    if (musicOn && !trackUrl) startGenerativeMusic(musicVolume);
    else stopGenerativeMusic();

    const el = audioRef.current;
    if (el) {
      el.volume = musicVolume;
      el.loop = true;
      if (useFile) void el.play().catch(() => {});
      else el.pause();
    }
    return () => stopGenerativeMusic();
  }, [musicOn, trackUrl, musicVolume]);

  useEffect(() => {
    setGenerativeMusicVolume(musicVolume);
    if (audioRef.current) audioRef.current.volume = musicVolume;
  }, [musicVolume]);

  // loop + הפעלה מחדש ב-onEnded — חגורה ושלייקס: גם אם ה-loop של הדפדפן
  // נכשל (קורה עם קבצים/פורמטים מסוימים), המנגינה מתחילה שוב מיד
  return trackUrl ? (
    <audio
      ref={audioRef}
      src={trackUrl}
      loop
      onEnded={(e) => {
        const el = e.currentTarget;
        el.currentTime = 0;
        void el.play().catch(() => {});
      }}
    />
  ) : null;
}
