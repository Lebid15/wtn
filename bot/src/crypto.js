/**
 * تشفير مفاتيح جلسة واتساب قبل إرسالها إلى الموقع.
 *
 * مفاتيح Baileys تكافئ حسابك: من يملكها يقرأ رسائلك ويرسل باسمك. وهي تُحفظ
 * عندنا في قاعدة بيانات الموقع (لا على القرص — القرص يُمسح مع كل نشر). فلو
 * ذهبت إلى هناك بنصّها الصريح لكان تسريب نسخة احتياطية = اختطاف الحساب.
 *
 * لذلك تُشفَّر **هنا**، على جهاز البوت. المفتاح الأساسي في متغيّر البيئة
 * BOT_ENCRYPTION_KEY ولا يغادر هذا الجهاز أبداً — والموقع يحفظ نصّاً معمّى
 * لا يفهمه ولا يستطيع استعماله.
 *
 * AES-256-GCM (تعمية + وسم مصادقة يمنع العبث)، ومفتاح فرعي مشتقّ لكل مفتاح
 * على حدة بـ HKDF فلا يُعاد استعمال مفتاح واحد على كل الملفات.
 */
const crypto = require('crypto');

const INFO = Buffer.from('wtn-whatsapp-auth');

function masterKey() {
  const raw = process.env.BOT_ENCRYPTION_KEY || '';
  if (!raw) {
    throw new Error(
      'BOT_ENCRYPTION_KEY غير مضبوط. ولّده مرّة بـ: npm run keygen — ثم ضعه في .env واحتفظ بنسخة منه.\n' +
      'ضياعه يعني إعادة ربط الرقم بمسح QR من جديد.',
    );
  }
  const key = Buffer.from(raw, 'base64');
  if (key.length !== 32) throw new Error('BOT_ENCRYPTION_KEY يجب أن يكون 32 بايت بترميز base64');
  return key;
}

function subKey(name) {
  // اسم المفتاح ملحٌ (salt) — فلكل ملف مفتاحه الفرعي
  return Buffer.from(crypto.hkdfSync('sha256', masterKey(), Buffer.from(name), INFO, 32));
}

/** نصّ صريح → "base64(iv | tag | ciphertext)" */
function encrypt(name, plain) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', subKey(name), iv);
  const body = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), body]).toString('base64');
}

/** يعيد النصّ الصريح، أو null إن كان المفتاح خاطئاً أو البيانات معطوبة. */
function decrypt(name, blob) {
  try {
    const buf = Buffer.from(blob, 'base64');
    const decipher = crypto.createDecipheriv('aes-256-gcm', subKey(name), buf.subarray(0, 12));
    decipher.setAuthTag(buf.subarray(12, 28));
    return Buffer.concat([decipher.update(buf.subarray(28)), decipher.final()]).toString('utf8');
  } catch {
    return null;
  }
}

module.exports = { encrypt, decrypt, masterKey };
