import { _electron as electron } from 'playwright';

// בדיקה: חלון הקהל באלקטרון נפתח בלי מסגרת (שורת כותרת) גם במסך יחיד
let failures = 0;
function check(name, cond) {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}`);
  if (!cond) failures++;
}

const app = await electron.launch({
  executablePath: '/home/user/trivia-event-system/node_modules/electron/dist/electron',
  args: ['/home/user/trivia-event-system', '--no-sandbox'],
  cwd: '/home/user/trivia-event-system',
});
let w = app.windows();
for (let i = 0; i < 30 && w.length < 2; i++) { await new Promise((r) => setTimeout(r, 500)); w = app.windows(); }
const display = w.find((x) => x.url().includes('display'));
await display.waitForSelector('.logo', { timeout: 10000 });

const info = await app.evaluate(({ BrowserWindow }) => {
  const win = BrowserWindow.getAllWindows().find((b) => b.webContents.getURL().includes('display'));
  return win ? { rendered: true } : null;
});
check('display window exists', !!info);

// בדיקת frameless דרך ה-API הראשי
const frameless = await app.evaluate(({ BrowserWindow }) => {
  const win = BrowserWindow.getAllWindows().find((b) => b.webContents.getURL().includes('display'));
  // אין getter ישיר ל-frame; בודקים שגודל התוכן = גודל החלון (בלי שורת כותרת)
  const [ww, wh] = win.getSize();
  const [cw, ch] = win.getContentSize();
  return { ww, wh, cw, ch, equal: ww === cw && wh === ch };
});
console.log('window vs content size:', JSON.stringify(frameless));
check('no title bar (window size == content size)', frameless.equal);

// רצועת הגרירה קיימת בדף
check('drag strip rendered in electron', (await display.locator('.drag-strip').count()) === 1);
// כפתור מסך מלא קיים
check('fullscreen button present', (await display.locator('.fullscreen-btn').count()) === 1);

// F11 עובד — החלון נכנס למסך מלא
await display.keyboard.press('F11');
await new Promise((r) => setTimeout(r, 800));
const fs = await app.evaluate(({ BrowserWindow }) =>
  BrowserWindow.getAllWindows().find((b) => b.webContents.getURL().includes('display')).isFullScreen(),
);
check('F11 toggles fullscreen', fs);

await app.close();
console.log(failures === 0 ? '\nALL FRAMELESS TESTS PASSED' : `\n${failures} TESTS FAILED`);
process.exit(failures === 0 ? 0 : 1);
