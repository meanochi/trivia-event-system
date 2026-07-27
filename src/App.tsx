import { useEffect, useState } from 'react';
import AdminApp from './admin/AdminApp';
import DisplayApp from './display/DisplayApp';
import Logo from './components/Logo';
import { ErrorBoundary } from './components/ErrorBoundary';

/**
 * ניתוב: תומך גם בנתיבים (/admin — אלקטרון ושרת מקומי)
 * וגם ב-hash (#/admin — אחסון סטטי כמו GitHub Pages).
 */
type Route = 'admin' | 'display' | 'home';

function currentRoute(): Route {
  const hash = window.location.hash;
  if (hash.startsWith('#/admin')) return 'admin';
  if (hash.startsWith('#/display')) return 'display';
  const path = window.location.pathname;
  if (path.endsWith('/admin')) return 'admin';
  if (path.endsWith('/display')) return 'display';
  return 'home';
}

function Launcher() {
  return (
    <div className="launcher">
      <Logo size="medium" decorations />
      <div className="launcher-buttons">
        <a className="btn btn-primary" href="#/admin">
          מסך ניהול
        </a>
        <a className="btn btn-pink" href="#/display" target="_blank" rel="noreferrer">
          מסך קהל (חלון חדש)
        </a>
      </div>
      <p className="launcher-note">
        פתחו את מסך הניהול בחלון הזה ואת מסך הקהל בחלון נפרד — וגררו אותו למקרן.
      </p>
    </div>
  );
}

export default function App() {
  const [route, setRoute] = useState<Route>(currentRoute);

  useEffect(() => {
    const onChange = () => setRoute(currentRoute());
    window.addEventListener('hashchange', onChange);
    window.addEventListener('popstate', onChange);
    return () => {
      window.removeEventListener('hashchange', onChange);
      window.removeEventListener('popstate', onChange);
    };
  }, []);

  if (route === 'admin')
    return (
      <ErrorBoundary>
        <AdminApp />
      </ErrorBoundary>
    );
  if (route === 'display')
    return (
      <ErrorBoundary>
        <DisplayApp />
      </ErrorBoundary>
    );
  return <Launcher />;
}
