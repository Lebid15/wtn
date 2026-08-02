import { useEffect, useRef, useState } from "react";
import { api } from "../api";
import Icon from "../components/Icon";
import { labelOf, symbolOf } from "../currency";

interface Settings {
  id: number; login_id: string; name: string; role: string; role_label: string;
  display_currency: string; credit_limit: string; balance: string; status: string;
  phone: string; whatsapp: string; whatsapp_pretty: string;
  country: string; province: string;
  id_image: string; shop_image: string; auto_debt_collection: boolean;
  base_currency: string; available_currencies: string[];
}

const COUNTRIES = [
  { code: "SY", flag: "🇸🇾", name: "سوريا" },
  { code: "TR", flag: "🇹🇷", name: "تركيا" },
  { code: "SA", flag: "🇸🇦", name: "السعودية" },
  { code: "IQ", flag: "🇮🇶", name: "العراق" },
  { code: "AE", flag: "🇦🇪", name: "الإمارات" },
  { code: "EG", flag: "🇪🇬", name: "مصر" },
  { code: "JO", flag: "🇯🇴", name: "الأردن" },
  { code: "LB", flag: "🇱🇧", name: "لبنان" },
  { code: "DE", flag: "🇩🇪", name: "ألمانيا" },
];

/** أقصى بُعد للصورة بعد التصغير — يكفي لقراءة هوية ويُبقي الحجم صغيراً. */
const MAX_DIM = 1400;

