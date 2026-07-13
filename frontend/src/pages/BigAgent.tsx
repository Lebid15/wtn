import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../auth";
import Icon from "../components/Icon";

type Tab = "home" | "dealers" | "margins" | "orders";
const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: "home", label: "الرئيسية", icon: "home" },
  { key: "dealers", label: "وكلائي", icon: "users" },
  { key: "margins", label: "هامش الأسعار", icon: "dollar" },
  { key: "orders", label: "طلباتي", icon: "chart" },
];

export default function BigAgent() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [tab, setTab] = useState<Tab>("home");

  return (
    <div style={{ minHeight: "100vh", background: "#eef1f2" }}>
      <div style={header}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 22 }}>🏬</span>
          <b style={{ fontSize: 17 }}>لوحة الوكيل الكبير — {user?.name}</b>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button className="btn g" onClick={() => nav("/store")}>
            <Icon name="cart" size={15} style={{ marginInlineEnd: 5 }} />بيع مباشر
          </button>
          <button onClick={logout} style={logoutBtn}>خروج</button>
        </div>
      </div>

      <div style={subnav}>
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ ...tabBtn, ...(tab === t.key ? tabActive : {}) }}>
            <Icon name={t.icon} size={16} style={{ marginInlineEnd: 6 }} />{t.label}
          </button>
        ))}
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: 20 }}>
        {tab === "home" && <Home />}
        {tab === "dealers" && <Dealers />}
        {tab === "margins" && <Margins />}
        {tab === "orders" && <Orders />}
      </div>
    </div>
  );
}

/* ===== الرئيسية ===== */
function Home() {
  const [s, setS] = useState<any>(null);
  useEffect(() => { api.get("/agent/summary/").then((r) => setS(r.data)); }, []);
  const money = (v: string) => Number(v).toLocaleString("en-US", { minimumFractionDigits: 2 });
  if (!s) return <div style={{ padding: 20 }}>جارٍ التحميل...</div>;
  return (
    <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
      <Stat icon="wallet" label="رصيدي" value={money(s.balance) + " ل.ت"} />
      <Stat icon="users" label="وكلائي" value={s.dealers} />
      <Stat icon="chart" label="طلبات ناجحة" value={s.orders} />
      <Stat icon="dollar" label="أرباحي" value={money(s.profit) + " ل.ت"} />
    </div>
  );
}
function Stat({ icon, label, value }: { icon: string; label: string; value: any }) {
  return (
    <div style={statCard}>
      <div style={{ color: "var(--primary)" }}><Icon name={icon} size={26} /></div>
      <div style={{ fontSize: 26, fontWeight: 800, marginTop: 8 }}>{value}</div>
      <div style={{ color: "var(--muted)", fontSize: 14 }}>{label}</div>
    </div>
  );
}

