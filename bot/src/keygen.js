/** يولّد مفتاح تشفير جلسات واتساب — يُنفَّذ مرّةً واحدة في عمر المشروع. */
const crypto = require('crypto');

const key = crypto.randomBytes(32).toString('base64');
console.log('\nBOT_ENCRYPTION_KEY=' + key + '\n');
console.log('ضعه في ملف bot/.env — واحتفظ بنسخة منه في مكان آمن.');
console.log('بضياعه تُفقَد الجلسات المحفوظة ويلزم مسح رمز QR من جديد.\n');
