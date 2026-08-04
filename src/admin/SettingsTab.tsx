import { useRef } from 'react';
import { useAdminStore } from '../core/adminStore';
import { deleteImage, saveImage } from '../core/db';
import { newId } from '../core/format';

export default function SettingsTab() {
  const { game, dispatch } = useAdminStore();
  const { settings } = game;
  const musicFileRef = useRef<HTMLInputElement>(null);

  function uploadMusic(file: File) {
    const id = newId('music');
    saveImage(id, file)
      .then(() => {
        if (settings.musicTrackId) void deleteImage(settings.musicTrackId);
        dispatch({ type: 'UPDATE_SETTINGS', patch: { musicTrackId: id } });
      })
      .catch((err: unknown) => {
        window.alert(`העלאת קובץ המוזיקה נכשלה: ${err instanceof Error ? err.message : String(err)}`);
      });
  }

  return (
    <div className="panel settings-tab">
      <h2 className="section-title">הגדרות</h2>

      <label className="setting-row">
        <span>אפקטים קוליים (נכון/שגוי, טיימר, חשיפות, ניצחון)</span>
        <button
          className={`btn ${settings.soundEnabled ? 'btn-primary' : ''}`}
          onClick={() => dispatch({ type: 'UPDATE_SETTINGS', patch: { soundEnabled: !settings.soundEnabled } })}
        >
          {settings.soundEnabled ? '🔊 פעילים' : '🔇 מושתקים'}
        </button>
        <span className="hint">ההשתקה הכללית משתיקה גם את המוזיקה</span>
      </label>

      <div className="setting-row">
        <span>מוזיקת רקע (זמינה בכל שלבי המשחק)</span>
        <button
          className={`btn ${settings.musicPlaying ? 'btn-primary' : ''}`}
          onClick={() => dispatch({ type: 'UPDATE_SETTINGS', patch: { musicPlaying: !settings.musicPlaying } })}
        >
          {settings.musicPlaying ? '🎵 מתנגנת' : '⏹ כבויה'}
        </button>
        <label className="volume-label">
          עוצמה
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={settings.musicVolume}
            onChange={(e) =>
              dispatch({ type: 'UPDATE_SETTINGS', patch: { musicVolume: Number(e.target.value) } })
            }
          />
        </label>
      </div>

      <div className="setting-row">
        <span>קובץ המוזיקה</span>
        {settings.musicTrackId ? (
          <>
            <span className="advance-badge">🎶 קובץ מותאם אישית</span>
            <button
              className="btn btn-danger-outline btn-mini"
              onClick={() => {
                if (settings.musicTrackId) void deleteImage(settings.musicTrackId);
                dispatch({ type: 'UPDATE_SETTINGS', patch: { musicTrackId: null } });
              }}
            >
              הסר (חזרה ללחן המובנה)
            </button>
          </>
        ) : (
          <>
            <span className="hint">כרגע: הלחן המובנה. אפשר להעלות קובץ MP3/WAV משלכם:</span>
            <button className="btn" onClick={() => musicFileRef.current?.click()}>
              🎵 העלאת קובץ מוזיקה
            </button>
          </>
        )}
        <input
          ref={musicFileRef}
          type="file"
          accept="audio/*"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (f) uploadMusic(f);
          }}
        />
      </div>

      <label className="setting-row">
        <span>מספר פיינליסטים בגמר</span>
        <span className="setting-options">
          {([2, 3] as const).map((n) => (
            <button
              key={n}
              className={`btn ${settings.finalistCount === n ? 'btn-primary' : ''}`}
              onClick={() => dispatch({ type: 'UPDATE_SETTINGS', patch: { finalistCount: n } })}
            >
              {n} שחקנים
            </button>
          ))}
        </span>
      </label>

      <p className="hint">האפקטים והמוזיקה מושמעים מחלון מסך הקהל — ודאו שהרמקולים מחוברים אליו.</p>
    </div>
  );
}
