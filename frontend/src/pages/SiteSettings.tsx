import { useEffect, useRef, useState } from "react";
import { api } from "../api";
import { SOCIAL_ICONS, SocialGlyph } from "../socialIcons";
import {
  UI_SCALE_DEFAULT, UI_SCALE_MAX, UI_SCALE_MIN, UI_SCALE_STEP, applyUiScale,
} from "../uiScale";

interface Settings {
  logo_url: string; default_locale: string;
  founded_year: string; short_name: string; full_name: string; address: string;
  email: string; phone: string; homepage_text: string; footer_html: string;
  tagline: string; login_footer: string; social_links: Record<string, string>;
  ui_scale: number;
}

/** محطّاتٌ جاهزة — أكثر الناس يريد «أصغر قليلاً» لا رقماً بعينه. */
const SCALE_PRESETS = [
  { v: 85, label: "مضغوط" },
  { v: 100, label: "عادي" },
  { v: 110, label: "مريح" },
  { v: 120, label: "كبير" },
];

/**
 * أمثلة الروابط لكل منصّة. أمّا الأيقونات والأسماء والترتيب فمن
 * `socialIcons` — مصدرٌ واحد للوحة ولصفحة الدخول، فلا يفترقان بعد تعديل.
 */
const SOCIAL_PLACEHOLDER: Record<string, string> = {
  whatsapp:  "+905551234567",
  telegram:  "https://t.me/yourstore",
  facebook:  "https://facebook.com/yourstore",
  instagram: "https://instagram.com/yourstore",
  x:         "https://x.com/yourstore",
  tiktok:    "https://tiktok.com/@yourstore",
  youtube:   "https://youtube.com/@yourstore",
  snapchat:  "https://snapchat.com/add/yourstore",
  website:   "https://example.com",
};

const MAX_LOGO_BYTES = 2_000_000;  // قبل الترميز — والخادم يحدّ بـ 3M حرفاً بعده