/* ===== وكلائي ===== */
function Dealers() {
  const [rows, setRows] = useState<any[]>([]);
  function load() { api.get("/agent/dealers/").then((r) => setRows(r.data.results)); }
  useEffect(() => load(), []);
  async function add() {
    const name = prompt("اسم الدكان:"); if (!name) return;
    const login_id = prompt("رقم الدخول:"); if (!login_id) return;
    const password = prompt("كلمة المرور:"); if (!password) return;
    try { await api.post("/agent/dealers/", { name, login_id, password }); load(); }
    catch (e: any) { alert(e?.response?.data?.detail || "فشل"); }
  }
  const money = (v: string) => Number(v).toLocaleString("en-US", { minimumFractionDigits: 2 });
  return (
    <div style={card}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <h3 style={{ color: "var(--primary-dark)" }}>وكلائي (دكاكيني)</h3>
        <button className="btn g" onClick={add}><Icon name="plus" size={14} style={{ marginInlineEnd: 4 }} />إضافة دكان</button>
      </div>
      <table style={table}>
        <thead><tr>{["الرقم", "الاسم", "الرصيد", "الحالة"].map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead>
        <tbody>
          {rows.length === 0 ? <tr><td colSpan={4} style={{ ...td, padding: 22 }}>لا يوجد دكاكين — أضف أول دكان</td></tr>
            : rows.map((d, i) => (
              <tr key={d.id} style={{ background: i % 2 ? "var(--row-alt)" : "#fff" }}>
                <td style={{ ...td, color: "var(--muted)" }}>{d.login_id}</td>
                <td style={{ ...td, fontWeight: 600 }}>{d.name}</td>
                <td style={td}>{money(d.balance)}</td>
                <td style={td}><span style={{ color: "var(--ok)" }}>● نشط</span></td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}

/* ===== هامش الأسعار ===== */
function Margins() {
  const [rows, setRows] = useState<any[]>([]);
  const [edit, setEdit] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  function load() { api.get("/agent/margins/").then((r) => setRows(r.data.results)); }
  useEffect(() => load(), []);
  async function save(product: number) {
    await api.post("/agent/set-margin/", { product, margin_percent: draft || "0" });
    setEdit(null); load();
  }
  const money = (v: string) => Number(v).toLocaleString("en-US", { minimumFractionDigits: 2 });
  return (
    <div style={card}>
      <h3 style={{ color: "var(--primary-dark)", marginBottom: 6 }}>هامش الأسعار على الباقات</h3>
      <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 12 }}>
        اضغط على الهامش لتعديله. سعر دكاكينك = تكلفتك + هامشك.
      </p>
      <table style={table}>
        <thead><tr>{["الباقة", "اللعبة", "تكلفتي", "هامشي %", "سعر دكاكيني"].map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.product} style={{ background: i % 2 ? "var(--row-alt)" : "#fff" }}>
              <td style={{ ...td, textAlign: "right", paddingInlineStart: 12, fontWeight: 600 }}>{r.name}</td>
              <td style={{ ...td, color: "var(--muted)" }}>{r.game}</td>
              <td style={td}>{money(r.cost)}</td>
              <td style={{ ...td, cursor: "pointer", color: "var(--primary-dark)", fontWeight: 700 }}
                onClick={() => { setEdit(r.product); setDraft(r.margin_percent); }}>
                {edit === r.product ? (
                  <input autoFocus type="number" step="0.5" value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onBlur={() => save(r.product)}
                    onKeyDown={(e) => e.key === "Enter" && save(r.product)}
                    style={{ width: 70, height: 26 }} />
                ) : `${Number(r.margin_percent)}%`}
              </td>
              <td style={{ ...td, color: "var(--ok)", fontWeight: 700 }}>{money(r.dealer_price)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ===== طلباتي ===== */
function Orders() {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => { api.get("/agent/orders/").then((r) => setRows(r.data.results)); }, []);
  const money = (v: string) => Number(v).toLocaleString("en-US", { minimumFractionDigits: 2 });
  return (
    <div style={card}>
      <h3 style={{ color: "var(--primary-dark)", marginBottom: 12 }}>طلبات دكاكيني</h3>
      <table style={table}>
        <thead><tr>{["الفاتورة", "الدكان", "المنتج", "السعر", "ربحي", "الحالة", "التاريخ"].map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead>
        <tbody>
          {rows.length === 0 ? <tr><td colSpan={7} style={{ ...td, padding: 22 }}>لا توجد طلبات بعد</td></tr>
            : rows.map((o, i) => (
              <tr key={o.id} style={{ background: i % 2 ? "var(--row-alt)" : "#fff" }}>
                <td style={{ ...td, color: "var(--primary-dark)", fontWeight: 600 }}>{o.receipt_no}</td>
                <td style={td}>{o.dealer_name}</td>
                <td style={td}>{o.product_name}</td>
                <td style={td}>{money(o.sell_price)}</td>
                <td style={{ ...td, color: "var(--ok)", fontWeight: 600 }}>{money(o.profit)}</td>
                <td style={td}>{o.status_label}</td>
                <td style={{ ...td, fontSize: 12, color: "var(--muted)" }}>{o.created_at}</td>
              </tr>
            ))}
        </tbody>
      </table>
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
const subnav: React.CSSProperties = {
  display: "flex", gap: 2, background: "#fff", borderBottom: "1px solid var(--border)",
  padding: "0 16px",
};
const tabBtn: React.CSSProperties = {
  display: "flex", alignItems: "center", background: "transparent", border: 0,
  padding: "12px 20px", fontSize: 15, color: "#33454a", cursor: "pointer",
  borderBottom: "3px solid transparent",
};
const tabActive: React.CSSProperties = {
  color: "var(--primary-dark)", fontWeight: 700, borderBottom: "3px solid var(--primary)",
};
const card: React.CSSProperties = {
  background: "#fff", borderRadius: 10, padding: 20, boxShadow: "0 2px 8px rgba(0,0,0,.05)",
};
const statCard: React.CSSProperties = {
  flex: 1, minWidth: 200, background: "#fff", borderRadius: 12, padding: "20px 22px",
  boxShadow: "0 2px 8px rgba(0,0,0,.05)",
};
const table: React.CSSProperties = {
  width: "100%", borderCollapse: "collapse", background: "var(--surface)", fontSize: 13.5,
};
const th: React.CSSProperties = {
  background: "var(--th-bg)", color: "var(--th-ink)", padding: "11px 10px",
  textAlign: "center", fontWeight: 800, fontSize: 12.5, whiteSpace: "nowrap",
  border: "1px solid var(--border)", borderTop: 0,
};
const td: React.CSSProperties = {
  padding: 10, textAlign: "center", whiteSpace: "nowrap", verticalAlign: "middle",
  background: "var(--surface)", border: "1px solid var(--border)",
  borderBottom: "3px solid var(--row-sep)",
};
