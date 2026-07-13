import { type ReactNode, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../auth";
import Icon from "../components/Icon";
import ThemeCustomizer from "../components/ThemeCustomizer";
import { applyThemeConfig, THEME_DEFAULTS, type ThemeConfig } from "../theme";

// أقسام القائمة الرئيسية (مطابقة للمرجع؛ Fatura/Kontor مستبعدان)
const MAIN_TABS = [
  { key: "home", label: "الرئيسية", icon: "home", to: "/dealers" },
  { key: "oyunpin", label: "الألعاب", icon: "games", to: "/oyunpin" },
  { key: "ayarlar", label: "الإعدادات", icon: "settings", to: "/dealers" },
  { key: "raporlar", label: "التقارير", icon: "chart", to: "/reports" },
];

// أيقونات التنبيهات (يمين) — مطابقة لروح المرجع
const ALERTS = ["chat", "games", "api", "user", "warning", "card"];

// القوائم الفرعية لكل قسم (تتغيّر حسب التبويب النشط) — مطابقة لتبويبات المرجع
const SUBNAV_OYUNPIN = [
  { label: "متابعة الطلبات", to: "/oyunpin/orders" },
  { label: "قائمة الألعاب", to: "/oyunpin" },
  { label: "المكتبة العالمية", to: "/oyunpin/library" },
  { label: "قائمة المنتجات", to: "/oyunpin/pin-list" },
  { label: "مجموعات الأسعار", to: "/oyunpin/price-groups" },
  { label: "أسعار الوكلاء", to: "/oyunpin/dealer-prices" },
  { label: "بنك البينات", to: "/oyunpin/pool" },
  { label: "مزوّدو API", to: "/oyunpin/providers" },
];
const SUBNAV_AYARLAR = [
  { label: "متابعة الدفع", to: "/ayarlar/payments" },
  { label: "حساباتي", to: "/ayarlar/accounts" },
  { label: "حركات الحسابات", to: "/ayarlar/ledger" },
  { label: "قائمة الوكلاء", to: "/dealers" },
  { label: "مجموعات الوكلاء", to: "/ayarlar/groups" },
  { label: "إعدادات الموقع", to: "/ayarlar/site" },
  { label: "إعدادات SMS", to: "/ayarlar/sms" },
  { label: "الرسائل", to: "/ayarlar/support" },
  { label: "فواتير الاشتراك", to: "/ayarlar/invoices" },
];
const SUBNAV_RAPORLAR = [
  { label: "تقرير الطلبات", to: "/reports" },
  { label: "تقرير الأرباح", to: "/reports/profits" },
  { label: "كشف الوكلاء", to: "/reports/dealers" },
];

function subnavFor(path: string) {
  if (path.startsWith("/oyunpin")) return SUBNAV_OYUNPIN;
  if (path.startsWith("/reports")) return SUBNAV_RAPORLAR;
  return SUBNAV_AYARLAR; // /dealers + /ayarlar
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const loc = useLocation();
  const [ann, setAnn] = useState<{ message: string; ticker: string } | null>(null);
  const [themeCfg, setThemeCfg] = useState<ThemeConfig>({});
  const [customizerOpen, setCustomizerOpen] = useState(false);

  useEffect(() => {
    api.get("/announcement/").then((r) => setAnn(r.data)).catch(() => setAnn({ message: "", ticker: "" }));
    // تخصيص المظهر المحفوظ لهذا المتجر
    api.get("/settings/theme/").then((r) => {
      const cfg = r.data.config || {};
      setThemeCfg(cfg);
      applyThemeConfig(cfg);
    }).catch(() => {});
  }, []);

  const flags = { ...THEME_DEFAULTS, ...themeCfg };
  const tickerItems = (ann?.ticker || "").split("\n").map((s) => s.trim()).filter(Boolean);

  return (
    <div className="app">
      {/* ===== شريط تنبيه المنصّة (فوق الهيدر — المساحة محجوزة دائماً) ===== */}
      {flags.show_announce && (
        <div className={`announce${ann?.message ? "" : " is-empty"}`}>
          <div className="announce-main">
            <span className="announce-tag">
              <Icon name="bell" size={13} style={{ marginInlineEnd: 4 }} />إعلان من إدارة المنصّة
            </span>
            <span className="announce-text">{ann?.message || "—"}</span>
          </div>
        </div>
      )}

      {/* ===== Navbar ===== */}
      <div style={topbar}>
        <div style={{ display: "flex", gap: 1 }}>
          {MAIN_TABS.map((t) => {
            const home = t.key === "home";
            const section =
              (t.key === "oyunpin" && loc.pathname.startsWith("/oyunpin")) ||
              (t.key === "raporlar" && loc.pathname.startsWith("/reports")) ||
              (t.key === "ayarlar" &&
                (loc.pathname === "/dealers" || loc.pathname.startsWith("/ayarlar")));
            const active = section && !home;
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
                <Icon name={t.icon} size={17} style={{ marginInlineEnd: 7 }} />
                {t.label}
              </Link>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <span style={{ ...alertIco, background: "var(--danger)", position: "relative" }}>
            <Icon name="bell" size={16} />
            <span style={badgeDot}>1</span>
          </span>
          {ALERTS.map((a, i) => (
            <span key={i} style={alertIco}><Icon name={a} size={16} /></span>
          ))}
          <span style={{ color: "#fff", fontSize: 13, marginInlineStart: 8 }}>
            {user?.name}
          </span>
          <button onClick={() => setCustomizerOpen(true)} style={logoutBtn} title="تخصيص المظهر">
            🎨 المظهر
          </button>
          <button onClick={logout} style={logoutBtn}>
            <Icon name="logout" size={15} style={{ marginInlineEnd: 5 }} />خروج آمن
          </button>
        </div>
      </div>

      {/* ===== Sub-nav (تتغيّر حسب القسم) ===== */}
      <div style={subnav}>
        {subnavFor(loc.pathname).map((s) => {
          const active = loc.pathname === s.to;
          return (
            <Link key={s.to} to={s.to} style={{ ...subLink, ...(active ? subActive : {}) }}>
              {s.label}
            </Link>
          );
        })}
      </div>

      {/* ===== الشريط العاجل المتحرّك (تحت الهيدر، أعلى المحتوى) ===== */}
      {flags.show_ticker && tickerItems.length > 0 && (
        <div className="ticker">
          <div className="ticker-inner">
            {[...tickerItems, ...tickerItems].map((t, i) => (
              <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                <Icon name="warning" size={13} /> {t}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ===== المحتوى ===== */}
      <div>{children}</div>

      {/* ===== Footer ===== */}
      <div style={footer}>
        {user?.tenant?.name} — نظام لوحة وكلاء لشحن الألعاب © {new Date().getFullYear()}
      </div>

      {/* ===== لوحة تخصيص المظهر ===== */}
      {customizerOpen && (
        <ThemeCustomizer
          config={themeCfg}
          onChange={setThemeCfg}
          onClose={() => setCustomizerOpen(false)}
        />
      )}
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
  display: "flex",
  alignItems: "center",
  background: "transparent",
  border: "1px solid rgba(255,255,255,.4)",
  color: "#f2fafb",
  fontSize: 13,
  height: 30,
  borderRadius: 4,
  padding: "0 10px",
  marginInlineStart: 6,
};
const badgeDot: React.CSSProperties = {
  position: "absolute",
  top: -5,
  insetInlineEnd: -5,
  background: "#fff",
  color: "var(--danger)",
  fontSize: 10,
  fontWeight: 700,
  width: 15,
  height: 15,
  borderRadius: "50%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
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