export default function SiteSettings() {
  const [s, setS] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  // آخر حجمٍ **محفوظ**. المعاينة تغيّر الصفحة فوراً، فمن جرّب ثم خرج بلا
  // حفظ يجب أن تعود صفحته كما كانت — لا أن يحمل تجربةً لم يقبلها.
  const savedScale = useRef<number>(UI_SCALE_DEFAULT);

  useEffect(() => {
    api.get("/settings/site/").then((r) => {
      setS(r.data);
      savedScale.current = r.data.ui_scale ?? UI_SCALE_DEFAULT;
    });
    return () => applyUiScale(savedScale.current);
  }, []);

  if (!s) return <div style={{ padding: 30 }}>جارٍ التحميل...</div>;

  function set<K extends keyof Settings>(k: K, v: Settings[K]) {
    setS((p) => (p ? { ...p, [k]: v } : p));
  }

  /** المعاينة فورية: رقمٌ في حقلٍ لا يقول شيئاً، والعين وحدها تحكم. */
  function setScale(v: number) {
    set("ui_scale", v);
    applyUiScale(v);
  }

  function setSocial(key: string, v: string) {
    setS((p) => (p ? { ...p, social_links: { ...(p.social_links || {}), [key]: v } } : p));
  }

  /** الشعار يُرفع نصّاً (`data:image/…`) كصور الوكلاء — لا مجلّد وسائط في المشروع. */
  function pickLogo(file: File | undefined) {
    if (!file) return;
    setMsg("");
    if (!file.type.startsWith("image/")) { setErr("الملف المختار ليس صورة"); return; }
    if (file.size > MAX_LOGO_BYTES) { setErr("الصورة كبيرة — اختر أصغر من 2 ميغابايت"); return; }
    const r = new FileReader();
    r.onload = () => { setErr(""); set("logo_url", String(r.result || "")); };
    r.onerror = () => setErr("تعذّرت قراءة الصورة");
    r.readAsDataURL(file);
  }

  async function save() {
    setSaving(true);
    setMsg(""); setErr("");
    try {
      await api.put("/settings/site/", s);
      savedScale.current = s?.ui_scale ?? UI_SCALE_DEFAULT;
      setMsg("تم حفظ الإعدادات ✅");
    } catch (e: any) {
      // الخادم يردّ برسالة عربية لكل حقل — نعرضها كما هي بدل «تعذّر الحفظ»
      const d = e?.response?.data;
      const first = d && typeof d === "object" ? Object.values(d)[0] : null;
      setErr(String(Array.isArray(first) ? first[0] : first || "تعذّر الحفظ"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ fontSize: 20, color: "var(--primary-dark)", marginBottom: 14 }}>
        إعدادات الموقع (Web Site Ayarları)
      </h2>

      <div style={panel}>
        <div style={panelHead}>الإعدادات العامة للموقع</div>
        <div style={{ padding: 20 }}>

          <Row label="اللغة">
            <select value={s.default_locale} onChange={(e) => set("default_locale", e.target.value)}>
              <option value="ar">العربية</option>
              <option value="tr">التركية</option>
              <option value="en">الإنجليزية</option>
            </select>
          </Row>
          <Row label="سنة التأسيس">
            <input style={inp} value={s.founded_year} onChange={(e) => set("founded_year", e.target.value)} />
          </Row>
          <Row label="الاسم المختصر / الشعار">
            <input style={inp} value={s.short_name} onChange={(e) => set("short_name", e.target.value)} />
          </Row>
          <Row label="الاسم الكامل">
            <input style={inp} value={s.full_name} onChange={(e) => set("full_name", e.target.value)} />
          </Row>
          <Row label="الشعار (Logo)">
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              {s.logo_url
                ? <img src={s.logo_url} alt="الشعار" style={logoPreview} />
                : <div style={{ ...logoPreview, display: "flex", alignItems: "center",
                                justifyContent: "center", color: "var(--muted)", fontSize: 12 }}>
                    لا شعار
                  </div>}
              <label className="btn" style={{ cursor: "pointer" }}>
                اختر صورة
                <input type="file" accept="image/*" style={{ display: "none" }}
                  onChange={(e) => pickLogo(e.target.files?.[0])} />
              </label>
              {s.logo_url && (
                <button type="button" className="btn" style={{ background: "#8a999e" }}
                  onClick={() => set("logo_url", "")}>إزالة</button>
              )}
            </div>
            <input style={{ ...inp, marginTop: 8 }} dir="ltr" value={s.logo_url.startsWith("data:") ? "" : s.logo_url}
              onChange={(e) => set("logo_url", e.target.value)}
              placeholder="أو الصق رابطاً: https://..." />
            <div style={hint}>
              يظهر في صفحة الدخول أعلى اسم المتجر. المرفوع يُحفظ داخل النظام،
              فلا يحتاج استضافةً خارجية.
            </div>
          </Row>
          <Row label="السطر تحت الاسم">
            <input style={inp} value={s.tagline} onChange={(e) => set("tagline", e.target.value)}
              placeholder="نظام شحن الألعاب" />
            <div style={hint}>يظهر تحت اسم المتجر في صفحة الدخول. فارغاً يظهر «نظام شحن الألعاب».</div>
          </Row>
          <Row label="العنوان">
            <input style={inp} value={s.address} onChange={(e) => set("address", e.target.value)} />
          </Row>
          <Row label="البريد الإلكتروني">
            <input style={inp} value={s.email} onChange={(e) => set("email", e.target.value)} />
          </Row>
          <Row label="الهاتف">
            <input style={inp} value={s.phone} onChange={(e) => set("phone", e.target.value)} />
          </Row>
          <Row label="نص الصفحة الرئيسية">
            <textarea style={{ ...inp, height: 60, paddingTop: 6 }}
              value={s.homepage_text} onChange={(e) => set("homepage_text", e.target.value)} />
          </Row>
          <Row label="نص أسفل الصفحة (HTML)">
            <textarea style={{ ...inp, height: 70, paddingTop: 6 }}
              value={s.footer_html} onChange={(e) => set("footer_html", e.target.value)} />
          </Row>
          <Row label="سطر أسفل صفحة الدخول">
            <input style={inp} value={s.login_footer}
              onChange={(e) => set("login_footer", e.target.value)}
              placeholder="جميع الحقوق محفوظة © متجر علايا" />
            <div style={hint}>نصٌّ صِرف لا وسوم — الصفحة مفتوحة لكل زائر بلا حساب.</div>
          </Row>

          <div style={{ borderTop: "1px solid var(--border)", margin: "20px 0 16px" }} />
          <div style={{ fontWeight: 700, marginBottom: 4 }}>حجم العرض</div>
          <div style={{ ...hint, marginBottom: 14, maxWidth: 620 }}>
            يكبّر الموقع كلَّه أو يصغّره — الخطوط والأزرار والحقول والتباعد معاً،
            تماماً كزوم المتصفّح. تراه يتغيّر هنا فور تحريكك المؤشّر، ولا يُحفظ
            إلا بالزرّ أسفل الصفحة.
          </div>
          <Row label="الحجم">
            <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
              <input
                type="range" dir="ltr" style={{ width: 260, padding: 0, height: 24 }}
                min={UI_SCALE_MIN} max={UI_SCALE_MAX} step={UI_SCALE_STEP}
                value={s.ui_scale ?? UI_SCALE_DEFAULT}
                onChange={(e) => setScale(Number(e.target.value))}
              />
              <b style={{ minWidth: 52, color: "var(--primary-dark)", fontSize: 16 }}>
                {s.ui_scale ?? UI_SCALE_DEFAULT}%
              </b>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
              {SCALE_PRESETS.map((p) => (
                <button key={p.v} type="button" onClick={() => setScale(p.v)}
                  style={presetBtn((s.ui_scale ?? UI_SCALE_DEFAULT) === p.v)}>
                  {p.label} · {p.v}%
                </button>
              ))}
            </div>
            <div style={{ ...hint, maxWidth: 620 }}>
              اللوحة مرسومة بعرضٍ ثابت (1366 بكسل)، فإن كانت شاشتك أضيق أو كان
              تكبير ويندوز عندك 125% فالتصغير هنا هو ما يُدخل اللوحة في الشاشة.
              والحدّ بين {UI_SCALE_MIN}% و{UI_SCALE_MAX}% عمداً: أبعد منهما يصير
              الرجوع إلى هذه الصفحة نفسه متعذّراً.
            </div>
          </Row>

          <div style={{ borderTop: "1px solid var(--border)", margin: "20px 0 16px" }} />
          <div style={{ fontWeight: 700, marginBottom: 4 }}>روابط التواصل</div>
          <div style={{ ...hint, marginBottom: 14 }}>
            تظهر أيقوناتها أسفل زرّ الدخول. اترك ما لا تملكه فارغاً فلا تظهر أيقونته.
          </div>
          {SOCIAL_ICONS.map((so) => (
            <div key={so.key} style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 13 }}>
              <div style={{ width: 170, display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-start" }}>
                <SocialGlyph icon={so} size={24} />
                <span style={{ color: "var(--muted)", fontSize: 14 }}>{so.label} :</span>
              </div>
              <div style={{ flex: 1 }}>
                <input style={inp} dir="ltr" placeholder={SOCIAL_PLACEHOLDER[so.key] || ""}
                  value={s.social_links?.[so.key] || ""}
                  onChange={(e) => setSocial(so.key, e.target.value)} />
              </div>
            </div>
          ))}
          <div style={hint}>
            واتساب يُقبل رقماً برمز الدولة — يبني له النظام رابط <b dir="ltr">wa.me</b> وحده.
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 18 }}>
            <button className="btn g" onClick={save} disabled={saving}>
              {saving ? "جارٍ الحفظ..." : "حفظ الإعدادات"}
            </button>
            {msg && <span style={{ color: "var(--ok)", fontSize: 14 }}>{msg}</span>}
            {err && <span style={{ color: "var(--danger)", fontSize: 14 }}>{err}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "start", gap: 14, marginBottom: 13 }}>
      <div style={{ width: 170, textAlign: "left", color: "var(--muted)", fontSize: 14, paddingTop: 7 }}>
        {label} :
      </div>
      <div style={{ flex: 1 }}>{children}</div>
    </div>
  );
}

const panel: React.CSSProperties = {
  background: "#fff", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden",
};
const panelHead: React.CSSProperties = {
  background: "var(--primary)", color: "#fff", padding: "10px 18px", fontSize: 15, fontWeight: 700,
};
const inp: React.CSSProperties = { width: "100%", maxWidth: 480 };
const hint: React.CSSProperties = {
  fontSize: 12, color: "var(--muted)", lineHeight: 1.9, marginTop: 5, maxWidth: 480,
};
const presetBtn = (on: boolean): React.CSSProperties => ({
  height: 32,
  padding: "0 14px",
  fontSize: 14,
  borderRadius: "var(--btn-radius)",
  cursor: "pointer",
  border: `1px solid ${on ? "var(--primary)" : "var(--border-strong)"}`,
  background: on ? "var(--primary)" : "#fff",
  color: on ? "#fff" : "var(--text)",
});
const logoPreview: React.CSSProperties = {
  width: 120, height: 54, objectFit: "contain",
  border: "1px solid var(--border)", borderRadius: 6, background: "#f8fafc",
};
