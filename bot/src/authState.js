/**
 * حالة اعتماد Baileys مخزَّنة في قاعدة الموقع بدل مجلّد على القرص.
 *
 * يقابل `useMultiFileAuthState` حرفاً بحرف: كل «ملف» هناك = صفّ هنا،
 * والقيمة تُشفَّر قبل مغادرة الجهاز (crypto.js).
 *
 * **لماذا لا القرص؟** لأن الجلسة عندها تتبع الجهاز: تنتقل إلى سيرفر ⇒ تمسح
 * QR من جديد، ويُمسح مجلّدك مع أي نشر أو إعادة تثبيت. وبهذا الشكل الجلسة
 * تتبع القاعدة — تنسخ البوت إلى أي جهاز بنفس المفتاح فيُكمل من حيث وقف.
 */
const { initAuthCreds, BufferJSON, proto } = require('@whiskeysockets/baileys');
const api = require('./api');
const { encrypt, decrypt } = require('./crypto');

/** أسماء المفاتيح تُنظَّف كما تفعل Baileys بأسماء الملفات. */
const fix = (s) => String(s).replace(/\//g, '__').replace(/:/g, '-');

async function useDjangoAuthState(tenant) {
  async function readMany(names) {
    if (!names.length) return {};
    const { values } = await api.authRead(tenant, names);
    const out = {};
    for (const [name, blob] of Object.entries(values || {})) {
      const plain = decrypt(name, blob);
      if (plain === null) continue;  // مفتاح تشفير مختلف أو بيانات معطوبة — نتجاهله
      try {
        out[name] = JSON.parse(plain, BufferJSON.reviver);
      } catch { /* تجاهُل قيمة تالفة أفضل من إسقاط الجلسة كلّها */ }
    }
    return out;
  }

  async function writeMany(entries) {
    const items = {};
    for (const [name, value] of entries) {
      items[name] = encrypt(name, JSON.stringify(value, BufferJSON.replacer));
    }
    if (Object.keys(items).length) await api.authWrite(tenant, items);
  }

  const stored = await readMany(['creds']);
  const creds = stored.creds || initAuthCreds();

  return {
    state: {
      creds,
      keys: {
        async get(type, ids) {
          const names = ids.map((id) => fix(`${type}-${id}`));
          const found = await readMany(names);
          const data = {};
          ids.forEach((id, i) => {
            let value = found[names[i]];
            if (value === undefined) return;
            if (type === 'app-state-sync-key') {
              value = proto.Message.AppStateSyncKeyData.fromObject(value);
            }
            data[id] = value;
          });
          return data;
        },
        async set(data) {
          const writes = [];
          const removes = [];
          for (const type of Object.keys(data)) {
            for (const id of Object.keys(data[type])) {
              const value = data[type][id];
              const name = fix(`${type}-${id}`);
              if (value) writes.push([name, value]);
              else removes.push(name);
            }
          }
          if (writes.length) await writeMany(writes);
          if (removes.length) await api.authRemove(tenant, removes);
        },
      },
    },
    saveCreds: () => writeMany([['creds', creds]]),
    clear: () => api.authClear(tenant),
  };
}

module.exports = { useDjangoAuthState };
