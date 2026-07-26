import { useAdminStore } from '../core/adminStore';

const MINUTE = 60 * 1000;

export default function SettingsTab() {
  const { game, dispatch } = useAdminStore();
  const { settings } = game;

  return (
    <div className="panel settings-tab">
      <h2 className="section-title">הגדרות</h2>

      <label className="setting-row">
        <span>סאונד</span>
        <button
          className={`btn ${settings.soundEnabled ? 'btn-primary' : ''}`}
          onClick={() => dispatch({ type: 'UPDATE_SETTINGS', patch: { soundEnabled: !settings.soundEnabled } })}
        >
          {settings.soundEnabled ? '🔊 פעיל' : '🔇 מושתק'}
        </button>
      </label>

      <label className="setting-row">
        <span>משך סבב גמר לכל מתמודד</span>
        <span className="setting-options">
          {[2, 3].map((min) => (
            <button
              key={min}
              className={`btn ${settings.finaleRoundMs === min * MINUTE ? 'btn-primary' : ''}`}
              onClick={() => dispatch({ type: 'UPDATE_SETTINGS', patch: { finaleRoundMs: min * MINUTE } })}
            >
              {min}:00 דקות
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
