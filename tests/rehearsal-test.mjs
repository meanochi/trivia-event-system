import { chromium } from 'playwright';
import { readFileSync } from 'fs';

/**
 * חזרה גנרלית: משחק מלא מקצה לקצה —
 * 4 קבוצות בסיבוב המהיר → דירוג וזוגות → 3 מקצי ראש בראש →
 * 3 דו-קרבות (פוקר פייס + חזיון תעתועים) → ניקוד חיצוני → גמר → מנצח.
 */

const BASE = 'http://localhost:4174';
let failures = 0;
function check(name, cond) {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}`);
  if (!cond) failures++;
}

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
const admin = await context.newPage();
const display = await context.newPage();

await admin.goto(`${BASE}/admin`);
await admin.waitForSelector('.admin-topbar');
await display.goto(`${BASE}/display`);
await display.waitForSelector('.logo');

/* ========== הקמה: 20 שחקנים ומאגרי שאלות ========== */

await admin.click('button:has-text("שחקנים")');
await admin.click('button:has-text("ייבוא רשימה")');
const names = [];
for (let g = 1; g <= 4; g++) {
  names.push(`קבוצה ${g}:`);
  for (let p = 1; p <= 5; p++) names.push(`שחקן ${g}-${p}`);
}
await admin.fill('textarea', names.join('\n'));
await admin.locator('.import-box .btn-primary').click();
await admin.waitForTimeout(200);
check('20 players imported to 4 groups', (await admin.locator('.player-row').count()) === 20);

async function importQuestions(poolText, lines) {
  await admin.click('button:has-text("❓ שאלות")');
  await admin.waitForSelector('.pool-tabs');
  await admin.click(`.pool-tab:has-text("${poolText}")`);
  await admin.click('button:has-text("📋 ייבוא")');
  await admin.fill('.import-box textarea', lines.join('\n'));
  await admin.locator('.import-box .btn-primary').click();
  await admin.waitForTimeout(150);
}

// ראש בראש + פוקר פייס + גמר מראש; שאלות הסיבוב המהיר — 5 לפני כל קבוצה
await importQuestions('ראש בראש', Array.from({ length: 12 }, (_, i) => `ב${i + 1}? | ת`));
await importQuestions('פוקר פייס', Array.from({ length: 24 }, (_, i) => `מיוחדת${i + 1}? | ת`));
await importQuestions('הגמר הגדול', Array.from({ length: 8 }, (_, i) => `גמר${i + 1}? | ת`));

// 9 תמונות לחזיון תעתועים
await admin.click('.pool-tab:has-text("חזיון תעתועים")');
const pngB64 = readFileSync('test-a.png').toString('base64');
await admin.locator('input[accept="image/*"]').evaluate((input, b64) => {
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const dt = new DataTransfer();
  for (let i = 1; i <= 9; i++) dt.items.add(new File([bytes], `תמונה-${i}.png`, { type: 'image/png' }));
  input.files = dt.files;
  input.dispatchEvent(new Event('change', { bubbles: true }));
}, pngB64);
await admin.waitForSelector('.image-card');
check('9 images uploaded', (await admin.locator('.image-card').count()) === 9);

/* ========== שלב א' — 4 קבוצות ========== */

for (let g = 0; g < 4; g++) {
  // 5 שאלות טריות לקבוצה
  await importQuestions('הסיבוב המהיר', Array.from({ length: 5 }, (_, i) => `א:ק${g + 1}-ש${i + 1}? | ת`));
  await admin.click('button:has-text("🎮 משחק")');
  await admin.waitForSelector('.group-pick-grid');
  await admin.locator('.group-pick').nth(g).locator('button').click();
  await admin.waitForSelector('.intro-names');
  await admin.click('button:has-text("התחל סבב")');
  await admin.waitForSelector('.answer-buttons');
  // שחקנים 1-3 עונים נכון, 4-5 שגוי → 3 עולים ברורים
  for (let q = 0; q < 5; q++) {
    await admin.click(q < 3 ? 'button:has-text("נכון (+1)")' : 'button:has-text("שגוי")');
    await admin.waitForTimeout(120);
  }
  await admin.waitForSelector('.finish-box');
  await admin.click('button:has-text("סיום קבוצה")');
  await admin.waitForSelector('.summary-list');
}
check('all 4 groups completed', (await admin.locator('.group-pick.done').count()) === 4);
check('next-stage button appeared', await admin.locator('button:has-text("המשך לשלב ב")').isVisible());
await display.waitForTimeout(1900);
await display.screenshot({ path: 'rehearsal-1-groupsummary.png' });

/* ========== מעבר לשלב ב' + 3 מקצים ========== */

await admin.click('button:has-text("המשך לשלב ב")');
await display.waitForSelector('.stage-title-big', { timeout: 3000 });
await admin.waitForSelector('.transition-grid');
check('12 auto-selected for stage B', (await admin.locator('.transition-row.picked').count()) === 12);
await admin.click('button:has-text("הצע חלוקה לזוגות")');
await admin.waitForSelector('.pairs-grid');
check('6 valid pairs suggested', (await admin.locator('.pair-card').count()) === 6 && (await admin.locator('.pair-card.invalid').count()) === 0);
await admin.click('button:has-text("אשר זוגות והצג לקהל")');
await display.waitForSelector('.pairs-board', { timeout: 3000 });

for (let m = 0; m < 3; m++) {
  await admin.click('button:has-text("הצג את המקצה לקהל")');
  await display.waitForSelector('.versus-layout', { timeout: 3000 });
  // סבב זוג 1: 2 נכונות
  await admin.locator('.btn-primary:has-text("התחל סבב")').click();
  await admin.waitForSelector('.answer-buttons');
  await admin.click('button:has-text("נכון (+1 לזוג)")');
  await admin.click('button:has-text("נכון (+1 לזוג)")');
  await admin.click('button:has-text("סיים סבב")');
  // סבב זוג 2: נכונה אחת
  await admin.locator('.btn-primary:has-text("התחל סבב")').click();
  await admin.waitForSelector('.answer-buttons');
  await admin.click('button:has-text("נכון (+1 לזוג)")');
  await admin.click('button:has-text("סיים סבב")');
  await admin.waitForSelector('button:has-text("מנצחים")');
  await admin.locator('button.btn-primary:has-text("מנצחים")').click();
  await display.waitForSelector('.winner-badge', { timeout: 3000 });
  if (m < 2) await admin.click('button:has-text("למקצה הבא")');
}
if (await display.locator('.pair-summary-box').first().isVisible()) {
  await display.screenshot({ path: 'rehearsal-2-matchsummary.png' });
}
check('stage B continue button', await admin.locator('button:has-text("המשך לשלב ג")').isVisible());

/* ========== שלב ג' — 3 דו-קרבות ========== */

await admin.click('button:has-text("המשך לשלב ג")');
await display.waitForSelector('.stage-title-big', { timeout: 3000 });
await admin.waitForSelector('.stagec-candidates');
check('6 winners auto-selected for stage C', (await admin.locator('.transition-row.picked').count()) === 6);
await admin.click('button:has-text("הצע דו־קרבות")');
await admin.waitForSelector('.pairs-grid');
await admin.click('button:has-text("אשר דו־קרבות והצג לקהל")');
await display.waitForSelector('.versus-layout', { timeout: 3000 });

for (let d = 0; d < 3; d++) {
  await admin.click('button:has-text("התחל פוקר פייס")');
  await admin.waitForSelector('.answer-buttons');
  for (let q = 0; q < 8; q++) {
    await admin.click(q % 2 === 0 ? 'button:has-text("נכון (+1)")' : 'button:has-text("שגוי")');
    await admin.waitForTimeout(100);
  }
  await admin.locator('button:has-text("המשך לחזיון תעתועים")').click();
  await admin.waitForSelector('.image-question-row', { timeout: 5000 });
  if (d === 0) {
    await display.waitForSelector('.display-image', { timeout: 5000 });
    check('image visible in duel round', await display.locator('.display-image').evaluate((el) => el.naturalWidth > 0));
    await display.screenshot({ path: 'rehearsal-3-imageround.png' });
  }
  await admin.click('button:has-text("נכון (+1)")');
  await admin.waitForTimeout(150);
  await admin.click('button:has-text("נכון (+1)")');
  await admin.click('button:has-text("סיים חלק")');
  await admin.waitForSelector('.match-score-line.big');
  if (d < 2) {
    await admin.click('button:has-text("לדו־קרב הבא")');
    await admin.waitForSelector('button:has-text("התחל פוקר פייס")');
  }
}

// שרידות באמצע: רענון שני החלונות לפני הגמר
await admin.waitForTimeout(500);
await admin.reload();
await admin.waitForSelector('.admin-topbar');
await display.reload();
await display.waitForSelector('.display-screen', { timeout: 5000 });
check('stage C continue button after reload', await admin.locator('button:has-text("המשך לגמר הגדול")').isVisible());

/* ========== שלב ד' — הגמר ========== */

await admin.click('button:has-text("המשך לגמר הגדול")');
await display.waitForSelector('.stage-title-big', { timeout: 3000 });
await admin.waitForSelector('.external-table');
check('external table shows 6 candidates', (await admin.locator('.external-table tbody tr').count()) === 6);
// בונוס חיצוני לשניים
await admin.locator('.external-table tbody tr').nth(0).locator('input[type="number"]').fill('4');
await admin.locator('.external-table tbody tr').nth(1).locator('input[type="number"]').fill('2');
await admin.waitForTimeout(300);
await admin.click('button:has-text("שקלל והצג פיינליסטים")');
await display.waitForSelector('.finalists-row', { timeout: 3000 });
check('2 finalists revealed', (await display.locator('.finalist-card').count()) === 2);
await display.screenshot({ path: 'rehearsal-4-finalists.png' });

// סבב פיינליסט 1: 2 נכונות
await admin.locator('button:has-text("התחל את הסבב של")').click();
await admin.waitForSelector('.answer-buttons');
await admin.click('button:has-text("חיובי (+1)")');
await admin.click('button:has-text("חיובי (+1)")');
await admin.click('button:has-text("סיים סבב")');
await admin.waitForSelector('button:has-text("התחל את הסבב של")');
// סבב פיינליסט 2: נכונה אחת
await admin.locator('button:has-text("התחל את הסבב של")').click();
await admin.waitForSelector('.answer-buttons');
await admin.click('button:has-text("חיובי (+1)")');
await admin.click('button:has-text("סיים סבב")');
await admin.waitForSelector('button:has-text("הכרז על")');

// הכרזת המנצח
await admin.locator('button.btn-pink:has-text("הכרז על")').click();
await display.waitForSelector('.winner-screen', { timeout: 3000 });
check('winner screen with name', (await display.locator('.winner-name').textContent()).includes('שחקן'));
check('confetti running', (await display.locator('canvas').count()) >= 1);
await display.waitForTimeout(1200);
await display.screenshot({ path: 'rehearsal-5-winner.png' });
check('admin shows declared winner', await admin.locator('.section-title:has-text("המנצח הוכרז")').isVisible());

// חזרה ללוגו לסיום
await admin.click('button:has-text("חזרה ללוגו")');
await display.waitForSelector('.logo-entrance', { timeout: 3000 });
check('back to logo at the end', true);

await browser.close();
console.log(failures === 0 ? '\n🎉 FULL DRESS REHEARSAL PASSED' : `\n${failures} CHECKS FAILED`);
process.exit(failures === 0 ? 0 : 1);
