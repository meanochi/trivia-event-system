import { Component, type ReactNode } from 'react';
import { clearGame } from '../core/db';

/**
 * רשת ביטחון: שגיאה בלתי צפויה מציגה מסך ברור בעברית במקום חלון ריק —
 * קריטי למפעיל לא-טכני באירוע חי.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="error-screen">
        <h1>אופס — משהו השתבש</h1>
        <p>נסו לטעון מחדש. אם השגיאה חוזרת — אפסו את מצב המשחק (השחקנים והשאלות נשמרים).</p>
        <div className="error-actions">
          <button className="btn btn-primary" onClick={() => window.location.reload()}>
            ⟳ טעינה מחדש
          </button>
          <button
            className="btn btn-danger-outline"
            onClick={() => {
              void clearGame().then(() => window.location.reload());
            }}
          >
            איפוס מצב המשחק וטעינה מחדש
          </button>
        </div>
        <pre className="error-details" dir="ltr">{String(this.state.error?.stack ?? this.state.error)}</pre>
      </div>
    );
  }
}
