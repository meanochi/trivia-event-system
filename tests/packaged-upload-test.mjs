import { _electron as electron } from 'playwright';
import { copyFileSync, mkdirSync, readFileSync } from 'node:fs';

// בדיקת העלאת תמונות באפליקציה הארוזה (asar):
// בורר קבצים אמיתי, תיקייה, שמות עבריים (דרך הזרקה), קבצים לא נתמכים + התראה
let failures = 0;
function check(name, cond) {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}`);
  if (!cond) failures++;
}

mkdirSync('upload-src/folder-en', { recursive: true });
copyFileSync('test-a.png', 'upload-src/paris.png');
copyFileSync('test-a.png', 'upload-src/folder-en/pic1.png');
copyFileSync('test-a.png', 'upload-src/folder-en/pic2.png');

const app = await electron.launch({
  executablePath: '/home/user/trivia-event-system/release/linux-unpacked/trivia-event-system',
  args: ['--no-sandbox'],
});
let w = app.windows();
for (let i = 0; i < 30 && w.length < 2; i++) { await new Promise((r) => setTimeout(r, 500)); w = app.windows(); }
const admin = w.find((x) => x.url().includes('admin'));
await admin.waitForSelector('.admin-topbar', { timeout: 15000 });

const alerts = [];
admin.on('dialog', (d) => { alerts.push(d.message()); void d.accept(); });
const pageErrors = [];
admin.on('pageerror', (e) => pageErrors.push(String(e)));

await admin.evaluate(() => new Promise((res) => {
  const rq = indexedDB.open('funkt-farkert', 1);
  rq.onsuccess = () => {
    const db = rq.result;
    const tx = db.transaction(['kv', 'content', 'images'], 'readwrite');
    tx.objectStore('kv').clear(); tx.objectStore('content').clear(); tx.objectStore('images').clear();
    tx.oncomplete = () => res(true);
  };
  rq.onerror = () => res(false);
}));
await admin.reload();
await admin.waitForSelector('.admin-topbar', { timeout: 15000 });
await admin.click('button:has-text("❓ שאלות")');
await admin.click('.pool-tab:has-text("חזיון תעתועים")');
await admin.waitForSelector('.image-grid');

// 1. בורר קבצים אמיתי — קובץ בודד
await admin.locator('input[accept="image/*"]').setInputFiles('upload-src/paris.png');
await admin.waitForSelector('.image-card', { timeout: 8000 });
check('real file-picker upload works', (await admin.locator('.image-card').count()) === 1);

// 2. תיקייה שלמה דרך בורר אמיתי
await admin.locator('input[webkitdirectory]').setInputFiles('upload-src/folder-en');
await admin.waitForTimeout(1500);
check('folder upload works', (await admin.locator('.image-card').count()) === 3);

// 3. שמות עבריים — דרך הזרקת DataTransfer (בורר של Playwright שובר עברית, האפליקציה לא)
const png = [...readFileSync('test-a.png')];
await admin.evaluate((bytes) => {
  const file = new File([new Uint8Array(bytes)], 'מגדל-אייפל.png', { type: 'image/png' });
  const dt = new DataTransfer();
  dt.items.add(file);
  const input = document.querySelector('input[accept="image/*"]');
  input.files = dt.files;
  input.dispatchEvent(new Event('change', { bubbles: true }));
}, png);
await admin.waitForTimeout(1500);
check('hebrew filename upload works (app level)', (await admin.locator('.image-card').count()) === 4);
check('hebrew answer derived from filename', (await admin.locator('.image-answer').last().inputValue()) === 'מגדל-אייפל');

// 4. קובץ JPG בלי סוג MIME (כמו ב-Windows לעיתים) — עולה לפי הסיומת
await admin.evaluate((bytes) => {
  const file = new File([new Uint8Array(bytes)], 'no-mime.jpg', { type: '' });
  const dt = new DataTransfer();
  dt.items.add(file);
  const input = document.querySelector('input[accept="image/*"]');
  input.files = dt.files;
  input.dispatchEvent(new Event('change', { bubbles: true }));
}, png);
await admin.waitForTimeout(1500);
check('jpg without mime type uploads by extension', (await admin.locator('.image-card').count()) === 5);

// 5. קובץ לא נתמך (HEIC) — לא עולה, ומוצגת הודעה ברורה
await admin.evaluate(() => {
  const file = new File([new Uint8Array([0, 0])], 'IMG_1234.heic', { type: 'image/heic' });
  const dt = new DataTransfer();
  dt.items.add(file);
  const input = document.querySelector('input[accept="image/*"]');
  input.files = dt.files;
  input.dispatchEvent(new Event('change', { bubbles: true }));
});
await admin.waitForTimeout(1500);
check('heic not added', (await admin.locator('.image-card').count()) === 5);
check('clear alert shown for unsupported files', alerts.some((a) => a.includes('HEIC') && a.includes('IMG_1234.heic')));

// כל התמונות באמת מוצגות
const thumbs = await admin.locator('img.image-thumb').evaluateAll((els) => els.map((el) => el.naturalWidth > 0));
check('all thumbnails render', thumbs.length === 5 && thumbs.every(Boolean));

// שרידות רענון
await admin.waitForTimeout(500);
await admin.reload();
await admin.waitForSelector('.admin-topbar');
await admin.click('button:has-text("❓ שאלות")');
await admin.click('.pool-tab:has-text("חזיון תעתועים")');
await admin.waitForSelector('.image-card', { timeout: 8000 });
check('images survive reload', (await admin.locator('.image-card').count()) === 5);
check('no page errors', pageErrors.length === 0);
if (pageErrors.length) console.log('ERRORS:', pageErrors.slice(0, 5));

await app.close();
console.log(failures === 0 ? '\nALL PACKAGED-UPLOAD TESTS PASSED' : `\n${failures} TESTS FAILED`);
process.exit(failures === 0 ? 0 : 1);
