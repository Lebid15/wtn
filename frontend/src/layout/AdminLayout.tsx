import { type ReactNode, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../auth";
import Icon from "../components/Icon";
import ThemeCustomizer from "../components/ThemeCustomizer";
import { applyThemeConfig, THEME_DEFAULTS, type ThemeConfig } from "../theme";

// أقسام القائمة الرئيسية (مطابقة للمرجع؛ Fatura/Kontor مستبعدان)
const ADMIN_TABS = [
  { key: "home", label: "الرئيسية", icon: "home", to: "/home" },
  { key: "oyunpin", label: "الألعاب", icon: "games", to: "/oyunpin" },
  { key: "bayiler", label: "الوكلاء", icon: "users", to: "/dealers" },
  { key: "ayarlar", label: "الإعدادات", icon: "settings", to: "/settings/site" },
  { key: "raporlar", label: "التقارير", icon: "chart", to: "/reports" },
];

/**
 * شريط «ما ينتظر قرارك» (يمين الهيدر).
 *
 * لكل أيقونة وظيفتان: تنقلك إلى قسمها بالضغط، وتتلوّن إن كان فيه ما ينتظرك.
 * الباهتة تعني «لا شيء هنا» — ومكانها ثابت لا يقفز، فتحفظه بالذاكرة.
 *
 * `key` هو اسم العدّاد كما تُعيده `GET /api/alerts/`.
 */
const ALERTS: { key: string; icon: string; to: string; label: string; hot?: boolean }[] = [
  { key: "announcement", icon: "bell", to: "/home", label: "إعلان من إدارة المنصّة", hot: true },
  { key: "tickets", icon: "chat", to: "/settings/support", label: "رسائل لم تُقرأ" },
  { key: "orders_pending", icon: "games", to: "/oyunpin/orders", label: "طلبات قيد الانتظار" },
  { key: "orders_stuck", icon: "warning", to: "/oyunpin/providers", label: "طلبات عالقة — راجع المزوّدين", hot: true },
  { key: "deposits_pending", icon: "card", to: "/ayarlar/payments", label: "إيداعات تنتظر قرارك" },
  { key: "dealers_negative", icon: "user", to: "/dealers", label: "وكلاء برصيد سالب" },
  { key: "providers", icon: "api", to: "/oyunpin/providers", label: "مزوّدون معطّلون أو رصيدهم منخفض" },
];

// القوائم الفرعية لكل قسم (تتغيّر حسب التبويب النشط) — مطابقة لتبويبات المرجع
const SUBNAV_OYUNPIN = [
  { label: "متابعة الطلبات", to: "/oyunpin/orders" },
  { label: "قائمة الألعاب", to: "/oyunpin" },
  { label: "المكتبة العالمية", to: "/oyunpin/library" },
  { label: "توجيه الباقات", to: "/oyunpin/pin-list" },
  { label: "ربط الباقات", to: "/oyunpin/package-links" },
  { label: "مجموعات الأسعار", to: "/oyunpin/price-groups" },
  { label: "بنك الأكواد", to: "/oyunpin/pool" },
  { label: "مزوّدو API", to: "/oyunpin/providers" },
];
// قسم الوكلاء — كل ما يخصّ الوكيل وماله
const SUBNAV_BAYILER = [
  { label: "قائمة الوكلاء", to: "/dealers" },
  { label: "متابعة الدفع", to: "/ayarlar/payments" },
  { label: "طرق الدفع", to: "/ayarlar/payment-methods" },
  { label: "أسعار الصرف", to: "/ayarlar/exchange" },
  { label: "حساباتي", to: "/ayarlar/accounts" },
  { label: "حركات الحسابات", to: "/ayarlar/ledger" },
];
// قسم الإعدادات — إعدادات المتجر نفسه
const SUBNAV_AYARLAR = [
  { label: "إعدادات الموقع", to: "/settings/site" },
  { label: "إعدادات SMS", to: "/settings/sms" },
  { label: "واتساب", to: "/settings/whatsapp" },
  { label: "الرسائل", to: "/settings/support" },
  { label: "فواتير الاشتراك", to: "/settings/invoices" },
];
const SUBNAV_RAPORLAR = [
  { label: "تقرير الطلبات", to: "/reports" },
  { label: "تقرير الأرباح", to: "/reports/profits" },
  { label: "الجرد النهائي", to: "/reports/inventory" },
];

/**
 * لوحة الوكيل الكبير: **نفس الهيكل، صلاحيات أقلّ**.
 *
 * هو لا يشحن ألعاباً من الموقع ولا يملك كتالوجاً ولا مزوّدين — يدير دكاكينه
 * وأسعارهم. فثلاثة أقسام تكفيه، وما عداها لا يُعرض له أصلاً كي لا يطرق باباً
 * مغلقاً.
 */
const AGENT_TABS = [
  { key: "home", label: "الرئيسية", icon: "home", to: "/bigagent" },
  { key: "oyunpin", label: "الألعاب", icon: "games", to: "/bigagent/price-groups" },
  { key: "bayiler", label: "الوكلاء", icon: "users", to: "/bigagent/dealers" },
];
const SUBNAV_AGENT_OYUNPIN = [
  { label: "متابعة الطلبات", to: "/bigagent/orders" },
  { label: "مجموعات الأسعار", to: "/bigagent/price-groups" },
];
const SUBNAV_AGENT_BAYILER = [
  { label: "قائمة الوكلاء", to: "/bigagent/dealers" },
];

function agentSubnavFor(path: string) {
  if (path === "/bigagent") return [];                       // الرئيسية بلا قائمة
  if (path.startsWith("/bigagent/price-groups") || path.startsWith("/bigagent/orders")) {
    return SUBNAV_AGENT_OYUNPIN;
  }
  return SUBNAV_AGENT_BAYILER;
}

function subnavFor(path: string) {
  if (path.startsWith("/home")) return [];   // الرئيسية بلا قائمة فرعية
  if (path.startsWith("/oyunpin")) return SUBNAV_OYUNPIN;
  if (path.startsWith("/reports")) return SUBNAV_RAPORLAR;
  if (path.startsWith("/settings")) return SUBNAV_AYARLAR;
  return SUBNAV_BAYILER; // /dealers + /ayarlar
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const isAgent = user?.role === "ana_bayi";
  const loc = useLocation();
  const [ann, setAnn] = useState<{ message: string; ticker: string } | null>(null);
  const [themeCfg, setThemeCfg] = useState<ThemeConfig>({});
  const [customizerOpen, setCustomizerOpen] = useState(false);
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    api.get("/announcement/").then((r) => setAnn(r.data)).catch(() => setAnn({ message: "", ticker: "" }));
    // تخصيص المظهر المحفوظ لهذا المتجر
    api.get("/settings/theme/").then((r) => {
      const cfg = r.data.config || {};
      setThemeCfg(cfg);
      applyThemeConfig(cfg);
    }).catch(() => {});
  }, []);

  /** عدّادات شريط التنبيه — نداء واحد كل دقيقة، ومرّة عند كل تنقّل. */
  useEffect(() => {
    if (isAgent) return;      // عدّادات صاحب المتجر لا تعنيه
    let alive = true;
    const pull = () => api.get("/alerts/")
      .then((r) => alive && setCounts(r.data))
      .catch(() => {});
    pull();
    const t = setInterval(pull, 60_000);
    return () => { alive = false; clearInterval(t); };
  }, [loc.pathname, isAgent]);

  const flags = { ...THEME_DEFAULTS, ...themeCfg };
  const tickerItems = (ann?.ticker || "").split("\n").map((s) => s.trim()).filter(Boolean);
  const mainTabs = isAgent ? AGENT_TABS : ADMIN_TABS;
  const subLinks = isAgent ? agentSubnavFor(loc.pathname) : subnavFor(loc.pathname);

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
          {mainTabs.map((t) => {
            // التبويب النشط واحد فقط — يُحدَّد من المسار الحالي
            const active = isAgent
              ? (t.key === "home" && loc.pathname === "/bigagent") ||
                (t.key === "oyunpin" &&
                  (loc.pathname.startsWith("/bigagent/price-groups") ||
                   loc.pathname.startsWith("/bigagent/orders"))) ||
                (t.key === "bayiler" && loc.pathname.startsWith("/bigagent/dealers"))
              : (t.key === "home" && loc.pathname.startsWith("/home")) ||
                (t.key === "oyunpin" && loc.pathname.startsWith("/oyunpin")) ||
                (t.key === "raporlar" && loc.pathname.startsWith("/reports")) ||
                (t.key === "ayarlar" && loc.pathname.startsWith("/settings")) ||
                (t.key === "bayiler" &&
                  (loc.pathname.startsWith("/dealers") || loc.pathname.startsWith("/ayarlar")));
            return (
              <Link
                key={t.key}
                to={t.to}
                style={{
                  ...tab,
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
          {(isAgent ? [] : ALERTS).map((a) => {
            const n = counts[a.key] || 0;
            const live = n > 0;
            return (
              <Link key={a.key} to={a.to} aria-label={a.label}
                title={live ? `${a.label} — ${n}` : `${a.label}: لا شيء`}
                style={{
                  ...alertIco,
                  // الملوّنة تنادي، والباهتة تنتظر — والمكان ثابت في الحالتين
                  background: live ? (a.hot ? "var(--danger)" : "rgba(255,255,255,.22)") : "transparent",
                  color: live ? "#fff" : "rgba(255,255,255,.38)",
                  position: "relative",
                }}>
                <Icon name={a.icon} size={16} />
                {live && <span style={badgeDot}>{n > 99 ? "99+" : n}</span>}
              </Link>
            );
          })}
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
      {subLinks.length > 0 && (
        <div style={subnav}>
          {subLinks.map((s) => {
            const active = loc.pathname === s.to;
            return (
              <Link key={s.to} to={s.to} style={{ ...subLink, ...(active ? subActive : {}) }}>
                {s.label}
              </Link>
            );
          })}
        </div>
      )}

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
const tabActive: React.CSSProperties = {
  background: "#f2f5f6",
  color: "var(--tab-active-text)",
  fontWeight: 700,
};
const alertIco: React.CSSProperties = {
  width: 30,
  height: 30,
  borderRadius: 4,
  // الخلفية واللون يُحدَّدان لكل أيقونة حسب حالتها (ملوّنة/باهتة)
  border: "1px solid rgba(255,255,255,.16)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 15,
  textDecoration: "none",
  transition: "background .15s, color .15s",
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
  minWidth: 15,
  height: 15,
  padding: "0 3px",
  borderRadius: 8,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  boxShadow: "0 1px 3px rgba(0,0,0,.3)",
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
