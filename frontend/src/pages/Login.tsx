import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, type Storefront } from "../api";
import { SOCIAL_ICONS, SocialGlyph } from "../socialIcons";
import { useAuth, roleHome } from "../auth";

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [totp, setTotp] = useState("");
  const [needTotp, setNeedTotp] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  // هويّة المتجر صاحبِ العنوان — `null` على الباب العام (wtn4.com)
  const [store, setStore] = useState<Storefront | null>(null);

  // تُقرأ قبل الدخول: الوكيل يجب أن يرى متجره قبل أن يكتب كلمته، لا بعدها
  useEffect(() => {
    api.get("/storefront/").then((r) => {
      const s: Storefront | null = r.data.store;
      if (!s) return;
      setStore(s);
      document.documentElement.setAttribute("data-theme", s.theme || "teal");
      document.documentElement.setAttribute("data-font", s.font || "cairo");
      document.title = s.name;
    }).catch(() => {});
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await login(loginId, password, totp);
    setBusy(false);
    if ("requireTotp" in res) {
      setNeedTotp(true);
      setError("");
    } else if ("ok" in res && res.ok) {
      nav(roleHome(res.role));
    } else if ("error" in res) {
      setError(res.error);
    }
  }

  return (
    <div style={wrap}>
      <form onSubmit={submit} style={card}>
        {store?.logo_url
          ? <img src={store.logo_url} alt={store.name} style={logoImg} />
          : <div style={logo}>🎮</div>}
        <h1 style={{ fontSize: 22, color: "var(--primary-dark)", marginBottom: 4 }}>
          {store?.name || "لوحة الوكلاء"}
        </h1>
        <p style={{ color: "var(--muted)", fontSize: 14, marginBottom: 22 }}>
          {store?.tagline || "نظام شحن الألعاب"}
        </p>

        <label style={lbl}>رقم الدخول</label>
        <input
          style={inp}
          value={loginId}
          onChange={(e) => setLoginId(e.target.value)}
          placeholder="5550000007"
          autoFocus
        />

        <label style={lbl}>كلمة المرور</label>
        <input
          style={inp}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
        />

        {needTotp && (
          <>
            <label style={lbl}>رمز التحقق (2FA)</label>
            <input
              style={inp}
              value={totp}
              onChange={(e) => setTotp(e.target.value)}
              placeholder="123456"
              autoFocus
            />
          </>
        )}

        {error && <div style={errBox}>{error}</div>}

        <button className="btn" style={{ width: "100%", height: 40, marginTop: 8 }} disabled={busy}>
          {busy ? "جارٍ الدخول..." : "دخول"}
        </button>

        <Socials links={store?.social_links} />

        {store?.login_footer && (
          <div style={footerLine}>{store.login_footer}</div>
        )}
      </form>
    </div>
  );
}

/**
 * أيقونات التواصل تحت زرّ الدخول — العلامة الرسمية لكل منصّة بلونها.
 *
 * الترتيب من `SOCIAL_ICONS` لا من ترتيب المفاتيح في القاموس: صفٌّ يعيد
 * ترتيب نفسه بعد كل حفظ يربك من يحفظ مواضعها بعينه.
 *
 * `rel="noreferrer"` لازم مع `target="_blank"`: بدونه يملك الموقعُ المفتوح
 * مرجعاً إلى صفحتنا يعيد توجيهها.
 */
function Socials({ links }: { links?: Record<string, string> }) {
  const shown = SOCIAL_ICONS.filter((s) => links?.[s.key]);
  if (!shown.length) return null;
  return (
    <div style={socialRow}>
      {shown.map((s) => (
        <a key={s.key} href={links![s.key]} target="_blank" rel="noreferrer"
           title={s.label} aria-label={s.label} style={socialBtn}>
          <SocialGlyph icon={s} size={36} />
        </a>
      ))}
    </div>
  );
}

const wrap: React.CSSProperties = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)",
};
const card: React.CSSProperties = {
  width: 380,
  background: "#fff",
  borderRadius: 10,
  padding: "38px 34px",
  boxShadow: "0 12px 40px rgba(0,0,0,.25)",
  textAlign: "center",
};
const logo: React.CSSProperties = { fontSize: 46, marginBottom: 10 };
// شعار المتجر — بارتفاعٍ ثابت كي لا يقفز شكل البطاقة بين متجرٍ وآخر
const logoImg: React.CSSProperties = {
  height: 54,
  maxWidth: "100%",
  objectFit: "contain",
  marginBottom: 10,
};
const lbl: React.CSSProperties = {
  display: "block",
  textAlign: "right",
  fontSize: 13,
  color: "var(--muted)",
  margin: "12px 2px 5px",
};
const inp: React.CSSProperties = { width: "100%", height: 40 };
const socialRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "center",
  flexWrap: "wrap",
  gap: 10,
  marginTop: 20,
};
const socialBtn: React.CSSProperties = { display: "flex", textDecoration: "none" };
const footerLine: React.CSSProperties = {
  marginTop: 18,
  fontSize: 12,
  color: "var(--muted)",
  lineHeight: 1.8,
};
const errBox: React.CSSProperties = {
  background: "#fdecea",
  border: "1px solid #f5c6c2",
  color: "var(--danger)",
  fontSize: 13,
  padding: "9px 12px",
  borderRadius: 5,
  marginTop: 14,
};
