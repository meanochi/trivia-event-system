import { useEffect, useState } from 'react';
import './ambient.css';

/**
 * רקע חי תמידי למסך הקהל: סימני שאלה מרחפים שמתחלפים,
 * כתמי אור נודדים וקרן אור חולפת — תמיד משהו זז.
 */

interface Mark {
  id: number;
  left: number;
  top: number;
  size: number;
  color: string;
  duration: number;
  delay: number;
  rot: number;
}

const COLORS = ['var(--pink)', 'var(--green)', 'var(--yellow)'];
let markId = 0;

function makeMarks(count: number): Mark[] {
  return Array.from({ length: count }, () => ({
    id: markId++,
    left: Math.random() * 96,
    top: Math.random() * 92,
    size: 1 + Math.random() * 2.4,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    duration: 6 + Math.random() * 9,
    delay: Math.random() * 4,
    rot: -30 + Math.random() * 60,
  }));
}

export default function AmbientBackground() {
  const [marks, setMarks] = useState<Mark[]>(() => makeMarks(11));

  // מתחלף כל כמה שניות כדי שהתנועה לא תהיה מונוטונית
  useEffect(() => {
    const id = setInterval(() => setMarks(makeMarks(11)), 16000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="ambient" aria-hidden="true">
      <div className="ambient-blob blob-a" />
      <div className="ambient-blob blob-b" />
      <div className="ambient-sweep" />
      {marks.map((m) => (
        <span
          key={m.id}
          className="ambient-mark"
          style={{
            left: `${m.left}%`,
            top: `${m.top}%`,
            fontSize: `${m.size}rem`,
            color: m.color,
            animationDuration: `${m.duration}s`,
            animationDelay: `${m.delay}s`,
            ['--rot' as string]: `${m.rot}deg`,
          }}
        >
          ?
        </span>
      ))}
    </div>
  );
}
