import { useState } from 'react';
import './logo.css';

/**
 * הלוגו של פונקט פארקערט.
 * אם קיים קובץ הלוגו המקורי ב-public/assets/logo.png — הוא מוצג.
 * אחרת מוצגת גרסת CSS נאמנה לסגנון (ניאון גרפיטי + סימני שאלה מרחפים).
 */

interface LogoProps {
  size?: 'small' | 'medium' | 'hero';
  /** סימני שאלה מרחפים סביב הלוגו (למסך הקהל) */
  decorations?: boolean;
}

const MARKS = [
  { top: '2%', right: '4%', color: 'var(--pink)', size: 3.2, rot: -18, delay: 0 },
  { top: '12%', left: '6%', color: 'var(--green)', size: 2.4, rot: 15, delay: 0.7 },
  { bottom: '8%', right: '10%', color: 'var(--yellow)', size: 2.8, rot: 22, delay: 1.3 },
  { bottom: '16%', left: '3%', color: 'var(--pink)', size: 2.1, rot: -25, delay: 0.4 },
  { top: '45%', right: '-2%', color: 'var(--green)', size: 1.8, rot: 30, delay: 1.8 },
  { top: '55%', left: '-1%', color: 'var(--yellow)', size: 1.6, rot: -12, delay: 1.0 },
] as const;

export default function Logo({ size = 'medium', decorations = false }: LogoProps) {
  const [imageOk, setImageOk] = useState(true);

  return (
    <div className={`logo logo-${size}`}>
      {decorations && (
        <div className="logo-marks" aria-hidden="true">
          {MARKS.map((m, i) => (
            <span
              key={i}
              className="logo-mark"
              style={{
                top: 'top' in m ? m.top : undefined,
                bottom: 'bottom' in m ? m.bottom : undefined,
                right: 'right' in m ? m.right : undefined,
                left: 'left' in m ? m.left : undefined,
                color: m.color,
                fontSize: `${m.size}em`,
                animationDelay: `${m.delay}s`,
                ['--rot' as string]: `${m.rot}deg`,
              }}
            >
              ?
            </span>
          ))}
        </div>
      )}

      {imageOk ? (
        <img
          src="/assets/logo.png"
          alt="פונקט פארקערט"
          className="logo-image"
          onError={() => setImageOk(false)}
        />
      ) : (
        <div className="logo-css">
          <div className="logo-title">
            <span className="logo-line">פונקט</span>
            <span className="logo-line">פארקערט</span>
          </div>
          <div className="logo-banner">בדיוק אבל הפוך</div>
        </div>
      )}
    </div>
  );
}
