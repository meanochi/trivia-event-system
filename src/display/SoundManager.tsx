import { useEffect, useRef, useState } from 'react';
import type { DisplaySnapshot, SyncMessage } from '../core/types';
import {
  playEffect,
  setGenerativeMusicVolume,
  startGenerativeMusic,
  stopGenerativeMusic,
} from '../core/sound';
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

  // אפקטים מהאדמין
  useEffect(() => {
    const channel = new BroadcastChannel('funkt-farkert-sync');
    channel.addEventListener('message', (e: MessageEvent<SyncMessage>) => {
      if (e.data?.type === 'SOUND' && enabledRef.current) playEffect(e.data.name);
    });
    return () => channel.close();
  }, []);

  // טיימר: טיק-טק וסיום
  const prevTimerRef = useRef<{ status: string; sec: number } | null>(null);
  useEffect(() => {
    if (!snapshot) return;
    const { timer } = snapshot.game;
    const sec = Math.ceil(timer.remainingMs / 1000);
    const prev = prevTimerRef.current;
    prevTimerRef.current = { status: timer.status, sec };
    if (!soundEnabled || !prev) return;
    if (timer.status === 'running' && sec !== prev.sec && sec <= 10 && sec > 0) {
      playEffect('tick');
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
      if (useFile) void el.play().catch(() => {});
      else el.pause();
    }
    return () => stopGenerativeMusic();
  }, [musicOn, trackUrl, musicVolume]);

  useEffect(() => {
    setGenerativeMusicVolume(musicVolume);
    if (audioRef.current) audioRef.current.volume = musicVolume;
  }, [musicVolume]);

  return trackUrl ? <audio ref={audioRef} src={trackUrl} loop /> : null;
}
