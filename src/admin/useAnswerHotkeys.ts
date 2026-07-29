import { useEffect } from 'react';
import { useAdminStore } from '../core/adminStore';
import {
  SPECIAL_PER_DUEL,
  stageACurrentQuestionId,
  stageBCurrentQuestionId,
  stageCCurrentQuestionId,
  stageDCurrentQuestionId,
} from '../core/reducer';
import type { GameState } from '../core/types';

type AnswerActionType = 'STAGE_A_ANSWER' | 'STAGE_B_ANSWER' | 'STAGE_C_ANSWER' | 'STAGE_D_ANSWER';

/**
 * באיזה הקשר לחיצת מקש עונה על שאלה — משקף בדיוק את התנאים שבהם
 * כפתורי ✔/✘ בפאנלים פעילים (סבב רץ, יש שאלה, טיימר לא מושהה).
 */
function answerContext(game: GameState): { actionType: AnswerActionType; questionId: string } | null {
  const running = game.timer.status === 'running';
  switch (game.activeStage) {
    case 'A': {
      const run = game.stageA.run;
      if (!run || run.phase !== 'playing' || run.answered >= run.questionIds.length) return null;
      const id = stageACurrentQuestionId(game);
      return id ? { actionType: 'STAGE_A_ANSWER', questionId: id } : null;
    }
    case 'B': {
      const b = game.stageB;
      if (b.matchPhase !== 'round' || !running || b.cursor >= b.questionIds.length) return null;
      const id = stageBCurrentQuestionId(game);
      return id ? { actionType: 'STAGE_B_ANSWER', questionId: id } : null;
    }
    case 'C': {
      const c = game.stageC;
      if (c.phase === 'special') {
        if (c.answeredInPart >= SPECIAL_PER_DUEL) return null;
        const id = stageCCurrentQuestionId(game);
        return id ? { actionType: 'STAGE_C_ANSWER', questionId: id } : null;
      }
      if (c.phase === 'images') {
        if (!running || c.imageCursor >= c.imageQuestionIds.length) return null;
        const id = stageCCurrentQuestionId(game);
        return id ? { actionType: 'STAGE_C_ANSWER', questionId: id } : null;
      }
      return null;
    }
    case 'D': {
      const d = game.stageD;
      if (d.phase !== 'round' || !running || d.cursor >= d.questionIds.length) return null;
      const id = stageDCurrentQuestionId(game);
      return id ? { actionType: 'STAGE_D_ANSWER', questionId: id } : null;
    }
  }
}

/**
 * קיצורי מקלדת למפעיל בזמן שאלה: חץ למעלה = נכון, חץ למטה = שגוי.
 * פעיל רק בטאב המשחק (ההוק חי ב-GameTab), ומתעלם מהקלדה בשדות טקסט.
 */
export function useAnswerHotkeys(): void {
  const { game, dispatch, updateContent } = useAdminStore();

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) {
        return;
      }
      const ctx = answerContext(game);
      if (!ctx) return;
      e.preventDefault();
      // זהה ללחיצה על הכפתורים: סימון השאלה כנוצלה + פעולת התשובה
      updateContent((c) => ({
        ...c,
        questions: c.questions.map((q) => (q.id === ctx.questionId ? { ...q, used: true } : q)),
      }));
      dispatch({ type: ctx.actionType, correct: e.key === 'ArrowUp' });
    }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [game, dispatch, updateContent]);
}
