import { useRef, useState } from 'react';
import { useAdminStore } from '../core/adminStore';
import { newId } from '../core/format';
import { GROUP_IDS, type GroupId } from '../core/types';

/**
 * ניהול שחקנים — גרסה ראשונית: הוספה ידנית, ייבוא מרשימה, שיוך לקבוצות ומחיקה.
 * (מסך הייבוא המלא עם קבצים ותמונות — בשלב הפיתוח הבא של ניהול התוכן.)
 */
/** זיהוי שורת כותרת קבוצה בייבוא: "קבוצה 1:" / "קבוצה א':" וכדומה */
const GROUP_TOKENS: Record<string, GroupId> = {
  '1': 'g1', 'א': 'g1',
  '2': 'g2', 'ב': 'g2',
  '3': 'g3', 'ג': 'g3',
  '4': 'g4', 'ד': 'g4',
};

function parseGroupHeader(line: string): GroupId | null {
  const m = line.match(/^קבוצה\s*([1-4אבגד])['׳]?\s*:?\s*$/);
  return m ? GROUP_TOKENS[m[1]] : null;
}

export default function PlayersTab() {
  const { content, updateContent } = useAdminStore();
  const [newName, setNewName] = useState('');
  const [newGroup, setNewGroup] = useState<GroupId | ''>('g1');
  const [importText, setImportText] = useState('');
  const [showImport, setShowImport] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function addPlayer(name: string, groupId: GroupId | null = null) {
    const trimmed = name.trim();
    if (!trimmed) return;
    updateContent((c) => ({
      ...c,
      players: [...c.players, { id: newId('p'), name: trimmed, groupId }],
    }));
  }

  function importList() {
    // שורת "קבוצה X:" קובעת את הקבוצה לכל השמות שאחריה; שמות לפניה — ללא קבוצה
    const lines = importText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    let currentGroup: GroupId | null = null;
    const newPlayers: { id: string; name: string; groupId: GroupId | null }[] = [];
    for (const line of lines) {
      const header = parseGroupHeader(line);
      if (header) {
        currentGroup = header;
      } else {
        newPlayers.push({ id: newId('p'), name: line, groupId: currentGroup });
      }
    }
    if (newPlayers.length === 0) return;
    updateContent((c) => ({ ...c, players: [...c.players, ...newPlayers] }));
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
                addPlayer(newName, newGroup || null);
                setNewName('');
              }
            }}
          />
          <select
            className="input select"
            value={newGroup}
            onChange={(e) => setNewGroup(e.target.value as GroupId | '')}
            title="הקבוצה שאליה יתווסף השחקן"
          >
            {GROUP_IDS.map((g, i) => (
              <option key={g} value={g}>
                קבוצה {i + 1}
              </option>
            ))}
            <option value="">ללא קבוצה</option>
          </select>
          <button
            className="btn btn-primary"
            onClick={() => {
              addPlayer(newName, newGroup || null);
              setNewName('');
            }}
          >
            הוסף
          </button>
          <button className="btn" onClick={() => setShowImport((v) => !v)}>
            📋 ייבוא רשימה
          </button>
          <button className="btn" onClick={() => fileRef.current?.click()}>
            📄 מקובץ
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".txt,.csv,text/plain"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) {
                void f.text().then((t) => {
                  setImportText(t);
                  setShowImport(true);
                });
              }
              e.target.value = '';
            }}
          />
        </div>

        {showImport && (
          <div className="import-box">
            <p className="hint">
              שם בכל שורה. שורת <code>קבוצה 1:</code> (או <code>קבוצה א':</code>) משבצת את כל השמות
              שאחריה לאותה קבוצה. שמות לפני כותרת ראשונה יישארו ללא קבוצה.
            </p>
            <textarea
              className="input textarea"
              rows={8}
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder={"קבוצה א':\nחיים ישראל\nמשה לוי\nקבוצה ב':\nדוד כהן\n…"}
            />
            <button className="btn btn-primary" onClick={importList}>
              ייבא{' '}
              {importText.split('\n').filter((s) => s.trim() && !parseGroupHeader(s.trim())).length}{' '}
              שמות
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
