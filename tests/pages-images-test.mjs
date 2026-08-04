import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';

// בדיקת תמונות חזיון תעתועים בסביבת אתר (תת-נתיב + ניתוב hash, כמו GitHub Pages)
const BASE = 'http://localhost:4175/trivia-event-system';
let failures = 0;
function check(name, cond) {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}`);
  if (!cond) failures++;
}

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
const admin = await context.newPage();
const display = await context.newPage();

await admin.goto(`${BASE}/#/admin`);
await admin.waitForSelector('.admin-topbar');
await display.goto(`${BASE}/#/display`);
await display.waitForSelector('.logo');

// שחקנים: 12 בארבע קבוצות + שאלות פוקר פייס ותמונות
await admin.click('button:has-text("שחקנים")');
await admin.click('button:has-text("ייבוא רשימה")');
await admin.fill('textarea', "קבוצה 1:\nא1\nא2\nא3\nקבוצה 2:\nב1\nב2\nב3\nקבוצה 3:\nג1\nג2\nג3\nקבוצה 4:\nד1\nד2\nד3");
await admin.locator('.import-box .btn-primary').click();

await admin.click('button:has-text("❓ שאלות")');
await admin.waitForSelector('.pool-tabs');
await admin.click('.pool-tab:has-text("חזיון תעתועים")');

// הזרקת תמונה דרך DataTransfer (שמות קבצים עבריים שוברים setInputFiles)
const png = readFileSync('test-a.png');
await admin.evaluate(async (bytes) => {
  const file = new File([new Uint8Array(bytes)], 'פריז.png', { type: 'image/png' });
  const dt = new DataTransfer();
  dt.items.add(file);
  const input = document.querySelector('input[accept="image/*"]');
  input.files = dt.files;
  input.dispatchEvent(new Event('change', { bubbles: true }));
}, [...png]);
await admin.waitForSelector('.image-card', { timeout: 5000 });
check('image uploaded under subpath', (await admin.locator('.image-card').count()) === 1);

// מעבר ישיר לשלב ג' — בחירה ידנית של 6 שחקנים לדו־קרבות
await admin.click('button:has-text("🎮 משחק")');
await admin.click('.screen-controls button:has-text("שלב ג")');
await admin.waitForSelector('.stagec-candidates');
for (let i = 0; i < 6; i++) {
  await admin.locator('.stagec-candidates .transition-row input').nth(i).check();
}
await admin.click('button:has-text("הצע דו־קרבות")');
await admin.waitForSelector('.pairs-grid');
await admin.click('button:has-text("אשר דו־קרבות והצג לקהל")');
await admin.waitForSelector('button:has-text("דלג ישר לחזיון תעתועים")', { timeout: 5000 });
await admin.click('button:has-text("דלג ישר לחזיון תעתועים")');

// התמונה חייבת להופיע על מסך הקהל
await display.waitForSelector('.display-image', { timeout: 8000 });
const img = await display.locator('.display-image').evaluate((el) => ({ w: el.naturalWidth, complete: el.complete }));
check('image VISIBLE on display under subpath', img.complete && img.w > 0);

await display.screenshot({ path: 'pages-image-display.png' });
await browser.close();
console.log(failures === 0 ? '\nALL PAGES-IMAGE TESTS PASSED' : `\n${failures} TESTS FAILED`);
process.exit(failures === 0 ? 0 : 1);
