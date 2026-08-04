import { useRef, useState } from 'react';
import { useAdminStore } from '../core/adminStore';
import { newId } from '../core/format';
import { POOLS, poolStatus, type PoolInfo } from '../core/pools';
import { deleteImage, saveImage } from '../core/db';
import { useImageUrl } from '../core/useImageUrl';
import type { Question, QuestionKind } from '../core/types';

/**
 * ניהול שאלות — חמשת המאגרים.
 * טקסט: הוספה ידנית, ייבוא בהדבקה או מקובץ ("שאלה" או "שאלה | תשובה" בכל שורה).
 * תמונות (חזיון תעתועים): העלאת קבצים מרובים/תיקייה, ממוינים לפי שם קובץ.
 * ניתן לערוך בכל רגע — גם תוך כדי אירוע. שאלה שנשאלה מסומנת "נוצלה".
 */
export default function QuestionsTab() {
  const { content } = useAdminStore();
  const [activeKind, setActiveKind] = useState<QuestionKind>('stageA');
  const activePool = POOLS.find((p) => p.kind === activeKind)!;

  return (
    <div className="questions-tab">
      <nav className="pool-tabs">
        {POOLS.map((pool) => {
          const count = content.questions.filter((q) => q.kind === pool.kind).length;
          const status = poolStatus(count, pool);
          return (
            <button
              key={pool.kind}
              className={`pool-tab ${activeKind === pool.kind ? 'active' : ''}`}
              onClick={() => setActiveKind(pool.kind)}
            >
              <span>{pool.label}</span>
              <span className={`pool-count pool-${status}`}>
                {count}/{pool.required ?? pool.recommended}
              </span>
            </button>
          );
        })}
      </nav>

      {activePool.isImages ? <ImagePool pool={activePool} /> : <TextPool pool={activePool} />}
    </div>
  );
}

/* ===== מאגר שאלות טקסט ===== */

function TextPool({ pool }: { pool: PoolInfo }) {
  const { content, updateContent } = useAdminStore();
  const [text, setText] = useState('');
  const [answer, setAnswer] = useState('');
  const [importText, setImportText] = useState('');
  const [showImport, setShowImport] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const questions = content.questions
    .filter((q) => q.kind === pool.kind)
    .sort((a, b) => a.order - b.order);
  const status = poolStatus(questions.length, pool);

  function nextOrder(): number {
    return questions.length === 0 ? 1 : Math.max(...questions.map((q) => q.order)) + 1;
  }

  function addQuestion() {
    const trimmed = text.trim();
    if (!trimmed) return;
    updateContent((c) => ({
      ...c,
      questions: [
        ...c.questions,
        {
          id: newId('q'),
          kind: pool.kind,
          text: trimmed,
          answer: answer.trim() || undefined,
          order: nextOrder(),
          used: false,
        },
      ],
    }));
    setText('');
    setAnswer('');
  }

  function importLines(raw: string) {
    const lines = raw
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    if (lines.length === 0) return;
    let order = nextOrder();
    updateContent((c) => ({
      ...c,
      questions: [
        ...c.questions,
        ...lines.map((line) => {
          // תמיכה ב"שאלה | תשובה" (או טאב מקובץ CSV/TSV)
          const [q, a] = line.split(/\s*[|\t]\s*/, 2);
          return {
            id: newId('q'),
            kind: pool.kind,
            text: q.trim(),
            answer: a?.trim() || undefined,
            order: order++,
            used: false,
          };
        }),
      ],
    }));
    setImportText('');
    setShowImport(false);
  }

  function importFromFile(file: File) {
    void file.text().then(importLines);
  }

  return (
    <section className="panel">
      <header className="pool-header">
        <div>
          <h2 className="section-title">{pool.label}</h2>
          <p className="hint">{pool.note}</p>
        </div>
        <div className={`pool-count-big pool-${status}`}>
          {questions.length}
          <span className="pool-target">/ {pool.required ?? pool.recommended}</span>
        </div>
      </header>

      <div className="add-question-row">
        <input
          className="input grow"
          placeholder="שאלה חדשה…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addQuestion()}
        />
        <input
          className="input answer-input"
          placeholder="תשובה (למפעיל בלבד)"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addQuestion()}
        />
        <button className="btn btn-primary" onClick={addQuestion}>
          הוסף
        </button>
        <button className="btn" onClick={() => setShowImport((v) => !v)}>
          📋 ייבוא
        </button>
        <button className="btn" onClick={() => fileRef.current?.click()}>
          📄 מקובץ
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".txt,.csv,.tsv,text/plain"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) importFromFile(f);
            e.target.value = '';
          }}
        />
      </div>

      {showImport && (
        <div className="import-box">
          <p className="hint">
            שאלה בכל שורה. אפשר להוסיף תשובה עם קו מפריד: <code>שאלה | תשובה</code>
          </p>
          <textarea
            className="input textarea"
            rows={7}
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            placeholder={'מהי בירת צרפת? | פריז\nכמה רגליים יש לעכביש? | 8'}
          />
          <button className="btn btn-primary" onClick={() => importLines(importText)}>
            ייבא {importText.split('\n').filter((s) => s.trim()).length} שאלות
          </button>
        </div>
      )}

      <ol className="question-list">
        {questions.map((q) => (
          <QuestionRow key={q.id} question={q} />
        ))}
      </ol>
      {questions.length === 0 && <p className="hint">המאגר ריק — הוסיפו שאלות למעלה.</p>}
    </section>
  );
}

