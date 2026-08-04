// תהליך אלקטרון ראשי — עטיפת POC:
// מרים שרת סטטי פנימי שמגיש את האפליקציה הבנויה (dist), ופותח שני חלונות:
// אדמין על המסך הראשי, ומסך קהל (Fullscreen) על המסך המשני אם קיים.
// הגשה דרך http://localhost מבטיחה ש-BroadcastChannel ו-IndexedDB עובדים
// בדיוק כמו בדפדפן (אותו origin לשני החלונות).

const { app, BrowserWindow, screen } = require('electron');

// מוזיקה ואפקטים מתנגנים אוטומטית בלי מחוות משתמש (מדיניות autoplay)
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
const http = require('http');
const fs = require('fs');
const path = require('path');

const DIST_DIR = path.join(__dirname, '..', 'dist');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.woff2': 'font/woff2',
  '.json': 'application/json',
};

// פורט קבוע — חובה: IndexedDB נשמר לפי origin (כתובת+פורט), ולכן פורט
// משתנה בין הפעלות היה מוחק בפועל את כל המצב השמור של המשחק.
const FIXED_PORT = 17343;

function startStaticServer(port) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
      let filePath = path.normalize(path.join(DIST_DIR, urlPath));
      // הגנה מפני יציאה מתיקיית dist + ניתוב SPA: כל נתיב בלי סיומת מקבל את index.html
      if (!filePath.startsWith(DIST_DIR) || !path.extname(filePath)) {
        filePath = path.join(DIST_DIR, 'index.html');
      }
      fs.readFile(filePath, (err, data) => {
        if (err) {
          res.writeHead(404);
          res.end('Not found');
          return;
        }
        res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream' });
        res.end(data);
      });
    });
    // האזנה על 127.0.0.1 בלבד
    server.listen(port, '127.0.0.1', () => resolve(server.address().port));
    server.on('error', reject);
  });
}

async function createWindows() {
  let port;
  try {
    port = await startStaticServer(FIXED_PORT);
  } catch {
    // הפורט הקבוע תפוס (למשל עותק נוסף של האפליקציה רץ) — פורט אקראי כגיבוי
    port = await startStaticServer(0);
  }
  const base = `http://127.0.0.1:${port}`;

  const displays = screen.getAllDisplays();
  const primary = screen.getPrimaryDisplay();
  const external = displays.find((d) => d.id !== primary.id);

  const adminWin = new BrowserWindow({
    x: primary.workArea.x + 40,
    y: primary.workArea.y + 40,
    width: Math.min(1100, primary.workArea.width - 80),
    height: Math.min(850, primary.workArea.height - 80),
    title: 'פונקט פארקערט — מסך ניהול',
  });
  adminWin.setMenuBarVisibility(false);
  await adminWin.loadURL(`${base}/admin`);

  const displayWin = new BrowserWindow(
    external
      ? {
          x: external.bounds.x,
          y: external.bounds.y,
          fullscreen: true,
          title: 'פונקט פארקערט — מסך קהל',
        }
      : {
          // גם במסך יחיד: בלי שורת כותרת וכפתורי חלון (frameless).
          // גרירה: רצועה שקופה בראש הדף (‎-webkit-app-region‎); F11 למסך מלא
          width: Math.min(1280, primary.workArea.width - 160),
          height: Math.min(720, primary.workArea.height - 160),
          frame: false,
          title: 'פונקט פארקערט — מסך קהל',
        },
  );
  displayWin.setMenuBarVisibility(false);
  await displayWin.loadURL(`${base}/display`);

  // F12 פותח כלי פיתוח (לאבחון תקלות בשטח); F11 מטופל בתוך דף מסך הקהל
  for (const win of [adminWin, displayWin]) {
    win.webContents.on('before-input-event', (_e, input) => {
      if (input.type !== 'keyDown' && input.type !== 'rawKeyDown') return;
      if (input.key === 'F12') win.webContents.toggleDevTools();
    });
  }

  // סגירת חלון האדמין סוגרת את כל האפליקציה (מסך הקהל לבד חסר משמעות)
  adminWin.on('closed', () => app.quit());
}

app.whenReady().then(createWindows);

app.on('window-all-closed', () => app.quit());
