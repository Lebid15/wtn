import { useAuth } from "../auth";

// لوحة الوكيل الكبير (Ana Bayi) — نسخة مبدئية؛ التبويبات الكاملة في الخطوة 3.
const TABS = [
  "بيع (Oyun-Pin Satış)", "متابعة الطلبات", "قائمة المنتجات",
  "مجموعات الأسعار (هامشي)", "أسعار وكلائي", "بيع جماعي",
];

export default function BigAgent() {
  const { user, logout } = useAuth();
  return (
    <div style={{ minHeight: "100vh", background: "#eef1f2" }}>
      <div style={header}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 22 }}>🏬</span>
          <b style={{ fontSize: 17 }}>لوحة الوكيل الكبير — {user?.name}</b>
        </div>
        <button onClick={logout} style={logoutBtn}>خروج</button>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: 24 }}>
        <div style={card}>
          <h2 style={{ color: "var(--primary-dark)", marginBottom: 8 }}>مرحباً {user?.name} 👋</h2>
          <p style={{ color: "var(--muted)", lineHeight: 1.9 }}>
            أنت وكيل كبير في متجر <b>{user?.tenant?.name}</b>. من هنا تنشئ دكاكينك،
            تحدّد هامش ربحك على الباقات، وتتابع طلبات وكلائك.
          </p>
          <div style={{ marginTop: 16, fontSize: 14, color: "var(--muted)" }}>تبويبات لوحتك:</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 10 }}>
            {TABS.map((t) => (
              <span key={t} style={chip}>{t}</span>
            ))}
          </div>
          <div style={note}>
            🚧 الأقسام قيد البناء (الخطوة 3) — سنبنيها مطابقة لصور <code>bigagent/</code>
            مع منطق الهامش والرؤية المزدوجة لصاحب المتجر.
          </div>
        </div>
      </div>
    </div>
  );
}

const header: React.CSSProperties = {
  display: "flex", alignItems: "center", justifyContent: "space-between",
  background: "var(--primary)", color: "#fff", padding: "12px 24px",
};
const logoutBtn: React.CSSProperties = {
  background: "transparent", border: "1px solid rgba(255,255,255,.4)", color: "#fff",
  padding: "6px 12px", borderRadius: 5, fontSize: 13,
};
const card: React.CSSProperties = {
  background: "#fff", borderRadius: 12, padding: 26, boxShadow: "0 2px 10px rgba(0,0,0,.06)",
};
const chip: React.CSSProperties = {
  background: "#f2f5f6", border: "1px solid var(--border)", borderRadius: 20,
  padding: "7px 16px", fontSize: 14, fontWeight: 600, color: "var(--primary-dark)",
};
const note: React.CSSProperties = {
  background: "#fff8e1", border: "1px solid #ffe082", color: "#5d4d1a",
  fontSize: 14, padding: "12px 16px", borderRadius: 8, marginTop: 20, lineHeight: 1.8,
};
