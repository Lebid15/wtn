/**
 * جلسة واتساب واحدة = متجر واحد.
 *
 * كل متجر رقمه الخاص وجلسته الخاصة، فحظرُ رقمٍ يصيب متجراً واحداً لا المنصّة
 * كلّها. ولا يمكن لمتجر أن يمسّ جلسة آخر: كل نداء إلى الموقع يحمل رقم متجره.
 */
const { default: makeWASocket, DisconnectReason, Browsers } = require('@whiskeysockets/baileys');
const QRCode = require('qrcode');
const pino = require('pino');

const api = require('./api');
const { useDjangoAuthState } = require('./authState');

const logger = pino({ level: process.env.LOG_LEVEL || 'silent' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

class Session {
  constructor(tenant, name) {
    this.tenant = tenant;
    this.name = name;
    this.sock = null;
    this.status = 'idle';
    this.starting = false;
    this.closed = false;
  }

  log(...a) { console.log(`[${this.name}#${this.tenant}]`, ...a); }

  async report(data) {
    try { await api.session(this.tenant, data); }
    catch (e) { this.log('تعذّر إبلاغ الموقع:', e.message); }
  }

  async start() {
    if (this.starting || this.sock) return;
    this.starting = true;
    this.closed = false;
    try {
      const { state, saveCreds, clear } = await useDjangoAuthState(this.tenant);
      this.clearAuth = clear;
      await this.report({ status: 'connecting', ack_want: true, error: '' });

      const sock = makeWASocket({
        auth: state,
        logger,
        // لا يظهر البوت «متصلاً» دائماً، ولا يسحب تاريخ المحادثات كلّه:
        // كلاهما يقلّل بصمته الآلية ويخفّف خطر الحظر.
        markOnlineOnConnect: false,
        syncFullHistory: false,
        browser: Browsers.appropriate('Chrome'),
      });
      this.sock = sock;

      sock.ev.on('creds.update', saveCreds);
      sock.ev.on('connection.update', (u) => this.onConnection(u).catch(() => {}));
    } catch (e) {
      this.log('فشل بدء الجلسة:', e.message);
      await this.report({ status: 'closed', error: e.message.slice(0, 200), ack_want: true });
      this.sock = null;
    } finally {
      this.starting = false;
    }
  }

  async onConnection({ connection, lastDisconnect, qr }) {
    if (qr) {
      this.status = 'qr';
      const dataUrl = await QRCode.toDataURL(qr, { margin: 1, width: 320 });
      await this.report({ status: 'qr', qr: dataUrl });
      this.log('رمز QR جاهز — امسحه من هاتف الرقم');
    }

    if (connection === 'open') {
      this.status = 'connected';
      const number = (this.sock?.user?.id || '').split(':')[0].split('@')[0];
      await this.report({ status: 'connected', qr: '', device_number: number, error: '' });
      this.log('متّصل ✓', number);
    }

    if (connection === 'close') {
      const code = lastDisconnect?.error?.output?.statusCode;
      this.sock = null;
      this.status = 'closed';

      if (code === DisconnectReason.loggedOut) {
        // خرج المستخدم من هاتفه ⇒ المفاتيح فاسدة، نمسحها لتبدأ عملية ربط نظيفة
        this.log('سُجّل الخروج من الهاتف — تُمسح مفاتيح الجلسة');
        try { await this.clearAuth?.(); } catch { /* الموقع سيبلَّغ على أي حال */ }
        await this.report({ status: 'idle', qr: '', device_number: '', error: 'سُجّل الخروج من الهاتف' });
        return;
      }

      await this.report({ status: 'closed', qr: '', error: `انقطع الاتصال (${code || '؟'})` });
      if (!this.closed) {
        this.log('انقطع — إعادة محاولة بعد ثانيتين');
        await sleep(2000);
        this.start().catch(() => {});
      }
    }
  }

  async logout() {
    this.closed = true;
    try { await this.sock?.logout(); } catch { /* قد تكون الجلسة منقطعة أصلاً */ }
    try { await this.sock?.end?.(); } catch { /* ignore */ }
    this.sock = null;
    this.status = 'idle';
    try {
      const { clear } = await useDjangoAuthState(this.tenant);
      await clear();
    } catch (e) { this.log('تعذّر مسح المفاتيح:', e.message); }
    await this.report({ status: 'idle', qr: '', device_number: '', ack_want: true, error: '' });
    this.log('قُطع الربط ومُسحت المفاتيح');
  }

  /** هل الرقم مسجَّل على واتساب أصلاً؟ الإرسال إلى غير المسجّل بصمة سبام. */
  async isOnWhatsApp(number) {
    try {
      const res = await this.sock.onWhatsApp(`${number}@s.whatsapp.net`);
      return Array.isArray(res) && res.length > 0 && res[0]?.exists !== false;
    } catch {
      return true;  // تعذّر التحقّق ⇒ لا نمنع الإرسال بسببه
    }
  }

  async send(number, text) {
    if (!this.sock || this.status !== 'connected') {
      throw Object.assign(new Error('الجلسة غير متّصلة'), { retry: true });
    }
    if (!(await this.isOnWhatsApp(number))) {
      throw new Error('الرقم غير مسجَّل على واتساب');
    }
    await this.sock.sendMessage(`${number}@s.whatsapp.net`, { text });
  }
}

module.exports = { Session, sleep };