function QuestionRow({ question }: { question: Question }) {
  const { updateContent } = useAdminStore();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(question.text);
  const [answer, setAnswer] = useState(question.answer ?? '');

  function save() {
    updateContent((c) => ({
      ...c,
      questions: c.questions.map((q) =>
        q.id === question.id ? { ...q, text: text.trim(), answer: answer.trim() || undefined } : q,
      ),
    }));
    setEditing(false);
  }

  function remove() {
    updateContent((c) => ({
      ...c,
      questions: c.questions.filter((q) => q.id !== question.id),
    }));
  }

  if (editing) {
    return (
      <li className="question-row editing">
        <input className="input grow" value={text} onChange={(e) => setText(e.target.value)} />
        <input
          className="input answer-input"
          value={answer}
          placeholder="תשובה"
          onChange={(e) => setAnswer(e.target.value)}
        />
        <button className="btn btn-mini btn-primary" onClick={save}>
          שמור
        </button>
        <button className="btn btn-mini" onClick={() => setEditing(false)}>
          ביטול
        </button>
      </li>
    );
  }

  return (
    <li className="question-row">
      <span className="question-text-cell">{question.text}</span>
      {question.answer && <span className="question-answer">{question.answer}</span>}
      {question.used && <span className="used-badge">נוצלה</span>}
      <span className="question-actions">
        <button className="btn btn-mini" onClick={() => setEditing(true)} title="עריכה">
          ✎
        </button>
        <button className="btn btn-mini btn-danger-outline" onClick={remove} title="מחיקה">
          ✕
        </button>
      </span>
    </li>
  );
}

/* ===== מאגר תמונות (חזיון תעתועים) ===== */

/** קריאת קבצים מגרירת תיקייה/קבצים (כולל תיקיות מקוננות) */
async function filesFromDrop(dt: DataTransfer): Promise<File[]> {
  const out: File[] = [];
  const entries = [...dt.items]
    .map((i) => i.webkitGetAsEntry?.())
    .filter(Boolean) as FileSystemEntry[];
  async function walk(entry: FileSystemEntry): Promise<void> {
    if (entry.isFile) {
      const file = await new Promise<File>((res, rej) => (entry as FileSystemFileEntry).file(res, rej));
      out.push(file);
    } else if (entry.isDirectory) {
      const reader = (entry as FileSystemDirectoryEntry).createReader();
      let batch: FileSystemEntry[];
      do {
        batch = await new Promise<FileSystemEntry[]>((res, rej) => reader.readEntries(res, rej));
        for (const e of batch) await walk(e);
      } while (batch.length > 0);
    }
  }
  for (const e of entries) await walk(e);
  if (out.length === 0) out.push(...dt.files);
  return out;
}

/** האם הקובץ הוא תמונה שהדפדפן יודע להציג — לפי סוג MIME או סיומת.
 *  ב-Windows קבצים לעיתים מגיעים ללא סוג, ולכן הסיומת קובעת גם היא. */
export function isRenderableImage(f: File): boolean {
  if (f.type.startsWith('image/') && !/hei[cf]/i.test(f.type)) return true;
  return /\.(png|jpe?g|gif|webp|bmp|avif|svg)$/i.test(f.name);
}

/** הסבר קריא למה קבצים דולגו בהעלאה */
export function skippedFilesMessage(skipped: File[]): string {
  const names = skipped.slice(0, 8).map((f) => f.name).join('\n');
  const more = skipped.length > 8 ? `\n…ועוד ${skipped.length - 8}` : '';
  return (
    `הקבצים הבאים אינם תמונות נתמכות ולא הועלו:\n${names}${more}\n\n` +
    'נתמכים: JPG, PNG, GIF, WEBP, BMP, AVIF, SVG.\n' +
    'תמונות HEIC (של אייפון) יש להמיר קודם ל-JPG.'
  );
}