/** يصغّر الصورة في المتصفّح ويعيدها data URL — فلا تُرسل ملفات ضخمة. */
function shrink(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("تعذّرت قراءة الملف"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("الملف ليس صورة صالحة"));
      img.onload = () => {
        const scale = Math.min(1, MAX_DIM / Math.max(img.width, img.height));
        const c = document.createElement("canvas");
        c.width = Math.round(img.width * scale);
        c.height = Math.round(img.height * scale);
        const ctx = c.getContext("2d");
        if (!ctx) return reject(new Error("تعذّرت معالجة الصورة"));
        ctx.drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL("image/jpeg", 0.75));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export default function DealerSettingsModal({
  dealerId, onClose, onSaved,
}: { dealerId: number; onClose: () => void; onSaved: () => void }) {
  const [tab, setTab] = useState<"account" | "profile">("account");
  const [f, setF] = useState<Settings | null>(null);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    api.get(`/dealers/${dealerId}/settings/`)
      .then((r) => setF(r.data))
      .catch((e) => setMsg({ ok: false, text: e?.response?.data?.detail || "تعذّر الجلب" }));
  }, [dealerId]);

  const set = (k: keyof Settings, v: any) => setF((o) => (o ? { ...o, [k]: v } : o));

  async function save() {
    if (!f) return;
    if (pw && pw !== pw2) { setMsg({ ok: false, text: "كلمتا السر غير متطابقتين" }); return; }
    setBusy(true); setMsg(null);
    try {
      const r = await api.post(`/dealers/${dealerId}/settings/`, {
        display_currency: f.display_currency,
        credit_limit: f.credit_limit || "0",
        status: f.status,
        phone: f.phone,
        whatsapp: f.whatsapp,
        country: f.country,
        province: f.province,
        id_image: f.id_image,
        shop_image: f.shop_image,
        auto_debt_collection: f.auto_debt_collection,
        ...(pw ? { new_password: pw } : {}),
      });
      setF(r.data); setPw(""); setPw2("");
      setMsg({ ok: true, text: "حُفظت الإعدادات" });
      onSaved();
    } catch (e: any) {
      setMsg({ ok: false, text: e?.response?.data?.detail || "تعذّر الحفظ" });
    } finally { setBusy(false); }
  }

  return (
    <div style={ovl} onClick={busy ? undefined : onClose}>
      <div style={box} onClick={(e) => e.stopPropagation()}>
        <div style={head}>
          <span>
            إعدادات الوكيل {f ? `— ${f.name}` : ""}
            {f && <span style={{ opacity: 0.75, fontWeight: 400, fontSize: 13 }}> · {f.role_label} · {f.login_id}</span>}
          </span>
          <button type="button" onClick={onClose} style={xBtn}>✕</button>
        </div>

        <div style={tabs}>
          <button onClick={() => setTab("account")} style={{ ...tabBtn, ...(tab === "account" ? tabOn : {}) }}>
            <Icon name="settings" size={14} style={{ marginInlineEnd: 6, verticalAlign: -2 }} />الحساب
          </button>
          <button onClick={() => setTab("profile")} style={{ ...tabBtn, ...(tab === "profile" ? tabOn : {}) }}>
            <Icon name="user" size={14} style={{ marginInlineEnd: 6, verticalAlign: -2 }} />بيانات الوكيل
          </button>
        </div>

        {!f ? (
          <div style={{ padding: 26, color: "var(--muted)" }}>جارٍ التحميل...</div>
        ) : (
          <div style={{ padding: 16 }}>
            {tab === "account" ? (
              <div style={{ display: "grid", gap: 14 }}>
                <div style={grid2}>
                  <Fld label="عملة الوكيل (ما يراه في لوحته)">
                    <select value={f.display_currency} onChange={(e) => set("display_currency", e.target.value)} style={inp}>
                      <option value="">{symbolOf(f.base_currency)} عملة الموقع ({f.base_currency})</option>
                      {f.available_currencies.map((c) => (
                        <option key={c} value={c}>{symbolOf(c)} {labelOf(c)} ({c})</option>
                      ))}
                    </select>
                  </Fld>
                  <Fld label="الحالة">
                    <select value={f.status} onChange={(e) => set("status", e.target.value)} style={inp}>
                      <option value="active">نشط</option>
                      <option value="passive">موقوف</option>
                      <option value="blacklisted">قائمة سوداء</option>
                    </select>
                  </Fld>
                  <Fld label={`الحد الائتماني (${f.base_currency}) — صفر أو رقم سالب`}>
                    <input type="number" step="0.01" max="0" value={f.credit_limit}
                      onChange={(e) => set("credit_limit", e.target.value)} style={inp} />
                  </Fld>
                  <Fld label="الرصيد الحالي">
                    <div style={{ ...inp, display: "flex", alignItems: "center", background: "var(--surface-2)", fontWeight: 700 }}>
                      {Number(f.balance).toLocaleString("en-US", { minimumFractionDigits: 2 })} {symbolOf(f.base_currency)}
                    </div>
                  </Fld>
                </div>
                <div style={hint}>
                  الحد الائتماني أقصى دَين تسمح به: <b>-500</b> يعني أن رصيده يهبط
                  إلى −500 ثم يتوقّف شراؤه.
                </div>

                <div style={{ borderTop: "1px solid var(--border)", paddingTop: 14 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 800, color: "var(--primary-dark)", marginBottom: 10 }}>
                    تغيير كلمة السر
                  </div>
                  <div style={grid2}>
                    <Fld label="كلمة سر جديدة">
                      <input type="password" value={pw} onChange={(e) => setPw(e.target.value)}
                        placeholder="اتركها فارغة لإبقائها كما هي" style={inp} autoComplete="new-password" />
                    </Fld>
                    <Fld label="تأكيد كلمة السر">
                      <input type="password" value={pw2} onChange={(e) => setPw2(e.target.value)}
                        style={{ ...inp, ...(pw && pw2 && pw !== pw2 ? { borderColor: "var(--danger)" } : {}) }}
                        autoComplete="new-password" />
                    </Fld>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ display: "grid", gap: 14 }}>
                <div style={grid2}>
                  <Fld label="رقم جوال الوكيل">
                    <input value={f.phone} onChange={(e) => set("phone", e.target.value)}
                      placeholder="05xxxxxxxx" style={{ ...inp, direction: "ltr", textAlign: "left" }} />
                  </Fld>
                  <Fld label="البلد">
                    <select value={f.country} onChange={(e) => set("country", e.target.value)} style={inp}>
                      {COUNTRIES.map((c) => (
                        <option key={c.code} value={c.code}>{c.flag} {c.name}</option>
                      ))}
                    </select>
                  </Fld>
                  <Fld label="المحافظة">
                    <input value={f.province} onChange={(e) => set("province", e.target.value)}
                      placeholder="إدلب · إسطنبول …" style={inp} />
                  </Fld>
                  <Fld label="رقم واتساب (برمز الدولة)">
                    <input value={f.whatsapp} onChange={(e) => set("whatsapp", e.target.value)}
                      placeholder="+905551234567" style={{ ...inp, direction: "ltr", textAlign: "left" }} />
                  </Fld>
                </div>
                <div style={hint}>
                  إليه تصل رسائل تنبيه الرصيد. اكتبه برمز الدولة (<span style={{ direction: "ltr", display: "inline-block" }}>+90 · +963</span>)،
                  أو ابدأه بصفر وسنُكمل رمز البلد المختار أعلاه. يُصحَّح شكله تلقائياً عند الحفظ،
                  ويُرفض إن كان غير صالح.
                </div>

                <div style={grid2}>
                  <ImageField label="صورة هوية الوكيل (اختيارية)" value={f.id_image}
                    onChange={(v) => set("id_image", v)} onError={(t) => setMsg({ ok: false, text: t })} />
                  <ImageField label="صورة لوحة المحل (اختيارية)" value={f.shop_image}
                    onChange={(v) => set("shop_image", v)} onError={(t) => setMsg({ ok: false, text: t })} />
                </div>

                <label style={checkRow}>
                  <input type="checkbox" checked={f.auto_debt_collection}
                    onChange={(e) => set("auto_debt_collection", e.target.checked)} />
                  <span>
                    <b>موافقة الوكيل على تحصيل الدَّين تلقائياً</b>
                    <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 3 }}>
                      تسجيل موافقته فقط — لا يجري أي تحصيل الآن. روبوت التحصيل سيعمل
                      على من وافقوا وحدهم حين نبنيه.
                    </div>
                  </span>
                </label>
              </div>
            )}

            {msg && (
              <div style={{
                marginTop: 14, fontSize: 12.5, padding: "8px 12px", borderRadius: 6,
                background: msg.ok ? "rgba(53,194,69,.10)" : "rgba(221,68,68,.10)",
                color: msg.ok ? "var(--ok)" : "var(--danger)",
              }}>{msg.text}</div>
            )}

            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <button className="btn g" onClick={save} disabled={busy}>
                {busy ? "جارٍ الحفظ..." : "حفظ الإعدادات"}
              </button>
              <button className="btn" style={{ background: "#8a999e" }} onClick={onClose} disabled={busy}>
                إغلاق
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═════════ حقل صورة: رفع · معاينة · حذف ═════════ */
function ImageField({
  label, value, onChange, onError,
}: { label: string; value: string; onChange: (v: string) => void; onError: (t: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [working, setWorking] = useState(false);

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setWorking(true);
    try {
      onChange(await shrink(file));
    } catch (err: any) {
      onError(err?.message || "تعذّرت معالجة الصورة");
    } finally {
      setWorking(false);
      if (ref.current) ref.current.value = "";
    }
  }

  return (
    <div>
      <div style={lbl}>{label}</div>
      {value ? (
        <div style={{ position: "relative" }}>
          <img src={value} alt="" style={{
            width: "100%", height: 150, objectFit: "cover",
            borderRadius: 8, border: "1px solid var(--border)",
          }} />
          <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
            <button type="button" className="btn" style={smallBtn} onClick={() => ref.current?.click()}>
              استبدال
            </button>
            <button type="button" className="btn r" style={smallBtn} onClick={() => onChange("")}>
              حذف
            </button>
            <a href={value} target="_blank" rel="noreferrer" className="btn"
              style={{ ...smallBtn, background: "#8a999e", textDecoration: "none" }}>
              فتح
            </a>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => ref.current?.click()} style={dropBox} disabled={working}>
          <Icon name="plus" size={18} />
          <span style={{ marginTop: 6, fontSize: 12.5 }}>
            {working ? "جارٍ المعالجة..." : "اختر صورة"}
          </span>
        </button>
      )}
      <input ref={ref} type="file" accept="image/*" onChange={pick} style={{ display: "none" }} />
    </div>
  );
}

