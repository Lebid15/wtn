import { type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../auth";

// أقسام القائمة الرئيسية (مطابقة للمرجع؛ Fatura/Kontor مستبعدان)
const MAIN_TABS = [
  { key: "home", label: "🏠", to: "/dealers" },
  { key: "oyunpin", label: "الألعاب", to: "/oyunpin" },
  { key: "ayarlar", label: "الإعدادات", to: "/dealers" },
  { key: "raporlar", label: "التقارير", to: "/reports" },
];

// أيقونات التنبيهات (يمين) — مطابقة لروح المرجع
const ALERTS = ["💬", "🎮", "🔌", "👤", "⚠️", "💳"];

// قائمة الإعدادات الفرعية (Ayarlar)
const SUBNAV = [
  "متابعة الدفع", "حساباتي", "حركات الحسابات", "قائمة الوكلاء",
  "مجموعات الوكلاء", "إعدادات الموقع", "إعدادات SMS",
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const loc = useLocation();

  return (
    <div className="app">
      {/* ===== Navbar ===== */}
      <div style={topbar}>
        <div style={{ display: "flex", gap: 1 }}>
          {MAIN_TABS.map((t) => {
            const active = loc.pathname === t.to && t.key !== "home";
            const home = t.key === "home";
            return (
              <Link
                key={t.key}
                to={t.to}
                style={{
                  ...tab,
                  ...(home ? tabHome : {}),
                  ...(active ? tabActive : {}),
                }}
              >
                {t.label}
              </Link>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <span style={{ ...alertIco, background: "var(--danger)" }}>1</span>
          {ALERTS.map((a, i) => (
            <span key={i} style={alertIco}>{a}</span>
          ))}
          <span style={{ color: "#fff", fontSize: 13, marginInlineStart: 8 }}>
            {user?.name}
          </span>
          <button onClick={logout} style={logoutBtn}>خروج آمن ⏻</button>
        </div>
      </div>

      {/* ===== Sub-nav ===== */}
      <div style={subnav}>
        {SUBNAV.map((s, i) => (
          <a
            key={i}
            style={{ ...subLink, ...(s === "قائمة الوكلاء" ? subActive : {}) }}
          >
            {s}
          </a>
        ))}
      </div>

      {/* ===== المحتوى ===== */}
      <div>{children}</div>

      {/* ===== Footer ===== */}
      <div style={footer}>
        {user?.tenant?.name} — نظام لوحة وكلاء لشحن الألعاب © {new Date().getFullYear()}
      </div>
    </div>
  );
}

const topbar: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  background: "var(--primary)",
  padding: "0 14px",
  height: 46,
};
const tab: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  height: 46,
  padding: "0 24px",
  color: "#f2fafb",
  fontSize: 16,
};
const tabHome: React.CSSProperties = { background: "#f2f5f6", color: "var(--primary)" };
const tabActive: React.CSSProperties = {
  background: "#f2f5f6",
  color: "var(--tab-active-text)",
  fontWeight: 700,
};
const alertIco: React.CSSProperties = {
  width: 30,
  height: 30,
  borderRadius: 4,
  background: "var(--primary-soft)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#fff",
  fontSize: 15,
};
const logoutBtn: React.CSSProperties = {
  background: "transparent",
  border: "1px solid rgba(255,255,255,.4)",
  color: "#f2fafb",
  fontSize: 13,
  height: 30,
  borderRadius: 4,
  padding: "0 10px",
  marginInlineStart: 6,
};
const subnav: React.CSSProperties = {
  display: "flex",
  background: "#fff",
  borderBottom: "1px solid var(--border)",
};
const subLink: React.CSSProperties = {
  padding: "11px 22px",
  color: "#33454a",
  fontSize: 15,
  borderInlineStart: "1px solid #eef2f3",
  cursor: "pointer",
};
const subActive: React.CSSProperties = { background: "#f2f5f6", fontWeight: 700 };
const footer: React.CSSProperties = {
  textAlign: "center",
  padding: "16px",
  color: "var(--muted)",
  fontSize: 13,
  marginTop: 20,
};
