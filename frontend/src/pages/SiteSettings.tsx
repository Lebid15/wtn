import { useEffect, useState } from "react";
import { api } from "../api";

interface Settings {
  theme: string; theme_color: string; logo_url: string; default_locale: string;
  founded_year: string; short_name: string; full_name: string; address: string;
  email: string; phone: string; homepage_text: string; footer_html: string;
}

const THEMES = [
  { key: "teal", label: "أخضر مزرق", color: "#3a6b73" },
  { key: "blue", label: "أزرق", color: "#2c5f9e" },
  { key: "orange", label: "برتقالي", color: "#c1692a" },
];

export default function SiteSettings() {
  const [s, setS] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    api.get("/settings/site/").then((r) => setS(r.data));
  }, []);

  if (!s) return <div style={{ padding: 30 }}>جارٍ التحميل...</div>;

  function set<K extends keyof Settings>(k: K, v: Settings[K]) {
    setS((p) => (p ? { ...p, [k]: v } : p));
    // معاينة حيّة للثيم
    if (k === "theme") document.documentElement.setAttribute("data-theme", v as string);
  }

  async function save() {
    setSaving(true);
    setMsg("");
    try {
      await api.put("/settings/site/", s);
      document.documentElement.setAttribute("data-theme", s!.theme);
      setMsg("تم حفظ الإعدادات وتطبيق الثيم ✅");
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

          {/* اختيار الثيم — معاينة حيّة */}
          <Row label="لون الثيم">
            <div style={{ display: "flex", gap: 10 }}>
              {THEMES.map((t) => (
                <button key={t.key} type="button" onClick={() => set("theme", t.key)}
                  style={{
                    display: "flex", alignItems: "center", gap: 8, padding: "8px 14px",
                    borderRadius: 6, cursor: "pointer",
                    border: s.theme === t.key ? "2px solid var(--primary-dark)" : "1px solid var(--border)",
                    background: s.theme === t.key ? "#f2f5f6" : "#fff",
                  }}>
                  <span style={{ width: 18, height: 18, borderRadius: "50%", background: t.color }} />
                  {t.label}
                </button>
              ))}
            </div>
          </Row>

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
          <Row label="رابط الشعار (Logo)">
            <input style={inp} value={s.logo_url} onChange={(e) => set("logo_url", e.target.value)} placeholder="https://..." />
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

          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 10 }}>
            <button className="btn g" onClick={save} disabled={saving}>
              {saving ? "جارٍ الحفظ..." : "حفظ الإعدادات"}
            </button>
            {msg && <span style={{ color: "var(--ok)", fontSize: 14 }}>{msg}</span>}
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
