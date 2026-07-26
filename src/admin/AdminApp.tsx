import { useEffect, useState } from 'react';
import { restoreAdminState, useAdminStore } from '../core/adminStore';
import Logo from '../components/Logo';
import GameTab from './GameTab';
import PlayersTab from './PlayersTab';
import QuestionsTab from './QuestionsTab';
import SettingsTab from './SettingsTab';
import './admin.css';

type TabId = 'game' | 'players' | 'questions' | 'settings';

const TABS: { id: TabId; label: string }[] = [
  { id: 'game', label: '🎮 משחק' },
  { id: 'players', label: '👥 שחקנים' },
  { id: 'questions', label: '❓ שאלות' },
  { id: 'settings', label: '⚙️ הגדרות' },
];

export default function AdminApp() {
  const { historyLength, loaded, undo, resetGame } = useAdminStore();
  const [tab, setTab] = useState<TabId>('game');
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    void restoreAdminState();
  }, []);

  if (!loaded) return <div className="admin-loading">טוען את המשחק…</div>;

  return (
    <div className="admin">
      <header className="admin-topbar">
        <div className="topbar-logo">
          <Logo size="small" />
        </div>
        <nav className="admin-tabs">
          {TABS.map((t) => (
            <button
              key={t.id}
              className={`tab-btn ${tab === t.id ? 'active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </nav>
        <div className="topbar-actions">
          <button className="btn btn-outline-yellow" onClick={undo} disabled={historyLength === 0}>
            ⟲ חזור ({historyLength})
          </button>
          {confirmReset ? (
            <span className="confirm-reset">
              לאפס את המשחק? (התוכן נשמר)
              <button
                className="btn btn-danger btn-mini"
                onClick={() => {
                  resetGame();
                  setConfirmReset(false);
                }}
              >
                כן, אפס
              </button>
              <button className="btn btn-mini" onClick={() => setConfirmReset(false)}>
                ביטול
              </button>
            </span>
          ) : (
            <button className="btn btn-danger-outline" onClick={() => setConfirmReset(true)}>
              איפוס משחק
            </button>
          )}
        </div>
      </header>

      <main className="admin-main">
        {tab === 'game' && <GameTab />}
        {tab === 'players' && <PlayersTab />}
        {tab === 'questions' && <QuestionsTab />}
        {tab === 'settings' && <SettingsTab />}
      </main>
    </div>
  );
}
