import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../auth";
import Icon from "../components/Icon";
import { symbolOf } from "../currency";

type Tab = "home" | "dealers" | "groups" | "margins" | "orders";
const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: "home", label: "الرئيسية", icon: "home" },
  { key: "dealers", label: "وكلائي", icon: "users" },
  { key: "groups", label: "مجموعات أسعاري", icon: "dollar" },
  { key: "margins", label: "هامش سريع", icon: "tag" },
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
        {tab === "groups" && <PriceGroups />}
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
  // عملة عرض الوكيل الكبير — يضبطها صاحب المتجر، والأرقام تصل محوَّلةً إليها
  const cur = symbolOf(s.currency || "");
  return (
    <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
      <Stat icon="wallet" label="رصيدي" value={money(s.balance) + " " + cur} />
      <Stat icon="users" label="وكلائي" value={s.dealers} />
      <Stat icon="chart" label="طلبات ناجحة" value={s.orders} />
      <Stat icon="dollar" label="أرباحي" value={money(s.profit) + " " + cur} />
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
  const [groups, setGroups] = useState<any[]>([]);
  function load() {
    api.get("/agent/dealers/").then((r) => setRows(r.data.results));
    api.get("/agent/price-groups/").then((r) => setGroups(r.data.results)).catch(() => setGroups([]));
  }
  useEffect(() => load(), []);

  /** مجموعة الدكان تحدّد بكم يشتري منّي — تغييرها يسري على طلبه التالي. */
  async function setGroup(dealer: number, price_group: string) {
    await api.post("/agent/dealer-group/", { dealer, price_group: price_group || null });
    setRows((ds) => ds.map((d) => (d.id === dealer
      ? { ...d, price_group: price_group ? Number(price_group) : null } : d)));
  }
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
        <thead><tr>{["الرقم", "الاسم", "الرصيد", "مجموعة أسعاره", "الحالة"].map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead>
        <tbody>
          {rows.length === 0 ? <tr><td colSpan={5} style={{ ...td, padding: 22 }}>لا يوجد دكاكين — أضف أول دكان</td></tr>
            : rows.map((d, i) => (
              <tr key={d.id} style={{ background: i % 2 ? "var(--row-alt)" : "#fff" }}>
                <td style={{ ...td, color: "var(--muted)" }}>{d.login_id}</td>
                <td style={{ ...td, fontWeight: 600 }}>{d.name}</td>
                <td style={td}>{money(d.balance)}</td>
                <td style={td}>
                  <select value={d.price_group ?? ""} onChange={(e) => setGroup(d.id, e.target.value)}
                    title="بأسعار هذه المجموعة يشتري منّي">
                    <option value="">— بلا مجموعة (بسعر تكلفتي) —</option>
                    {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                </td>
                <td style={td}><span style={{ color: d.status === "active" ? "var(--ok)" : "var(--danger)" }}>●</span></td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}

/* ===== مجموعات أسعاري =====
 *
 * صاحب المتجر يبيعني بسعر مجموعتي عنده، وأنا أبيع دكاكيني بمجموعاتي أنا:
 * مجموعة لكل شريحة، سعر لكل باقة فيها، وكل دكان في مجموعة. الفرق ربحي، ويدخل
 * محفظتي لحظة طلب الدكان.
 */
function PriceGroups() {
  const [groups, setGroups] = useState<any[]>([]);
  const [active, setActive] = useState<number | null>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [cur, setCur] = useState("");
  const [edit, setEdit] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");

  function loadGroups() {
    api.get("/agent/price-groups/").then((r) => {
      setGroups(r.data.results);
      setActive((a) => a ?? (r.data.results[0]?.id ?? null));
    });
  }
  useEffect(() => loadGroups(), []);

  function loadPrices(id: number) {
    api.get("/agent/price-groups/prices/", { params: { group: id } })
      .then((r) => { setRows(r.data.results); setCur(r.data.currency || ""); });
  }
  useEffect(() => { if (active) loadPrices(active); }, [active]);

  async function addGroup() {
    const name = prompt("اسم المجموعة (مثال: ذهبية):");
    if (!name) return;
    try {
      const r = await api.post("/agent/price-groups/", { name });
      loadGroups();
      setActive(r.data.id);
    } catch (e: any) { alert(e?.response?.data?.detail || "فشل"); }
  }

  async function delGroup(g: any) {
    if (!confirm(`حذف «${g.name}»؟ دكاكينها (${g.dealers}) تعود بلا مجموعة فتشتري بسعر تكلفتي.`)) return;
    await api.delete("/agent/price-groups/", { data: { id: g.id } });
    setActive(null);
    loadGroups();
  }

  async function savePrice(product: number) {
    setErr("");
    try {
      await api.post("/agent/price-groups/prices/", { group: active, product, price: draft });
      setEdit(null);
      if (active) loadPrices(active);
    } catch (e: any) {
      setErr(e?.response?.data?.detail || "تعذّر الحفظ");
      setEdit(null);
    }
  }

  const money = (v: string) => Number(v).toLocaleString("en-US", { minimumFractionDigits: 2 });
  const shown = q ? rows.filter((r) => r.name.includes(q) || r.game.includes(q)) : rows;

  return (
    <div style={card}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
        <h3 style={{ color: "var(--primary-dark)" }}>مجموعات أسعاري لدكاكيني</h3>
        <button className="btn g" onClick={addGroup}>
          <Icon name="plus" size={14} style={{ marginInlineEnd: 4 }} />مجموعة جديدة
        </button>
        <input placeholder="بحث عن باقة…" value={q} onChange={(e) => setQ(e.target.value)}
          style={{ width: 200, marginInlineStart: "auto" }} />
      </div>

      {groups.length === 0 ? (
        <div style={{ color: "var(--muted)", padding: 18, fontSize: 13.5, lineHeight: 1.9 }}>
          لا مجموعات بعد. أنشئ مجموعة، سعّر فيها الباقات، ثم ضع كل دكان في مجموعته
          من تبويب «وكلائي». الدكان بلا مجموعة يشتري بسعر تكلفتك أنت — بلا ربح لك.
        </div>
      ) : (
        <>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
            {groups.map((g) => (
              <span key={g.id} style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                border: `1px solid ${active === g.id ? "var(--primary)" : "var(--border)"}`,
                background: active === g.id ? "var(--primary)" : "transparent",
                color: active === g.id ? "#fff" : "var(--text)",
                borderRadius: 20, padding: "5px 12px", fontSize: 13, cursor: "pointer",
              }} onClick={() => setActive(g.id)}>
                {g.name}
                <b style={{ opacity: 0.7, fontSize: 11 }}>{g.dealers} دكان</b>
                <button onClick={(e) => { e.stopPropagation(); delGroup(g); }}
                  title="حذف المجموعة"
                  style={{ background: "none", border: 0, cursor: "pointer", padding: 0,
                    color: active === g.id ? "#fff" : "var(--danger)" }}>✕</button>
              </span>
            ))}
          </div>

          {err && <div style={{ color: "var(--danger)", fontSize: 13, marginBottom: 10 }}>{err}</div>}

          <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 10 }}>
            اضغط على السعر لتعديله. الفارق عن تكلفتك هو ربحك، ويدخل محفظتك لحظة
            طلب الدكان. السعر الفارغ يعني أن الدكان يشتري بسعر تكلفتك (بلا ربح).
            {cur && <> الأرقام بعملة {cur}.</>}
          </p>

          <table style={table}>
            <thead><tr>{["الباقة", "اللعبة", "تكلفتي", "سعر دكاكيني", "ربحي"].map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead>
            <tbody>
              {shown.length === 0 ? (
                <tr><td colSpan={5} style={{ ...td, padding: 22 }}>لا باقات مطابقة</td></tr>
              ) : shown.map((r, i) => (
                <tr key={r.product} style={{ background: i % 2 ? "var(--row-alt)" : "#fff" }}>
                  <td style={{ ...td, textAlign: "right", paddingInlineStart: 12, fontWeight: 600 }}>{r.name}</td>
                  <td style={{ ...td, color: "var(--muted)" }}>{r.game}</td>
                  <td style={td}>{money(r.cost)}</td>
                  <td style={{ ...td, cursor: "pointer", color: "var(--primary-dark)", fontWeight: 700 }}
                    onClick={() => { setEdit(r.product); setDraft(r.price || r.cost); }}>
                    {edit === r.product ? (
                      <input autoFocus type="number" step="0.01" value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onBlur={() => savePrice(r.product)}
                        onKeyDown={(e) => e.key === "Enter" && savePrice(r.product)}
                        style={{ width: 90, height: 26 }} />
                    ) : (r.price ? money(r.price) : "—")}
                  </td>
                  <td style={{ ...td, color: "var(--ok)", fontWeight: 700 }}>
                    {r.profit ? money(r.profit) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
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
      <h3 style={{ color: "var(--primary-dark)", marginBottom: 6 }}>هامش سريع على كل الباقات</h3>
      <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 12 }}>
        طريقٌ مختصر حين لا تريد تسعير كل باقة يدوياً: سعر الدكان = تكلفتك + هامشك.
        <b> ويسري على الدكان الذي لم تضعه في مجموعة</b> — وإن وضعتَه فسعر المجموعة يسبق.
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
