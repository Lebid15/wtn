/**
 * بوت واتساب — الحلقة الرئيسية.
 *
 * ينبض كل بضع ثوانٍ فيسأل الموقع: أي متجر يريد ربطاً أو قطعاً؟ وهل عند
 * المتّصلين رسالة تنتظر؟ ثم يرسل بتهدئة ويعيد النتيجة.
 *
 * **هو نفسه العامل الخلفي**: الطابور في قاعدة الموقع، والتهدئة هنا. فلا
 * Celery ولا Redis ولا طابور ثالث.
 *
 * ولأن السؤال يأتي منه لا إليه: يعمل من جهاز المالك اليوم، ومن سيرفر مدفوع
 * غداً، بلا عنوان عام ولا منفذ مفتوح ولا سطر يتغيّر سوى SITE_URL.
 */
require('./env');

const api = require('./api');
const { Session, sleep } = require('./session');

const POLL_MS = Number(process.env.POLL_INTERVAL_MS || 3000);

/** جلسة لكل متجر — العزل هنا كما هو في القاعدة. */
const sessions = new Map();
/** عامل إرسال لكل متجر: مشغول؟ ومتى تنتهي استراحته؟ وكم أرسل في دفعته؟ */
const workers = new Map();

function sessionOf(tenant, name) {
  if (!sessions.has(tenant)) sessions.set(tenant, new Session(tenant, name));
  return sessions.get(tenant);
}

function workerOf(tenant) {
  if (!workers.has(tenant)) workers.set(tenant, { busy: false, sentInBatch: 0, restUntil: 0 });
  return workers.get(tenant);
}

const rand = (lo, hi) => lo + Math.random() * (hi - lo);

/**
 * إرسال رسالة واحدة ثم تهدئة.
 * التهدئة **بعد** الإرسال لا قبله، فلا تتأخّر أوّل رسالة بلا سبب.
 */
async function runJob(session, job, throttle) {
  const w = workerOf(session.tenant);
  w.busy = true;
  try {
    await session.send(job.number, job.text);
    await api.result(job.id, true);
    session.log(`أُرسلت → +${job.number}`);
  } catch (e) {
    const retry = Boolean(e.retry);
    await api.result(job.id, false, e.message.slice(0, 200), retry);
    session.log(`فشلت → +${job.number}: ${e.message}`);
  }

  // تهدئة عشوائية بين كل رسالتين — أهمّ حاجز ضدّ حظر الرقم
  const wait = rand(throttle.min_delay, throttle.max_delay) * 1000;
  w.sentInBatch += 1;
  if (w.sentInBatch >= throttle.batch_size) {
    w.sentInBatch = 0;
    w.restUntil = Date.now() + throttle.batch_pause * 1000;
    session.log(`اكتملت دفعة — استراحة ${throttle.batch_pause}s`);
  }
  await sleep(wait);
  w.busy = false;
}

/** المتاجر الجاهزة لاستلام رسالة الآن — الموقع لا يحجز رسالةً لغيرها. */
function readyTenants() {
  const out = [];
  for (const [tenant, s] of sessions) {
    const w = workerOf(tenant);
    if (s.status === 'connected' && !w.busy && Date.now() >= w.restUntil) out.push(tenant);
  }
  return out;
}

async function tick() {
  const { sessions: rows } = await api.poll(readyTenants());

  for (const row of rows) {
    const s = sessionOf(row.tenant, row.name);

    if (row.want === 'logout') {
      await s.logout();
      continue;
    }
    if (row.want === 'start') {
      await s.start();
      continue;
    }
    // إحياء تلقائي: للمتجر مفاتيح محفوظة ولا جلسة في الذاكرة ⇒ نوقظه.
    // بهذا لا يحتاج المالك ربطاً جديداً بعد كل إعادة تشغيل للبوت.
    if (row.has_auth && !s.sock && !s.starting && s.status !== 'qr') {
      await s.start();
      continue;
    }

    if (row.job) runJob(s, row.job, row.throttle).catch((e) => s.log('خطأ في العامل:', e.message));
  }
}

async function main() {
  console.log('بوت واتساب — wtn');
  console.log('الموقع:', api.SITE);
  console.log('النبضة: كل', POLL_MS, 'مللي ثانية\n');

  let quiet = false;
  for (;;) {
    try {
      await tick();
      quiet = false;
    } catch (e) {
      if (!quiet) {  // لا نُغرق الشاشة بنفس الخطأ كل ثلاث ثوانٍ
        console.error('نبضة فاشلة:', e.message);
        quiet = true;
      }
    }
    await sleep(POLL_MS);
  }
}

process.on('SIGINT', () => { console.log('\nإيقاف — الرسائل غير المرسَلة تبقى في الطابور.'); process.exit(0); });

main();
