/**
 * أداة التقاط لقطات المرجع تلقائياً — تعمل على جهازك أنت (لا على السحابة).
 *
 * الفكرة: تفتح متصفحاً، تسجّل الدخول يدوياً مرة واحدة (مع الآلة الحاسبة 111111)،
 * ثم تضغط Enter في الطرفية، فيلتقط السكربت لقطة كاملة لكل رابط/قسم في الموقع
 * ويحفظها في مجلد ref-shots/.
 *
 * التشغيل (على جهازك):
 *   1) ثبّت Node.js (nodejs.org)
 *   2) في مجلد فارغ:  npm init -y  &&  npm i playwright  &&  npx playwright install chromium
 *   3) احفظ هذا الملف باسم capture_reference.mjs في نفس المجلد
 *   4) شغّل:  node capture_reference.mjs
 *   5) سجّل الدخول في المتصفح الذي يفتح (اسم مستخدم + كلمة سر + 111111)
 *   6) ارجع للطرفية واضغط Enter — سيبدأ التصوير التلقائي
 *   7) بعد الانتهاء: اضغط مجلد ref-shots/ (zip) وارفعه للمحادثة
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import readline from "node:readline";

const START_URL = "http://bayi.alayatl.com/index.php?giris=true";
const OUT = "ref-shots";
mkdirSync(OUT, { recursive: true });

const slug = (s) =>
  s.replace(/^https?:\/\/[^/]+/, "").replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 80) || "home";

function waitEnter(msg) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((res) => rl.question(msg, () => { rl.close(); res(); }));
}

const browser = await chromium.launch({ headless: false });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
await page.goto(START_URL, { waitUntil: "domcontentloaded" });

console.log("\n👉 سجّل الدخول في المتصفح (اسم المستخدم + كلمة السر + 111111).");
await waitEnter("   بعد ما تدخل وتشوف الصفحة الرئيسية، ارجع هنا واضغط Enter... ");

// اجمع كل الروابط الداخلية من القائمة الرئيسية والفرعية
const links = await page.evaluate(() => {
  const out = new Set();
  document.querySelectorAll("a[href]").forEach((a) => {
    const href = a.getAttribute("href") || "";
    if (!href || href.startsWith("#") || href.startsWith("javascript")) return;
    if (/cikis|logout|çıkış/i.test(href)) return; // تجاهل الخروج
    try { out.add(new URL(href, location.href).href); } catch {}
  });
  return [...out];
});

// أضف الصفحة الحالية أولاً
const targets = [page.url(), ...links.filter((u) => u.includes(location.hostname))];
const unique = [...new Set(targets)];
console.log(`\n📸 سألتقط ${unique.length} صفحة...\n`);

const index = [];
for (let i = 0; i < unique.length; i++) {
  const url = unique[i];
  const name = String(i).padStart(2, "0") + "_" + slug(url);
  try {
    await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
    index.push({ name, url });
    console.log(`  ✅ ${name}`);
  } catch (e) {
    console.log(`  ⚠️ تعذّر: ${url} (${e.message})`);
  }
}

writeFileSync(`${OUT}/_index.json`, JSON.stringify(index, null, 2));
console.log(`\n✅ تم! الصور في مجلد ${OUT}/ — اضغطه zip وارفعه.`);
await browser.close();