function ImagePool({ pool }: { pool: PoolInfo }) {
  const { content, updateContent } = useAdminStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const folderRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const questions = content.questions
    .filter((q) => q.kind === pool.kind)
    .sort((a, b) => a.order - b.order);
  const status = poolStatus(questions.length, pool);

  async function addFiles(files: File[]) {
    setBusy(true);
    try {
      // מיון לפי שם קובץ — קובע את סדר ההצגה במשחק
      const sorted = files
        .filter(isRenderableImage)
        .sort((a, b) => a.name.localeCompare(b.name, 'he', { numeric: true }));
      const skipped = files.filter((f) => !isRenderableImage(f));
      let order = questions.length === 0 ? 1 : Math.max(...questions.map((q) => q.order)) + 1;
      const added: Question[] = [];
      for (const file of sorted) {
        const imageId = newId('img');
        await saveImage(imageId, file);
        added.push({
          id: newId('q'),
          kind: pool.kind,
          // שם הקובץ (ללא סיומת) כתשובה התחלתית — ניתן לעריכה
          text: '',
          answer: file.name.replace(/\.[^.]+$/, ''),
          imageId,
          order: order++,
          used: false,
        });
      }
      if (added.length > 0) {
        updateContent((c) => ({ ...c, questions: [...c.questions, ...added] }));
      }
      // כישלון שקט הוא הגרוע מכל — המפעיל חייב לדעת מה דולג ולמה
      if (skipped.length > 0) window.alert(skippedFilesMessage(skipped));
    } catch (err) {
      window.alert(
        `העלאת התמונות נכשלה: ${err instanceof Error ? err.message : String(err)}\n\n` +
          'נסו שוב. אם זה חוזר:\n' +
          '• בדפדפן — ודאו שאינכם בגלישה בסתר ושיש מקום פנוי בדיסק.\n' +
          '• באפליקציה — סגרו אותה, מחקו את התיקייה "פונקט פארקערט" מתוך תיקיית ‎%APPDATA%‎\n' +
          '  (מוחק את תוכן המשחק!) והפעילו מחדש.',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel">
      <header className="pool-header">
        <div>
          <h2 className="section-title">{pool.label}</h2>
          <p className="hint">
            {pool.note}. התמונות ממוינות לפי שם הקובץ; שם הקובץ הופך לתשובה התחלתית וניתן לעריכה.
          </p>
        </div>
        <div className={`pool-count-big pool-${status}`}>
          {questions.length}
          <span className="pool-target">/ {pool.recommended}</span>
        </div>
      </header>

      <div className="add-question-row">
        <button className="btn btn-primary" onClick={() => fileRef.current?.click()} disabled={busy}>
          {busy ? 'מעלה…' : '🖼 העלאת תמונות'}
        </button>
        <button className="btn" onClick={() => folderRef.current?.click()} disabled={busy}>
          📁 העלאת תיקייה שלמה
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => {
            // חובה להעתיק את הרשימה לפני איפוס השדה — האיפוס מרוקן את ה-FileList
            const files = e.target.files ? [...e.target.files] : [];
            e.target.value = '';
            if (files.length) void addFiles(files);
          }}
        />
        <input
          ref={folderRef}
          type="file"
          hidden
          {...({ webkitdirectory: '' } as object)}
          onChange={(e) => {
            const files = e.target.files ? [...e.target.files] : [];
            e.target.value = '';
            if (files.length) void addFiles(files);
          }}
        />
        <span className="hint">או פשוט גררו תיקייה/קבצים לכאן 👇</span>
      </div>

      <div
        className={`image-grid drop-zone ${dragOver ? 'drag-over' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          void filesFromDrop(e.dataTransfer).then((files) => {
            if (files.length) void addFiles(files);
          });
        }}
      >
        {questions.map((q, i) => (
          <ImageCard key={q.id} question={q} index={i + 1} />
        ))}
        {questions.length === 0 && (
          <p className="hint drop-hint">אין עדיין תמונות — העלו בכפתורים למעלה או גררו לכאן תיקייה שלמה.</p>
        )}
      </div>
    </section>
  );
}

function ImageCard({ question, index }: { question: Question; index: number }) {
  const { updateContent } = useAdminStore();
  const url = useImageUrl(question.imageId);
  const [answer, setAnswer] = useState(question.answer ?? '');

  function saveAnswer() {
    updateContent((c) => ({
      ...c,
      questions: c.questions.map((q) =>
        q.id === question.id ? { ...q, answer: answer.trim() || undefined } : q,
      ),
    }));
  }

  function remove() {
    if (question.imageId) void deleteImage(question.imageId);
    updateContent((c) => ({
      ...c,
      questions: c.questions.filter((q) => q.id !== question.id),
    }));
  }

  return (
    <div className="image-card">
      <div className="image-thumb-wrap">
        {url ? <img className="image-thumb" src={url} alt={answer} /> : <div className="image-thumb loading" />}
        <span className="image-index">{index}</span>
        {question.used && <span className="used-badge on-image">נוצלה</span>}
      </div>
      <input
        className="input image-answer"
        value={answer}
        placeholder="תשובה…"
        onChange={(e) => setAnswer(e.target.value)}
        onBlur={saveAnswer}
        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
      />
      <button className="btn btn-mini btn-danger-outline image-remove" onClick={remove}>
        ✕ הסר
      </button>
    </div>
  );
}
