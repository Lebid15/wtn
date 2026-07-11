import { useEffect, useState } from "react";
import { api } from "../api";
import { useAuth } from "../auth";
import Icon from "../components/Icon";

interface SProduct { id: number; name: string; price: string; require_player_id: boolean }
interface SGame { id: number; name: string; image_url: string; require_player_id: boolean; products: SProduct[] }
interface Summary {
  balance: string; credit_limit: string; currency: string;
  orders: number; profit: string; sell: string; pending: number;
}

type Tab = "home" | "sell" | "orders";
const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: "home", label: "الرئيسية", icon: "home" },
  { key: "sell", label: "البيع", icon: "cart" },
  { key: "orders", label: "طلباتي", icon: "chart" },
];

const money = (v: string | number) =>
  Number(v).toLocaleString("en-US", { minimumFractionDigits: 2 });

export default function Store() {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState<Tab>("home");
  const [summary, setSummary] = useState<Summary | null>(null);

  function loadSummary() {
    api.get("/store/summary/").then((r) => setSummary(r.data)).catch(() => {});
  }
  useEffect(loadSummary, []);

  const balance = summary?.balance ?? user?.wallet?.balance ?? "0";
  const currency = summary?.currency ?? user?.wallet?.currency ?? "";

  return (
    <div style={{ minHeight: "100vh", background: "#eef1f2" }}>
      {/* هيدر — اسم المتجر + الرصيد + خروج آمن */}
      <div style={header}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 24 }}>🎮</span>
          <b style={{ fontSize: 17 }}>{user?.tenant?.name || "متجر الشحن"}</b>
          <span style={{ opacity: 0.85, fontSize: 13 }}>— {user?.name}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={walletChip}>
            الرصيد: <b style={{ color: Number(balance) < 0 ? "#ffd0cb" : "#fff" }}>{money(balance)}</b> {currency}
          </span>
          <button onClick={logout} style={linkBtn}>
            <Icon name="logout" size={14} style={{ marginInlineEnd: 5 }} />خروج آمن
          </button>
        </div>
      </div>

      {/* شريط التبويبات */}
      <div style={subnav}>
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ ...tabBtn, ...(tab === t.key ? tabActive : {}) }}>
            <Icon name={t.icon} size={16} style={{ marginInlineEnd: 6 }} />{t.label}
          </button>
        ))}
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: 20 }}>
        {tab === "home" && <HomeTab summary={summary} onSell={() => setTab("sell")} />}
        {tab === "sell" && <SellTab onBought={loadSummary} />}
        {tab === "orders" && <OrdersTab />}
      </div>
    </div>
  );
}

/* ===== الرئيسية ===== */
function HomeTab({ summary, onSell }: { summary: Summary | null; onSell: () => void }) {
  if (!summary) return <div style={{ padding: 20 }}>جارٍ التحميل...</div>;
  return (
    <div>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 20 }}>
        <Stat icon="wallet" label="رصيدي" value={money(summary.balance) + " " + summary.currency}
          tone={Number(summary.balance) < 0 ? "danger" : "primary"} />
        <Stat icon="chart" label="طلبات ناجحة" value={summary.orders} />
        <Stat icon="dollar" label="أرباحي" value={money(summary.profit) + " " + summary.currency} />
        <Stat icon="refresh" label="قيد الانتظار" value={summary.pending} />
      </div>
      <div style={announce}>
        <div style={{ fontWeight: 800, marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
          <Icon name="bell" size={18} />الإعلانات
        </div>
        <p style={{ color: "var(--muted)", margin: "4px 0 14px", lineHeight: 1.9 }}>
          أهلاً بك في لوحة الوكيل. اختر "البيع" لشحن الألعاب لزبائنك، وتابع طلباتك من تبويب "طلباتي".
        </p>
        <button className="btn g" onClick={onSell}>
          <Icon name="cart" size={15} style={{ marginInlineEnd: 6 }} />ابدأ البيع الآن
        </button>
      </div>
    </div>
  );
}
function Stat({ icon, label, value, tone = "primary" }:
  { icon: string; label: string; value: any; tone?: "primary" | "danger" }) {
  return (
    <div style={statCard}>
      <div style={{ color: tone === "danger" ? "var(--danger)" : "var(--primary)" }}>
        <Icon name={icon} size={26} />
      </div>
      <div style={{ fontSize: 24, fontWeight: 800, marginTop: 8 }}>{value}</div>
      <div style={{ color: "var(--muted)", fontSize: 14 }}>{label}</div>
    </div>
  );
}

