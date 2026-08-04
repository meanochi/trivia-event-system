import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';

// בדיקת ארבעת התיקונים: ניקוד ידני מוסתר עד הסיכום, חשיפת זוגות הדרגתית,
// קובץ מוזיקה שורד איפוס, ומוזיקה בלופ
const BASE = 'http://localhost:4174';
let failures = 0;
function check(name, cond) {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}`);
  if (!cond) failures++;
}

// קובץ WAV זעיר (שקט, 0.1 שניות) להעלאה כמוזיקה
function tinyWav() {
  const rate = 8000, samples = 800;
  const buf = Buffer.alloc(44 + samples * 2);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + samples * 2, 4); buf.write('WAVE', 8);
  buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(rate, 24); buf.writeUInt32LE(rate * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36); buf.writeUInt32LE(samples * 2, 40);
  return buf;
}
writeFileSync('track.wav', tinyWav());

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
const admin = await context.newPage();
const display = await context.newPage();

await admin.goto(`${BASE}/admin`);
await admin.waitForSelector('.admin-topbar');
await display.goto(`${BASE}/display`);
await display.waitForSelector('.logo');

/* ===== הכנה: 14 שחקנים (5+3+3+3) ושאלות ===== */
await admin.click('button:has-text("שחקנים")');
await admin.click('button:has-text("ייבוא רשימה")');
await admin.fill('textarea', "קבוצה 1:\nאברהם כהן\nיוסף לוי\nמשה פרידמן\nדוד שוורץ\nיעקב גולדברג\nקבוצה 2:\nב-אחד\nב-שתיים\nב-שלוש\nקבוצה 3:\nג-אחד\nג-שתיים\nג-שלוש\nקבוצה 4:\nד-אחד\nד-שתיים\nד-שלוש");
await admin.locator('.import-box .btn-primary').click();
await admin.click('button:has-text("❓ שאלות")');
await admin.waitForSelector('.pool-tabs');
await admin.click('button:has-text("📋 ייבוא")');
await admin.fill('textarea', 'שאלה 1? | ת1\nשאלה 2? | ת2');
await admin.locator('.import-box .btn-primary').click();
await admin.click('.pool-tab:has-text("ראש בראש")');
await admin.click('button:has-text("📋 ייבוא")');
await admin.fill('textarea', 'ש-ב1? | ת1\nש-ב2? | ת2\nש-ב3? | ת3\nש-ב4? | ת4');
await admin.locator('.import-box .btn-primary').click();
await admin.waitForTimeout(200);

/* ===== 1. ניקוד ידני של שחקן מוסתר מהקהל עד הסיכום ===== */
await admin.click('button:has-text("🎮 משחק")');
await admin.waitForSelector('.group-pick-grid');
await admin.locator('.group-pick').first().locator('button:has-text("טען קבוצה")').click();
await admin.waitForSelector('.intro-names');
await admin.click('button:has-text("התחל סבב")');
await display.waitForSelector('.display-question', { timeout: 3000 });

// ‎+1 ידני לאברהם דרך פאנל הניקוד
await admin.locator('.score-list li:has-text("אברהם") button:has-text("+1")').click();
await admin.waitForTimeout(300);
const avrahamRow = display.locator('.score-row', { hasText: 'אברהם' });
check('manual point hidden on live display', (await avrahamRow.locator('.score-row-value').textContent()).trim() === '0');
check('admin still sees manual point', (await admin.locator('.score-list li:has-text("אברהם") .score-value').textContent()).trim() === '1');

// תשובה נכונה — הקהל רואה רק את נקודת המשחק
await admin.click('button:has-text("נכון (+1)")');
await display.waitForTimeout(1900);
check('display shows game point only (1, not 2)', (await avrahamRow.locator('.score-row-value').textContent()).trim() === '1');

// מסיימים ומציגים סיכום — הנקודה הידנית נחשפת
await admin.click('button:has-text("נכון (+1)")');
await admin.waitForSelector('.finish-box');
await admin.click('button:has-text("סיום קבוצה")');
await display.waitForSelector('.summary-board', { timeout: 3000 });
const avrahamSummary = display.locator('.summary-row', { hasText: 'אברהם' });
check('summary reveals manual point (2)', (await avrahamSummary.locator('.summary-score').textContent()).trim() === '2');

/* ===== 2. חשיפת זוגות זוג-זוג ===== */
await admin.click('.screen-controls button:has-text("שלב ב")');
await admin.waitForSelector('.transition-grid');
await admin.click('button:has-text("הצע חלוקה לזוגות")');
await admin.waitForSelector('.pairs-grid');
await admin.click('button:has-text("אשר זוגות והצג לקהל")');
await display.waitForSelector('.pairs-board', { timeout: 3000 });
check('all 6 pairs start hidden', (await display.locator('.pair-box.mystery').count()) === 6);
check('tease line shown', await display.locator('.pairs-tease').isVisible());

await admin.click('button:has-text("חשוף את זוג 1")');
await display.waitForTimeout(400);
check('one pair revealed', (await display.locator('.pair-box.mystery').count()) === 5);
check('revealed pair shows names', !(await display.locator('.pairs-match').first().locator('.pair-box').first().textContent()).includes('?'));
check('reveal sound played', (await display.evaluate(() => window.__lastSound)) === 'reveal');

for (let i = 2; i <= 6; i++) {
  await admin.click(`button:has-text("חשוף את זוג ${i}")`);
  await admin.waitForTimeout(150);
}
await display.waitForTimeout(400);
check('all pairs revealed', (await display.locator('.pair-box.mystery').count()) === 0);
check('reveal button gone after all revealed', (await admin.locator('button:has-text("חשוף את זוג")').count()) === 0);

/* ===== 3. ניקוד ידני של זוג מוסתר עד סיכום המקצה ===== */
await admin.click('button:has-text("הצג את המקצה לקהל")');
await display.waitForSelector('.versus-layout', { timeout: 3000 });
await admin.locator('.btn-primary:has-text("התחל סבב")').click();
await display.waitForSelector('.stageb-layout', { timeout: 3000 });

// ‎+1 ידני לזוג 1
await admin.locator('.pair-score-panel .score-list li').first().locator('button:has-text("+1")').click();
await admin.waitForTimeout(300);
check('pair manual hidden on live display', (await display.locator('.pair-score-box').first().locator('.pair-score-value').textContent()).trim() === '0');
check('admin match line includes manual', (await admin.locator('.match-score-line').textContent()).includes('1'));

// תשובה נכונה — הקהל רואה רק את נקודת הסבב
await admin.click('button:has-text("נכון (+1 לזוג)")');
await display.waitForTimeout(1900);
check('live pair score shows round points only (1)', (await display.locator('.pair-score-box').first().locator('.pair-score-value').textContent()).trim() === '1');

// שני הסבבים מסתיימים — סיכום המקצה חושף את הידני (1+1=2)
await admin.click('button:has-text("סיים סבב")');
await display.waitForSelector('.pair-summary-box', { timeout: 3000 });
check('match summary reveals pair manual (2)', (await display.locator('.pair-summary-score').first().textContent()).trim() === '2');

/* ===== 4. קובץ מוזיקה: לופ + שרידות איפוס ===== */
await admin.click('button:has-text("הגדרות")');
await admin.waitForSelector('.settings-tab');
await admin.locator('input[accept="audio/*"]').setInputFiles('track.wav');
await admin.waitForSelector('.advance-badge:has-text("קובץ מותאם אישית")');
check('music file uploaded', true);
await admin.click('button:has-text("⏹ כבויה")');
await admin.waitForTimeout(400);

await display.waitForSelector('audio', { timeout: 3000, state: 'attached' });
check('display audio element loops', await display.locator('audio').evaluate((el) => el.loop));

// איפוס משחק — הקובץ וההגדרות שורדים
await admin.click('button:has-text("איפוס משחק")');
await admin.click('button:has-text("כן, אפס")');
await admin.waitForTimeout(500);
check('music file survives reset', await admin.locator('.advance-badge:has-text("קובץ מותאם אישית")').isVisible());
check('music still playing after reset', await admin.locator('button:has-text("🎵 מתנגנת")').isVisible());
check('game actually reset (logo screen)', await display.locator('.logo').isVisible());

await browser.close();
console.log(failures === 0 ? '\nALL FIXES TESTS PASSED' : `\n${failures} TESTS FAILED`);
process.exit(failures === 0 ? 0 : 1);
