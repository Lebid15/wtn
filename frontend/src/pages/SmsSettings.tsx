import { useEffect, useState } from "react";
import { api } from "../api";

interface Sms { sms_provider: string; sms_api_key: string; sms_sender: string; sms_enabled: boolean }

export default function SmsSettings() {
  const [s, setS] = useState<Sms | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => { api.get("/settings/sms/").then((r) => setS(r.data)); }, []);
  if (!s) return <div style={{ padding: 30 }}>جارٍ التحميل...</div>;
  const set = (k: keyof Sms, v: any) => setS({ ...s, [k]: v });

  async function save() {
    setSaving(true); setMsg("");
    try { await api.put("/settings/sms/", s); setMsg("تم الحفظ ✅"); }
    finally { setSaving(false); }
  }

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ fontSize: 20, color: "var(--primary-dark)", marginBottom: 14 }}>إعدادات SMS (Sms Servisleri)</h2>

      {/* الإعدادات تُحفظ ولا إرسال بعد — قولها صراحةً أصدق من صفحةٍ
          توهم صاحبها أن رسائله تصل. تُحذف هذه اللافتة يوم يُبنى الإرسال. */}
      <div style={{
        background: "#fef3c7", border: "1px solid #fcd34d", color: "#78350f",
        borderRadius: 10, padding: "12px 15px", marginBottom: 16,
        fontSize: 13.5, lineHeight: 1.9, fontWeight: 600,
      }}>
        <b>خدمة الرسائل غير مفعّلة بعد.</b> ما تضبطه هنا يُحفظ وينتظر،
        <b> ولا تُرسل رسائل SMS فعلياً حتى الآن</b>. لتنبيه وكلائك اليوم
        استعمل <b>واتساب</b> — وهو يعمل.
      </div>
      <div style={panel}>
        <div style={panelHead}>مزوّد خدمة الرسائل</div>
        <div style={{ padding: 20 }}>
          <Row label="تفعيل الرسائل">
            <button type="button" onClick={() => set("sms_enabled", !s.sms_enabled)}
              style={{ border: 0, borderRadius: 4, padding: "6px 16px", color: "#fff",
                background: s.sms_enabled ? "var(--ok)" : "#8a999e" }}>
              {s.sms_enabled ? "مفعّل" : "معطّل"}
            </button>
          </Row>
          <Row label="المزوّد">
            <select value={s.sms_provider} onChange={(e) => set("sms_provider", e.target.value)}>
              <option value="">— اختر —</option>
              <option value="whatsapp">WhatsApp API</option>
              <option value="syriatel">سيرياتيل SMS</option>
              <option value="mtn">MTN SMS</option>
              <option value="custom">مزوّد مخصّص</option>
            </select>
          </Row>
          <Row label="مفتاح الـ API"><input style={inp} value={s.sms_api_key} onChange={(e) => set("sms_api_key", e.target.value)} placeholder="••••••••" /></Row>
          <Row label="اسم المُرسِل"><input style={inp} value={s.sms_sender} onChange={(e) => set("sms_sender", e.target.value)} placeholder="ALAYA" /></Row>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8 }}>
            <button className="btn g" onClick={save} disabled={saving}>{saving ? "جارٍ الحفظ..." : "حفظ الإعدادات"}</button>
            {msg && <span style={{ color: "var(--ok)", fontSize: 14 }}>{msg}</span>}
          </div>
          <div style={note}>تُستخدم الرسائل لأكواد التحقق (2FA) وإشعارات الطلبات للعملاء.</div>
        </div>
      </div>
    </div>
  );
}
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
      <div style={{ width: 140, textAlign: "left", color: "var(--muted)", fontSize: 14 }}>{label} :</div>
      <div style={{ flex: 1 }}>{children}</div>
    </div>
  );
}
const panel: React.CSSProperties = { background: "#fff", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden", maxWidth: 620 };
const panelHead: React.CSSProperties = { background: "var(--primary)", color: "#fff", padding: "10px 18px", fontSize: 15, fontWeight: 700 };
const inp: React.CSSProperties = { width: "100%", maxWidth: 380 };
const note: React.CSSProperties = { background: "#f6f8f9", border: "1px solid #dbe3e5", color: "var(--muted)", fontSize: 13, padding: "10px 14px", borderRadius: 6, marginTop: 16 };
