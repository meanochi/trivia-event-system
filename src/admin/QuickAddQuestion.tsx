import { useRef, useState } from 'react';
import { useAdminStore } from '../core/adminStore';
import { newId } from '../core/format';
import { saveImage } from '../core/db';
import { isRenderableImage, skippedFilesMessage } from './QuestionsTab';
import type { Question, QuestionKind } from '../core/types';

/**
 * הוספת שאלה מהירה מתוך מהלך המשחק — בלי לעזוב את טאב המשחק.
 * הודות ל-APPEND_STAGE_QUESTIONS השאלה מצטרפת מיד לסבב הפעיל.
 */
export default function QuickAddQuestion({ kind, standalone = false }: { kind: QuestionKind; standalone?: boolean }) {
  const { content, updateContent } = useAdminStore();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [answer, setAnswer] = useState('');
  const [addedMsg, setAddedMsg] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const isImages = kind === 'stageC-image';

  function nextOrder(): number {
    const pool = content.questions.filter((q) => q.kind === kind);
    return pool.length === 0 ? 1 : Math.max(...pool.map((q) => q.order)) + 1;
  }

  function flash(msg: string) {
    setAddedMsg(msg);
    window.setTimeout(() => setAddedMsg(''), 3000);
  }

  function addText() {
    const trimmed = text.trim();
    if (!trimmed) return;
    updateContent((c) => ({
      ...c,
      questions: [
        ...c.questions,
        {
          id: newId('q'),
          kind,
          text: trimmed,
          answer: answer.trim() || undefined,
          order: nextOrder(),
          used: false,
        },
      ],
    }));
    setText('');
    setAnswer('');
    flash('✓ השאלה נוספה והצטרפה לסבב');
  }

  async function addImages(files: File[]) {
    try {
      const images = files
        .filter(isRenderableImage)
        .sort((a, b) => a.name.localeCompare(b.name, 'he', { numeric: true }));
      const skipped = files.filter((f) => !isRenderableImage(f));
      let order = nextOrder();
      const added: Question[] = [];
      for (const file of images) {
        const imageId = newId('img');
        await saveImage(imageId, file);
        added.push({
          id: newId('q'),
          kind,
          text: '',
          answer: file.name.replace(/\.[^.]+$/, ''),
          imageId,
          order: order++,
          used: false,
        });
      }
      if (added.length > 0) {
        updateContent((c) => ({ ...c, questions: [...c.questions, ...added] }));
        flash(`✓ נוספו ${added.length} תמונות והצטרפו לסבב`);
      }
      if (skipped.length > 0) window.alert(skippedFilesMessage(skipped));
    } catch (err) {
      window.alert(`העלאת התמונות נכשלה: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return (
    <div className={standalone ? 'panel quick-add-standalone' : 'quick-add'}>
      <div className="quick-add-head">
        <button className="btn btn-mini" onClick={() => setOpen((v) => !v)}>
          {open ? '▲ סגור' : '➕ הוספת שאלה תוך כדי משחק'}
        </button>
        {addedMsg && <span className="quick-add-msg">{addedMsg}</span>}
      </div>
      {open &&
        (isImages ? (
          <div className="quick-add-row">
            <button className="btn" onClick={() => fileRef.current?.click()}>
              🖼 בחירת תמונות להוספה
            </button>
            <span className="hint">שם הקובץ הופך לתשובה — ניתן לעריכה בטאב השאלות</span>
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
                if (files.length) void addImages(files);
              }}
            />
          </div>
        ) : (
          <div className="quick-add-row">
            <input
              className="input grow"
              placeholder="שאלה חדשה…"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addText()}
            />
            <input
              className="input answer-input"
              placeholder="תשובה (למפעיל בלבד)"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addText()}
            />
            <button className="btn btn-primary" onClick={addText} disabled={!text.trim()}>
              הוסף
            </button>
          </div>
        ))}
    </div>
  );
}
