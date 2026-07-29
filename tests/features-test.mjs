import { chromium } from 'playwright';

// בדיקת שלושת השיפורים: כפתור מסך מלא, קיצורי מקלדת, הוספה מהירה תוך כדי משחק
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

/* ===== 1. כפתור מסך מלא על מסך הקהל ===== */
check('fullscreen button exists on display', await display.locator('.fullscreen-btn').count() === 1);
await display.locator('.fullscreen-btn').click();
await display.waitForTimeout(300);
const fsState = await display.evaluate(() => !!document.fullscreenElement);
check('fullscreen toggles on click', fsState);
await display.locator('.fullscreen-btn').click();
await display.waitForTimeout(300);
check('fullscreen exits on second click', await display.evaluate(() => !document.fullscreenElement));

/* ===== הכנה: שחקנים + 3 שאלות לשלב א' ===== */
await admin.click('button:has-text("שחקנים")');
await admin.click('button:has-text("ייבוא רשימה")');
await admin.fill('textarea', "קבוצה א':\nאברהם כהן\nיוסף לוי\nמשה פרידמן\nדוד שוורץ\nיעקב גולדברג");
await admin.locator('.import-box .btn-primary').click();
await admin.click('button:has-text("❓ שאלות")');
await admin.waitForSelector('.pool-tabs');
await admin.click('button:has-text("📋 ייבוא")');
await admin.fill('textarea', 'שאלה 1? | ת1\nשאלה 2? | ת2\nשאלה 3? | ת3');
await admin.click('button:has-text("ייבא 3 שאלות")');
await admin.waitForTimeout(200);

await admin.click('button:has-text("🎮 משחק")');
check('keyboard hint shown', await admin.locator('.keys-hint').isVisible());
await admin.waitForSelector('.group-pick-grid');
await admin.locator('.group-pick').first().locator('button:has-text("טען קבוצה")').click();
await admin.waitForSelector('.intro-names');

/* ===== 2. קיצורי מקלדת ===== */
// לפני התחלת הסבב (מסך הקדמה) — חצים לא עושים כלום
await admin.keyboard.press('ArrowUp');
await admin.waitForTimeout(200);
check('arrows inactive before round starts', await admin.locator('.intro-names').isVisible());

await admin.click('button:has-text("התחל סבב")');
await admin.waitForSelector('.answer-buttons');

// חץ למעלה = נכון: ניקוד +1 והשאלה מתקדמת
await admin.keyboard.press('ArrowUp');
await admin.waitForTimeout(250);
check('ArrowUp answers correct (question advances)', (await admin.locator('.admin-question').textContent()).includes('שאלה 2'));
check('ArrowUp gives point', (await admin.locator('.question-counter').textContent()).replace(/\s/g, '').includes('2/3'));

// חץ למטה = שגוי: השאלה מתקדמת בלי נקודה
await admin.keyboard.press('ArrowDown');
await admin.waitForTimeout(250);
check('ArrowDown answers wrong (question advances)', (await admin.locator('.admin-question').textContent()).includes('שאלה 3'));

/* ===== 3. הוספה מהירה תוך כדי משחק ===== */
check('quick-add toggle visible in game tab', await admin.locator('.quick-add-head button').isVisible());
await admin.locator('.quick-add-head button').click();
await admin.waitForSelector('.quick-add-row');

// הקלדה בשדה ההוספה — החצים לא עונים על השאלה
await admin.locator('.quick-add-row input').first().click();
await admin.keyboard.press('ArrowUp');
await admin.waitForTimeout(250);
check('arrows ignored while typing in input', (await admin.locator('.admin-question').textContent()).includes('שאלה 3'));

// עונים על השאלה האחרונה — המאגר נגמר
await admin.click('button:has-text("נכון (+1)")');
await admin.waitForSelector('.finish-box');
check('finish box after last question', await admin.locator('button:has-text("סיום קבוצה")').isVisible());

// מוסיפים שאלה מהפאנל עצמו — בלי לעזוב את טאב המשחק
await admin.locator('.quick-add-row input').first().fill('שאלה 4 מהירה?');
await admin.locator('.quick-add-row input').nth(1).fill('ת4');
await admin.locator('.quick-add-row button:has-text("הוסף")').click();
await admin.waitForSelector('.answer-buttons', { timeout: 3000 });
check('quick-added question resumes round', (await admin.locator('.admin-question').textContent()).includes('שאלה 4 מהירה'));
check('confirmation message shown', (await admin.locator('.quick-add-msg').textContent()).includes('נוספה'));
await display.waitForTimeout(1900);
check('display shows quick-added question', (await display.locator('.display-question').textContent()).includes('שאלה 4 מהירה'));

// והשאלה נשמרה גם במאגר בטאב השאלות
await admin.keyboard.press('ArrowUp');
await admin.waitForTimeout(250);
await admin.click('button:has-text("❓ שאלות")');
await admin.waitForSelector('.question-list');
check('quick-added question in pool (used)', (await admin.locator('.question-row', { hasText: 'שאלה 4 מהירה' }).locator('.used-badge').count()) === 1);

await browser.close();
console.log(failures === 0 ? '\nALL FEATURES TESTS PASSED' : `\n${failures} TESTS FAILED`);
process.exit(failures === 0 ? 0 : 1);
