import AdminApp from './admin/AdminApp';
import DisplayApp from './display/DisplayApp';
import Logo from './components/Logo';

function Launcher() {
  return (
    <div className="launcher">
      <Logo size="medium" decorations />
      <div className="launcher-buttons">
        <a className="btn btn-primary" href="/admin">
          מסך ניהול
        </a>
        <a className="btn btn-pink" href="/display" target="_blank" rel="noreferrer">
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
  const path = window.location.pathname;
  if (path.startsWith('/admin')) return <AdminApp />;
  if (path.startsWith('/display')) return <DisplayApp />;
  return <Launcher />;
}