/* ===== البيع (المتجر) ===== */
function SellTab({ onBought }: { onBought: () => void }) {
  const [games, setGames] = useState<SGame[]>([]);
  const [active, setActive] = useState<SGame | null>(null);
  const [buy, setBuy] = useState<SProduct | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    api.get("/store/catalog/").then((r) => setGames(r.data.games));
  }, []);

  const shown = games.filter((g) => g.name.toLowerCase().includes(q.trim().toLowerCase()));

  return (
    <div>
      {!active ? (
        <>
          <div style={{ position: "relative", marginBottom: 18 }}>
            <input placeholder="ابحث عن لعبة..." value={q} onChange={(e) => setQ(e.target.value)}
              style={{ width: "100%", height: 44, paddingInlineStart: 40, fontSize: 15, borderRadius: 25 }} />
            <span style={{ position: "absolute", insetInlineStart: 14, top: 13, color: "var(--muted)" }}>
              <Icon name="search" size={18} />
            </span>
          </div>
          <div style={grid}>
            {shown.map((g) => (
              <div key={g.id} style={gameCard} onClick={() => setActive(g)}>
                <div style={gameThumb}>
                  {g.image_url ? <img src={g.image_url} style={{ width: "100%", borderRadius: 10 }} /> : "🎮"}
                </div>
                <div style={{ fontWeight: 700, marginTop: 10 }}>{g.name}</div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 3 }}>{g.products.length} باقة</div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <button onClick={() => setActive(null)} style={backBtn}>← كل الألعاب</button>
          <h2 style={{ margin: "10px 0 16px", color: "var(--primary-dark)" }}>باقات {active.name}</h2>
          <div style={grid}>
            {active.products.map((p) => (
              <div key={p.id} style={pkgCard}>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{p.name}</div>
                <div style={{ color: "var(--primary-dark)", fontSize: 20, fontWeight: 800, margin: "10px 0" }}>
                  {money(p.price)} <span style={{ fontSize: 13, color: "var(--muted)" }}>ل.ت</span>
                </div>
                <button className="btn g" style={{ width: "100%", height: 38 }} onClick={() => setBuy(p)}>
                  شراء الآن
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {buy && active && (
        <BuyModal product={buy} requirePlayer={active.require_player_id}
          onClose={() => setBuy(null)} onBought={onBought} />
      )}
    </div>
  );
}

/* ===== طلباتي (Pin Takip) ===== */
function OrdersTab() {
  const [rows, setRows] = useState<any[]>([]);
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    api.get("/store/orders/", { params: { status } })
      .then((r) => setRows(r.data.results)).finally(() => setLoading(false));
  }
  useEffect(load, [status]);

  const STATUS_COLOR: Record<string, string> = {
    success: "var(--ok)", pending: "#e0a800", processing: "#3b82f6",
    cancelled: "var(--danger)", stuck: "#8a5a00",
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 10, marginBottom: 14, alignItems: "center" }}>
        <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ height: 36 }}>
          <option value="all">كل الحالات</option>
          <option value="success">ناجح</option>
          <option value="pending">قيد الانتظار</option>
          <option value="processing">قيد التنفيذ</option>
          <option value="cancelled">ملغى</option>
        </select>
        <span style={{ marginInlineStart: "auto", color: "var(--muted)", fontSize: 14 }}>العدد: {rows.length}</span>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={table}>
          <thead>
            <tr>
              <th style={th}>رقم الفيش</th>
              <th style={{ ...th, textAlign: "right", paddingInlineStart: 12 }}>اللعبة / الباقة</th>
              <th style={th}>معرّف اللاعب</th>
              <th style={th}>التكلفة</th>
              <th style={th}>البيع</th>
              <th style={th}>الربح</th>
              <th style={th}>الحالة</th>
              <th style={th}>التاريخ</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={{ padding: 24, textAlign: "center", color: "var(--muted)" }}>جارٍ التحميل...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={8} style={{ padding: 24, textAlign: "center", color: "var(--muted)" }}>لا توجد طلبات بعد</td></tr>
            ) : rows.map((o) => (
              <tr key={o.id}>
                <td style={td}>{o.receipt_no}</td>
                <td style={{ ...td, textAlign: "right", paddingInlineStart: 12 }}>
                  <b>{o.game_name}</b> — {o.product_name}
                </td>
                <td style={td}>{o.player_id || "—"}</td>
                <td style={td}>{money(o.cost_price)}</td>
                <td style={td}>{money(o.sell_price)}</td>
                <td style={{ ...td, color: "var(--ok)", fontWeight: 700 }}>{money(o.profit)}</td>
                <td style={td}>
                  <span style={{
                    display: "inline-block", width: 10, height: 10, borderRadius: "50%",
                    background: STATUS_COLOR[o.status] || "#999", marginInlineEnd: 6,
                  }} />
                  {o.status_label}
                </td>
                <td style={{ ...td, color: "var(--muted)", fontSize: 12 }}>{o.created_at}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BuyModal({ product, requirePlayer, onClose, onBought }:
  { product: SProduct; requirePlayer: boolean; onClose: () => void; onBought: () => void }) {
  const [playerId, setPlayerId] = useState("");
  const [phone, setPhone] = useState("");
  const [done, setDone] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr("");
    try {
      const r = await api.post("/store/buy/", {
        product: product.id, player_id: playerId, customer_phone: phone,
      });
      setDone(r.data.receipt_no);
      onBought();
    } catch (e: any) {
      setErr(e?.response?.data?.detail || "فشل الشراء");
    } finally { setBusy(false); }
  }

  return (
    <div style={overlay} onClick={onClose}>
      <form style={modal} onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <div style={{ background: "var(--primary)", color: "#fff", padding: "14px 18px", fontWeight: 700 }}>
          شراء: {product.name}
        </div>
        <div style={{ padding: 20 }}>
          {done ? (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 42 }}>✅</div>
              <p style={{ margin: "10px 0", fontSize: 16 }}>تم إنشاء الطلب بنجاح!</p>
              <p style={{ color: "var(--muted)" }}>رقم الطلب: <b>{done}</b></p>
              <button type="button" className="btn" style={{ marginTop: 14 }} onClick={onClose}>إغلاق</button>
            </div>
          ) : (
            <>
              <div style={{ fontSize: 14, color: "var(--muted)", marginBottom: 14 }}>
                السعر: <b style={{ color: "var(--primary-dark)" }}>{money(product.price)} ل.ت</b>
              </div>
              {requirePlayer && (
                <>
                  <label style={lbl}>معرّف اللاعب (ID)</label>
                  <input style={inp} value={playerId} onChange={(e) => setPlayerId(e.target.value)} required autoFocus />
                </>
              )}
              <label style={lbl}>رقم الهاتف (اختياري)</label>
              <input style={inp} value={phone} onChange={(e) => setPhone(e.target.value)} />
              {err && <div style={errBox}>{err}</div>}
              <button className="btn g" style={{ width: "100%", height: 42, marginTop: 16 }} disabled={busy}>
                {busy ? "جارٍ..." : "تأكيد الشراء"}
              </button>
            </>
          )}
        </div>
      </form>
    </div>
  );
}

