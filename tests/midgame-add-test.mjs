import { chromium } from 'playwright';

// בדיקת התיקון: הוספת שאלות באמצע משחק מצטרפת לסבב הפעיל
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

// הכנה: 5 שחקנים, 2 שאלות בלבד לשלב א'
await admin.click('button:has-text("שחקנים")');
await admin.click('button:has-text("ייבוא רשימה")');
await admin.fill('textarea', "קבוצה א':\nאברהם כהן\nיוסף לוי\nמשה פרידמן\nדוד שוורץ\nיעקב גולדברג");
await admin.locator('.import-box .btn-primary').click();
await admin.click('button:has-text("❓ שאלות")');
await admin.waitForSelector('.pool-tabs');
await admin.click('button:has-text("📋 ייבוא")');
await admin.fill('textarea', 'שאלה 1? | ת1\nשאלה 2? | ת2');
await admin.click('button:has-text("ייבא 2 שאלות")');
await admin.waitForTimeout(200);

// טוענים קבוצה ומתחילים סבב עם 2 שאלות
await admin.click('button:has-text("🎮 משחק")');
await admin.waitForSelector('.group-pick-grid');
await admin.locator('.group-pick').first().locator('button:has-text("טען קבוצה")').click();
await admin.waitForSelector('.intro-names');
await admin.click('button:has-text("התחל סבב")');
await display.waitForSelector('.display-question', { timeout: 3000 });

// עונים על שתי השאלות — המאגר נגמר
await admin.click('button:has-text("נכון (+1)")');
await admin.waitForTimeout(150);
await admin.click('button:has-text("נכון (+1)")');
await admin.waitForSelector('.finish-box');
check('questions exhausted -> finish box shown', await admin.locator('button:has-text("סיום קבוצה")').isVisible());

// באמצע המשחק מוסיפים שאלה חדשה למאגר
await admin.click('button:has-text("❓ שאלות")');
await admin.waitForSelector('.pool-tabs');
await admin.click('button:has-text("📋 ייבוא")');
await admin.fill('textarea', 'שאלה 3 חדשה? | ת3');
await admin.click('button:has-text("ייבא 1 שאלות")');
await admin.waitForTimeout(300);

// חוזרים למשחק — השאלה החדשה נכנסה לסבב הפעיל
await admin.click('button:has-text("🎮 משחק")');
await admin.waitForSelector('.answer-buttons', { timeout: 3000 });
check('finish box replaced by new question', !(await admin.locator('.finish-box').isVisible().catch(() => false)));
check('admin shows appended question', (await admin.locator('.admin-question').textContent()).includes('שאלה 3 חדשה'));
check('counter shows 3/3', (await admin.locator('.question-counter').textContent()).replace(/\s/g, '').includes('3/3'));

// גם מסך הקהל התעדכן
await display.waitForTimeout(1900);
check('display shows appended question', (await display.locator('.display-question').textContent()).includes('שאלה 3 חדשה'));

// עונים על השאלה החדשה — הסבב מסתיים שוב כרגיל
await admin.click('button:has-text("נכון (+1)")');
await admin.waitForSelector('.finish-box');
check('finish box returns after appended question answered', await admin.locator('button:has-text("סיום קבוצה")').isVisible());

// Undo מהסרגל העליון מחזיר את השאלה שנוספה — הצירוף לא שבר את ההיסטוריה
await admin.click('button:has-text("⟲ חזור")');
await admin.waitForSelector('.answer-buttons');
check('undo still works after append', (await admin.locator('.admin-question').textContent()).includes('שאלה 3 חדשה'));

await browser.close();
console.log(failures === 0 ? '\nALL MIDGAME-ADD TESTS PASSED' : `\n${failures} TESTS FAILED`);
process.exit(failures === 0 ? 0 : 1);
