import { useState } from 'react';
import { useAdminStore } from '../core/adminStore';
import { newId } from '../core/format';
import { GROUP_IDS, type GroupId } from '../core/types';

/**
 * ניהול שחקנים — גרסה ראשונית: הוספה ידנית, ייבוא מרשימה, שיוך לקבוצות ומחיקה.
 * (מסך הייבוא המלא עם קבצים ותמונות — בשלב הפיתוח הבא של ניהול התוכן.)
 */
export default function PlayersTab() {
  const { content, updateContent } = useAdminStore();
  const [newName, setNewName] = useState('');
  const [importText, setImportText] = useState('');
  const [showImport, setShowImport] = useState(false);

  function addPlayer(name: string, groupId: GroupId | null = null) {
    const trimmed = name.trim();
    if (!trimmed) return;
    updateContent((c) => ({
      ...c,
      players: [...c.players, { id: newId('p'), name: trimmed, groupId }],
    }));
  }

  function importList() {
    const names = importText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    if (names.length === 0) return;
    updateContent((c) => ({
      ...c,
      players: [
        ...c.players,
        // שיבוץ אוטומטי: ממלאים קבוצות לפי הסדר, 5 בכל קבוצה
        ...names.map((name, i) => {
          const existing = c.players.length + i;
          const groupId = existing < 20 ? GROUP_IDS[Math.floor(existing / 5)] : null;
          return { id: newId('p'), name, groupId };
        }),
      ],
    }));
    setImportText('');
    setShowImport(false);
  }

  function setGroup(playerId: string, groupId: GroupId | null) {
    updateContent((c) => ({
      ...c,
      players: c.players.map((p) => (p.id === playerId ? { ...p, groupId } : p)),
    }));
  }

  function removePlayer(playerId: string) {
    updateContent((c) => ({
      ...c,
      players: c.players.filter((p) => p.id !== playerId),
    }));
  }

  return (
    <div className="players-tab">
      <section className="panel">
        <h2 className="section-title">שחקנים ({content.players.length}/20)</h2>

        <div className="add-player-row">
          <input
            className="input"
            placeholder="שם שחקן חדש…"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                addPlayer(newName);
                setNewName('');
              }
            }}
          />
          <button
            className="btn btn-primary"
            onClick={() => {
              addPlayer(newName);
              setNewName('');
            }}
          >
            הוסף
          </button>
          <button className="btn" onClick={() => setShowImport((v) => !v)}>
            📋 ייבוא רשימה
          </button>
        </div>

        {showImport && (
          <div className="import-box">
            <p className="hint">הדביקו רשימת שמות — שם בכל שורה. השיבוץ לקבוצות אוטומטי (5 בקבוצה) וניתן לשינוי.</p>
            <textarea
              className="input textarea"
              rows={6}
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder={'אברהם כהן\nיוסף לוי\n…'}
            />
            <button className="btn btn-primary" onClick={importList}>
              ייבא {importText.split('\n').filter((s) => s.trim()).length} שמות
            </button>
          </div>
        )}
      </section>

      <div className="groups-grid">
        {GROUP_IDS.map((gid, gi) => {
          const members = content.players.filter((p) => p.groupId === gid);
          return (
            <section key={gid} className="panel group-card">
              <h3 className="score-group-title">
                קבוצה {gi + 1} <span className="hint">({members.length}/5)</span>
              </h3>
              <ul className="group-list">
                {members.map((p) => (
                  <PlayerRow key={p.id} name={p.name} groupId={p.groupId} onSetGroup={(g) => setGroup(p.id, g)} onRemove={() => removePlayer(p.id)} />
                ))}
              </ul>
            </section>
          );
        })}
        <section className="panel group-card">
          <h3 className="score-group-title">
            ללא קבוצה <span className="hint">({content.players.filter((p) => !p.groupId).length})</span>
          </h3>
          <ul className="group-list">
            {content.players
              .filter((p) => !p.groupId)
              .map((p) => (
                <PlayerRow key={p.id} name={p.name} groupId={p.groupId} onSetGroup={(g) => setGroup(p.id, g)} onRemove={() => removePlayer(p.id)} />
              ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

function PlayerRow({
  name,
  groupId,
  onSetGroup,
  onRemove,
}: {
  name: string;
  groupId: GroupId | null;
  onSetGroup: (g: GroupId | null) => void;
  onRemove: () => void;
}) {
  return (
    <li className="player-row">
      <span className="score-name">{name}</span>
      <select
        className="input select"
        value={groupId ?? ''}
        onChange={(e) => onSetGroup((e.target.value || null) as GroupId | null)}
      >
        <option value="">ללא</option>
        {GROUP_IDS.map((g, i) => (
          <option key={g} value={g}>
            קבוצה {i + 1}
          </option>
        ))}
      </select>
      <button className="btn btn-mini btn-danger-outline" onClick={onRemove} title="מחיקה">
        ✕
      </button>
    </li>
  );
}
