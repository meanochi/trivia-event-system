import { useAdminStore } from '../core/adminStore';

export default function SettingsTab() {
  const { game, dispatch } = useAdminStore();
  const { settings } = game;

  return (
    <div className="panel settings-tab">
      <h2 className="section-title">הגדרות</h2>

      <label className="setting-row">
        <span>אפקטים קוליים</span>
        <button
          className={`btn ${settings.soundEnabled ? 'btn-primary' : ''}`}
          onClick={() => dispatch({ type: 'UPDATE_SETTINGS', patch: { soundEnabled: !settings.soundEnabled } })}
        >
          {settings.soundEnabled ? '🔊 פעילים' : '🔇 מושתקים'}
        </button>
      </label>

      <label className="setting-row">
        <span>מוזיקת רקע (זמינה בכל שלבי המשחק)</span>
        <button
          className={`btn ${settings.musicPlaying ? 'btn-primary' : ''}`}
          onClick={() => dispatch({ type: 'UPDATE_SETTINGS', patch: { musicPlaying: !settings.musicPlaying } })}
        >
          {settings.musicPlaying ? '🎵 מתנגנת' : '⏹ כבויה'}
        </button>
        <span className="hint">נגן המוזיקה עצמו (קבצים ועוצמה) ייבנה בשלב הסאונד.</span>
      </label>

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

      <p className="hint">
        הגדרות נוספות (שקלול פיינליסטים, חלוקת דו־קרבות) יתווספו עם בניית השלבים.
      </p>
    </div>
  );
}
