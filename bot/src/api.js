/**
 * عميل الموقع — الاتجاه الوحيد: البوت يسأل، والموقع يجيب.
 *
 * لا يفتح البوت منفذاً ولا يحتاج عنواناً عاماً، فيعمل من أي جهاز خلف أي راوتر.
 * وحين ينتقل إلى سيرفر مدفوع لا يتغيّر إلا SITE_URL.
 */
const SITE = (process.env.SITE_URL || 'http://localhost:8000').replace(/\/+$/, '');
const KEY = process.env.INTERNAL_API_KEY || '';

if (!KEY) {
  console.error('INTERNAL_API_KEY غير مضبوط — ضعه في bot/.env مطابقاً لما على الموقع.');
  process.exit(1);
}

async function call(path, body) {
  const res = await fetch(`${SITE}/api/whatsapp/internal/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Internal-Api-Key': KEY },
    body: JSON.stringify(body || {}),
  });
  const text = await res.text();
  if (!res.ok) {
    // نُظهر رمز HTTP وأوّل الجسم — لا «تعذّر الاتصال» المضلّلة
    throw new Error(`${path} → HTTP ${res.status}: ${text.slice(0, 200)}`);
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`${path} → ردّ ليس JSON: ${text.slice(0, 200)}`);
  }
}

module.exports = {
  SITE,
  poll: (ready) => call('poll/', { ready }),
  session: (tenant, data) => call('session/', { tenant, ...data }),
  result: (id, ok, error, retry) => call('result/', { id, ok, error, retry }),
  authRead: (tenant, keys) => call('auth/', { tenant, op: 'read', keys }),
  authWrite: (tenant, items) => call('auth/', { tenant, op: 'write', items }),
  authRemove: (tenant, keys) => call('auth/', { tenant, op: 'remove', keys }),
  authClear: (tenant) => call('auth/', { tenant, op: 'clear' }),
};