function Fld({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={lbl}>{label}</div>
      {children}
    </div>
  );
}

const ovl: React.CSSProperties = {
  position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 80,
  display: "flex", alignItems: "center", justifyContent: "center",
};
const box: React.CSSProperties = {
  background: "var(--surface)", borderRadius: 10, width: 720, maxWidth: "95vw",
  maxHeight: "92vh", overflow: "auto", boxShadow: "0 10px 40px rgba(0,0,0,.3)",
};
const head: React.CSSProperties = {
  background: "var(--primary)", color: "#fff", padding: "11px 16px",
  fontSize: 15, fontWeight: 700, display: "flex", justifyContent: "space-between",
  alignItems: "center", position: "sticky", top: 0, zIndex: 1,
};
const xBtn: React.CSSProperties = {
  background: "none", border: 0, color: "#fff", cursor: "pointer", fontSize: 15,
};
const tabs: React.CSSProperties = {
  display: "flex", borderBottom: "1px solid var(--border)", background: "var(--surface-2)",
};
const tabBtn: React.CSSProperties = {
  border: 0, background: "transparent", padding: "11px 22px", fontSize: 13.5,
  cursor: "pointer", color: "var(--muted)", fontWeight: 700,
  borderBottom: "3px solid transparent",
};
const tabOn: React.CSSProperties = {
  color: "var(--primary-dark)", background: "var(--surface)",
  borderBottom: "3px solid var(--primary)",
};
const grid2: React.CSSProperties = {
  display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 16px",
};
const inp: React.CSSProperties = { width: "100%", height: 38, borderRadius: 8 };
const lbl: React.CSSProperties = {
  fontSize: 12, color: "var(--muted)", fontWeight: 700, marginBottom: 5,
};
const hint: React.CSSProperties = {
  background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--muted)",
  fontSize: 12, padding: "9px 12px", borderRadius: 6, lineHeight: 1.8,
};
const checkRow: React.CSSProperties = {
  display: "flex", gap: 10, alignItems: "flex-start", cursor: "pointer",
  border: "1px solid var(--border)", borderRadius: 8, padding: "12px 14px",
  fontSize: 13.5,
};
const dropBox: React.CSSProperties = {
  width: "100%", height: 150, borderRadius: 8, cursor: "pointer",
  border: "2px dashed var(--border)", background: "var(--surface-2)",
  color: "var(--muted)", display: "flex", flexDirection: "column",
  alignItems: "center", justifyContent: "center",
};
const smallBtn: React.CSSProperties = {
  height: 28, padding: "0 12px", fontSize: 12, display: "inline-flex", alignItems: "center",
};