const header: React.CSSProperties = {
  display: "flex", alignItems: "center", justifyContent: "space-between",
  background: "var(--primary)", color: "#fff", padding: "12px 24px",
};
const subnav: React.CSSProperties = {
  display: "flex", gap: 4, background: "var(--primary-dark)", padding: "0 20px",
};
const tabBtn: React.CSSProperties = {
  background: "transparent", border: "none", color: "rgba(255,255,255,.8)",
  padding: "12px 18px", fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center",
  borderBottom: "3px solid transparent",
};
const tabActive: React.CSSProperties = {
  background: "rgba(255,255,255,.12)", color: "#fff", borderBottom: "3px solid #fff", fontWeight: 700,
};
const walletChip: React.CSSProperties = {
  background: "rgba(255,255,255,.18)", padding: "6px 14px", borderRadius: 20, fontWeight: 600, fontSize: 14,
};
const linkBtn: React.CSSProperties = {
  background: "transparent", border: "1px solid rgba(255,255,255,.4)", color: "#fff",
  padding: "6px 12px", borderRadius: 5, fontSize: 13, display: "flex", alignItems: "center", cursor: "pointer",
};
const statCard: React.CSSProperties = {
  background: "#fff", borderRadius: 12, padding: "18px 26px", minWidth: 170, textAlign: "center",
  boxShadow: "0 2px 8px rgba(0,0,0,.06)", flex: "1 1 170px",
};
const announce: React.CSSProperties = {
  background: "#fff", borderRadius: 12, padding: 22, boxShadow: "0 2px 8px rgba(0,0,0,.06)",
};
const grid: React.CSSProperties = {
  display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 16,
};
const gameCard: React.CSSProperties = {
  background: "#fff", borderRadius: 12, padding: 16, textAlign: "center",
  cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,.06)",
};
const gameThumb: React.CSSProperties = {
  height: 120, display: "flex", alignItems: "center", justifyContent: "center",
  fontSize: 54, background: "#f2f5f6", borderRadius: 10,
};
const pkgCard: React.CSSProperties = {
  background: "#fff", borderRadius: 12, padding: 18, textAlign: "center",
  boxShadow: "0 2px 8px rgba(0,0,0,.06)",
};
const backBtn: React.CSSProperties = {
  background: "#fff", border: "1px solid var(--border)", padding: "7px 14px", borderRadius: 6, cursor: "pointer",
};
const table: React.CSSProperties = {
  width: "100%", borderCollapse: "collapse", background: "#fff", fontSize: 13,
  boxShadow: "0 2px 8px rgba(0,0,0,.06)", borderRadius: 8, overflow: "hidden",
};
const th: React.CSSProperties = {
  background: "var(--primary-dark)", color: "#fff", padding: "10px 8px", fontWeight: 600,
  fontSize: 12, textAlign: "center", whiteSpace: "nowrap",
};
const td: React.CSSProperties = {
  padding: "9px 8px", textAlign: "center", borderBottom: "1px solid #eef1f2", whiteSpace: "nowrap",
};
const overlay: React.CSSProperties = {
  position: "fixed", inset: 0, background: "rgba(0,0,0,.45)",
  display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
};
const modal: React.CSSProperties = {
  width: 400, background: "#fff", borderRadius: 10, overflow: "hidden",
};
const lbl: React.CSSProperties = { display: "block", fontSize: 13, color: "var(--muted)", margin: "12px 2px 5px" };
const inp: React.CSSProperties = { width: "100%", height: 40 };
const errBox: React.CSSProperties = {
  background: "#fdecea", border: "1px solid #f5c6c2", color: "var(--danger)",
  fontSize: 13, padding: "9px 12px", borderRadius: 5, marginTop: 12,
};
