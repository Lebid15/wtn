import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../auth";
import Icon from "../components/Icon";
import Tickets from "../components/Tickets";
import { applyThemeConfig } from "../theme";

interface SProduct {
  id: number; name: string; price: string;
  recommended_price: string; require_player_id: boolean;
}
interface SGame { id: number; name: string; image_url: string; require_player_id: boolean; products: SProduct[] }
interface Summary {
  balance: string; credit_limit: string; currency: string;
  orders: number; profit: string; sell: string; pending: number;
}

type Tab = "home" | "sell" | "orders" | "reports" | "wallet" | "support" | "settings";
const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: "home", label: "الرئيسية", icon: "home" },
  { key: "sell", label: "البيع", icon: "cart" },
  { key: "orders", label: "طلباتي", icon: "chart" },
  { key: "reports", label: "تقاريري", icon: "excel" },
  { key: "wallet", label: "محفظتي", icon: "wallet" },
  { key: "support", label: "الدعم", icon: "chat" },
  { key: "settings", label: "إعداداتي", icon: "settings" },
];

const money = (v: string | number) =>
  Number(v).toLocaleString("en-US", { minimumFractionDigits: 2 });

/** ربح الوكيل = سعر بيعه لزبونه − سعر شرائه من المتجر. */
const profitOf = (sell: string | number, paid: string | number) =>
  Number(sell || 0) - Number(paid || 0);

// كل قسم له رابطه الخاص: /store (الرئيسية) · /store/sell · /store/orders ...
const SECTIONS: Tab[] = ["sell", "orders", "reports", "wallet", "support", "settings"];
function tabFromPath(pathname: string): Tab {
  const seg = pathname.replace(/^\/store\/?/, "").split("/")[0];
  return (SECTIONS as string[]).includes(seg) ? (seg as Tab) : "home";
}
const pathForTab = (t: Tab) => (t === "home" ? "/store" : `/store/${t}`);

export default function Store() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const tab = tabFromPath(loc.pathname);
  const goTab = (t: Tab) => nav(pathForTab(t));
  const [summary, setSummary] = useState<Summary | null>(null);
  const [unread, setUnread] = useState(0);

  function loadSummary() {
    api.get("/store/summary/").then((r) => setSummary(r.data)).catch(() => {});
  }
  useEffect(() => {
    loadSummary();
    // الوكيل يرث تخصيص مظهر متجره (يضبطه صاحب المتجر)
    api.get("/settings/theme/").then((r) => applyThemeConfig(r.data.config || {})).catch(() => {});
  }, []);

  // تحديث لحظي (polling) لعدّاد الرسائل غير المقروءة
  useEffect(() => {
    const poll = () => api.get("/tickets/unread-count/").then((r) => setUnread(r.data.unread)).catch(() => {});
    poll();
    const id = setInterval(poll, 15000);
    return () => clearInterval(id);
  }, [tab]);

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
          {user?.role === "ana_bayi" && (
            <button onClick={() => nav("/bigagent")} style={linkBtn}>
              <Icon name="building" size={14} style={{ marginInlineEnd: 5 }} />لوحة الوكيل الكبير
            </button>
          )}
          <button onClick={logout} style={linkBtn}>
            <Icon name="logout" size={14} style={{ marginInlineEnd: 5 }} />خروج آمن
          </button>
        </div>
      </div>

      {/* شريط التبويبات */}
      <div style={subnav}>
        {TABS.map((t) => (
          <button key={t.key} onClick={() => goTab(t.key)}
            style={{ ...tabBtn, ...(tab === t.key ? tabActive : {}) }}>
            <Icon name={t.icon} size={16} style={{ marginInlineEnd: 6 }} />{t.label}
            {t.key === "support" && unread > 0 && (
              <span style={{ background: "var(--danger)", color: "#fff", fontSize: 10, fontWeight: 700, borderRadius: 9, padding: "1px 6px", marginInlineStart: 5 }}>{unread}</span>
            )}
          </button>
        ))}
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: 20 }}>
        {tab === "home" && <HomeTab summary={summary} onSell={() => goTab("sell")} />}
        {tab === "sell" && <SellTab onBought={loadSummary} onFinish={() => goTab("orders")} />}
        {tab === "orders" && <OrdersTab />}
        {tab === "reports" && <ReportsTab />}
        {tab === "wallet" && <WalletTab />}
        {tab === "support" && <Tickets title="الدعم / مراسلة الإدارة" />}
        {tab === "settings" && <SettingsTab />}
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
function SellTab({ onBought, onFinish }: { onBought: () => void; onFinish: () => void }) {
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
          onClose={() => setBuy(null)} onBought={onBought} onFinish={onFinish} />
      )}
    </div>
  );
}

/* ===== طلباتي (Pin Takip) ===== */
function OrdersTab() {
  const [rows, setRows] = useState<any[]>([]);
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [details, setDetails] = useState<any | null>(null);

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
              <th style={th}>هاتف الزبون / معرّف اللاعب</th>
              <th style={th}>الشراء</th>
              <th style={th}>البيع</th>
              <th style={th}>الربح</th>
              {/* الكود يظهر في نافذة التفاصيل — عمود خاصّ به يوسّع الجدول بلا داعٍ */}
              <th style={th}>الحالة</th>
              <th style={th}>التاريخ</th>
              <th style={th}>تفاصيل</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} style={{ padding: 24, textAlign: "center", color: "var(--muted)" }}>جارٍ التحميل...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={9} style={{ padding: 24, textAlign: "center", color: "var(--muted)" }}>لا توجد طلبات بعد</td></tr>
            ) : rows.map((o) => (
              <tr key={o.id}>
                <td style={td}>{o.receipt_no}</td>
                <td style={{ ...td, textAlign: "right", paddingInlineStart: 12 }}>
                  <b>{o.game_name}</b> — {o.product_name}
                </td>
                <td style={{ ...td, lineHeight: 1.35 }}>
                  {o.customer_phone || "—"}<br />
                  <span style={{ color: "var(--muted)" }}>{o.player_id || "—"}</span>
                </td>
                <td style={td}>{money(o.paid_price)}</td>
                <td style={td}>{money(o.dealer_sell_price)}</td>
                <td style={{
                  ...td, fontWeight: 700,
                  color: Number(o.dealer_profit) < 0 ? "var(--danger)" : "var(--ok)",
                }}
                  title={Number(o.dealer_profit) < 0 ? "بعتَ بأقلّ من سعر شرائك" : undefined}>
                  {money(o.dealer_profit)}
                </td>
                <td style={td}>
                  {o.status === "pending" || o.status === "processing" ? (
                    <span className={`stspin${o.status === "processing" ? " proc" : ""}`}
                      style={{ width: 12, height: 12, marginInlineEnd: 6 }} />
                  ) : (
                    <span style={{
                      display: "inline-block", width: 10, height: 10, borderRadius: "50%",
                      background: STATUS_COLOR[o.status] || "#999", marginInlineEnd: 6,
                    }} />
                  )}
                  {o.status_label}
                </td>
                <td style={{ ...td, color: "var(--muted)", fontSize: 12 }}>{o.created_at}</td>
                <td style={td}>
                  <button onClick={() => setDetails(o)} title="تفاصيل الطلب" style={detailsBtn}>
                    <Icon name="search" size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {details && <OrderDetails order={details} onClose={() => setDetails(null)} />}
    </div>
  );
}

/* نافذة "تفاصيل الطلب" للوكيل — بياناته هو فقط: زبونه وأسعاره وحالة طلبه. */
function OrderDetails({ order: o, onClose }: { order: any; onClose: () => void }) {
  return (
    <div style={overlay} onClick={onClose}>
      <div style={{ ...modal, width: 460 }} onClick={(e) => e.stopPropagation()}>
        <div style={{
          background: "var(--primary)", color: "#fff", padding: "14px 18px", fontWeight: 700,
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <span>تفاصيل الطلب — فيش {o.receipt_no}</span>
          <button type="button" onClick={onClose}
            style={{ background: "transparent", border: "none", color: "#fff", fontSize: 18, cursor: "pointer" }}>
            ✕
          </button>
        </div>
        <div style={{ padding: "8px 18px 18px" }}>
          <Row label="اللعبة / الباقة" value={`${o.game_name} — ${o.product_name}`} />
          <Row label="معرّف اللاعب" value={o.player_id || "—"} />
          <Row label="هاتف الزبون" value={o.customer_phone || "—"} />
          <Row label="سعر الشراء" value={money(o.paid_price) + " ل.ت"} />
          <Row label="سعر البيع لزبونك" value={money(o.dealer_sell_price) + " ل.ت"} />
          <Row label="ربحك" value={money(o.dealer_profit) + " ل.ت"} />
          <Row label="الحالة" value={o.status_label} />
          <Row label="التاريخ" value={o.created_at} />
          <Row label="رصيدك قبل → بعد"
            value={`${money(o.balance_before)} → ${money(o.balance_after)}`} />
          {o.pin_result ? (
            <div style={{ marginTop: 12, background: "#e7f6ec", border: "1px solid #b6e0c4", borderRadius: 8, padding: "12px 14px" }}>
              <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4 }}>الكود / PIN</div>
              <b style={{ fontSize: 17, letterSpacing: 1, color: "var(--ok)", direction: "ltr", display: "block" }}>{o.pin_result}</b>
            </div>
          ) : o.status === "success" ? (
            <div style={{ marginTop: 12, background: "#e7f6ec", border: "1px solid #b6e0c4", borderRadius: 8, padding: "12px 14px" }}>
              <b style={{ color: "var(--ok)", fontSize: 14 }}>شُحن مباشرةً إلى حساب اللاعب ✓</b>
            </div>
          ) : null}
          {o.dealer_note && (
            <div style={{
              marginTop: 10, fontSize: 13, background: "#fff8e6",
              border: "1px solid #f0dca8", borderRadius: 8, padding: "10px 12px",
            }}>
              <b>ملاحظة الإدارة:</b> {o.dealer_note}
            </div>
          )}
          {o.provider_note && (
            <div style={{ marginTop: 10, fontSize: 13, color: "var(--muted)" }}>
              <b style={{ color: "var(--text)" }}>ملاحظة:</b> {o.provider_note}
            </div>
          )}
          <button type="button" className="btn g" style={{ width: "100%", height: 40, marginTop: 16 }} onClick={onClose}>
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}

/* ===== تقاريري (Oyun Pin Toplam Raporu) ===== */
function ReportsTab() {
  const [data, setData] = useState<any>(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [inclCancelled, setInclCancelled] = useState(false);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    const params: any = {};
    if (from) params.date_from = from;
    if (to) params.date_to = to;
    if (inclCancelled) params.include_cancelled = 1;
    api.get("/store/report/", { params })
      .then((r) => setData(r.data)).finally(() => setLoading(false));
  }
  useEffect(load, []);

  const t = data?.totals;
  return (
    <div>
      <div style={filterBar}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <label style={{ fontSize: 13, color: "var(--muted)" }}>من</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={{ height: 34 }} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <label style={{ fontSize: 13, color: "var(--muted)" }}>إلى</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} style={{ height: 34 }} />
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--muted)" }}>
          <input type="checkbox" checked={inclCancelled} onChange={(e) => setInclCancelled(e.target.checked)} />
          تضمين الملغاة
        </label>
        <button className="btn g" onClick={load}>
          <Icon name="filter" size={14} style={{ marginInlineEnd: 5 }} />تصفية
        </button>
        <button className="btn" onClick={() => { setFrom(""); setTo(""); setInclCancelled(false); setTimeout(load, 0); }}>
          إزالة الفلتر
        </button>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={table}>
          <thead>
            <tr>
              <th style={{ ...th, textAlign: "right", paddingInlineStart: 12 }}>اللعبة</th>
              <th style={{ ...th, textAlign: "right", paddingInlineStart: 12 }}>الباقة</th>
              <th style={th}>العدد</th>
              <th style={th}>الشراء</th>
              <th style={th}>المبيعات</th>
              <th style={th}>الربح</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ padding: 24, textAlign: "center", color: "var(--muted)" }}>جارٍ التحميل...</td></tr>
            ) : !data?.results?.length ? (
              <tr><td colSpan={6} style={{ padding: 24, textAlign: "center", color: "var(--muted)" }}>لا توجد بيانات في هذه الفترة</td></tr>
            ) : data.results.map((r: any, i: number) => (
              <tr key={i}>
                <td style={{ ...td, textAlign: "right", paddingInlineStart: 12, fontWeight: 700 }}>{r.game}</td>
                <td style={{ ...td, textAlign: "right", paddingInlineStart: 12 }}>{r.product}</td>
                <td style={td}>{r.count}</td>
                <td style={td}>{money(r.cost)}</td>
                <td style={td}>{money(r.sell)}</td>
                <td style={{ ...td, color: "var(--ok)", fontWeight: 700 }}>{money(r.profit)}</td>
              </tr>
            ))}
          </tbody>
          {t && data?.results?.length ? (
            <tfoot>
              <tr style={{ background: "#eef4f4", fontWeight: 800 }}>
                <td style={{ ...td, textAlign: "right", paddingInlineStart: 12 }}>الإجمالي — {data.products} منتج</td>
                <td style={td}></td>
                <td style={td}>{t.count}</td>
                <td style={td}>{money(t.cost)}</td>
                <td style={td}>{money(t.sell)}</td>
                <td style={{ ...td, color: "var(--ok)" }}>{money(t.profit)}</td>
              </tr>
            </tfoot>
          ) : null}
        </table>
      </div>
    </div>
  );
}

/* ===== محفظتي (Hesap Hareketleri) ===== */
function WalletTab() {
  const [data, setData] = useState<any>(null);
  useEffect(() => { api.get("/store/wallet/").then((r) => setData(r.data)); }, []);
  if (!data) return <div style={{ padding: 20 }}>جارٍ التحميل...</div>;

  const TYPE_COLOR: Record<string, string> = {
    topup: "var(--ok)", manual_credit: "var(--ok)", refund: "var(--ok)",
    order_debit: "var(--danger)", manual_debit: "var(--danger)", adjustment: "#3b82f6",
  };
  return (
    <div>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 20 }}>
        <Stat icon="wallet" label="رصيدي" value={money(data.balance) + " " + data.currency}
          tone={Number(data.balance) < 0 ? "danger" : "primary"} />
        <Stat icon="card" label="الحد الائتماني" value={money(data.credit_limit) + " " + data.currency} />
        <Stat icon="dollar" label="المتاح للصرف" value={money(data.available) + " " + data.currency} />
      </div>
      <div style={{ fontWeight: 800, margin: "6px 2px 12px", display: "flex", alignItems: "center", gap: 8 }}>
        <Icon name="chart" size={18} />كشف الحركات
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={table}>
          <thead>
            <tr>
              <th style={th}>النوع</th>
              <th style={th}>المبلغ</th>
              <th style={th}>الرصيد بعدها</th>
              <th style={{ ...th, textAlign: "right", paddingInlineStart: 12 }}>ملاحظة</th>
              <th style={th}>التاريخ</th>
            </tr>
          </thead>
          <tbody>
            {data.results.length === 0 ? (
              <tr><td colSpan={5} style={{ padding: 24, textAlign: "center", color: "var(--muted)" }}>لا توجد حركات</td></tr>
            ) : data.results.map((t: any) => (
              <tr key={t.id}>
                <td style={{ ...td, color: TYPE_COLOR[t.type] || "var(--text)", fontWeight: 700 }}>{t.type_label}</td>
                <td style={{ ...td, color: Number(t.amount) < 0 ? "var(--danger)" : "var(--ok)", fontWeight: 700 }}>
                  {money(t.amount)}
                </td>
                <td style={td}>{money(t.balance_after)}</td>
                <td style={{ ...td, textAlign: "right", paddingInlineStart: 12, color: "var(--muted)" }}>{t.note || "—"}</td>
                <td style={{ ...td, color: "var(--muted)", fontSize: 12 }}>{t.created_at}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 14 }}>
        لشحن رصيدك تواصل مع صاحب المتجر — هو من يشحن محافظ الوكلاء.
      </p>
    </div>
  );
}

/* ===== إعداداتي (تغيير كلمة السر) ===== */
function SettingsTab() {
  const { user } = useAuth();
  const [cur, setCur] = useState("");
  const [nw, setNw] = useState("");
  const [nw2, setNw2] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (nw !== nw2) { setMsg({ ok: false, text: "كلمتا السر الجديدتان غير متطابقتين" }); return; }
    setBusy(true);
    try {
      await api.post("/store/change-password/", { current_password: cur, new_password: nw });
      setMsg({ ok: true, text: "تم تغيير كلمة السر بنجاح" });
      setCur(""); setNw(""); setNw2("");
    } catch (e: any) {
      setMsg({ ok: false, text: e?.response?.data?.detail || "فشل تغيير كلمة السر" });
    } finally { setBusy(false); }
  }

  return (
    <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
      <div style={{ ...announce, flex: "1 1 320px" }}>
        <div style={{ fontWeight: 800, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
          <Icon name="user" size={18} />بياناتي
        </div>
        <Row label="الاسم" value={user?.name || "—"} />
        <Row label="رقم الدخول" value={user?.login_id || "—"} />
        <Row label="الدور" value={user?.role_label || "وكيل"} />
      </div>
      <form onSubmit={submit} style={{ ...announce, flex: "1 1 320px" }}>
        <div style={{ fontWeight: 800, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
          <Icon name="settings" size={18} />تغيير كلمة السر
        </div>
        <label style={lbl}>كلمة السر الحالية</label>
        <input style={inp} type="password" value={cur} onChange={(e) => setCur(e.target.value)} />
        <label style={lbl}>كلمة السر الجديدة</label>
        <input style={inp} type="password" value={nw} onChange={(e) => setNw(e.target.value)} />
        <label style={lbl}>تأكيد كلمة السر الجديدة</label>
        <input style={inp} type="password" value={nw2} onChange={(e) => setNw2(e.target.value)} />
        {msg && (
          <div style={{ ...errBox, ...(msg.ok ? { background: "#e7f6ec", borderColor: "#b6e0c4", color: "var(--ok)" } : {}) }}>
            {msg.text}
          </div>
        )}
        <button className="btn g" style={{ width: "100%", height: 40, marginTop: 16 }} disabled={busy}>
          {busy ? "جارٍ..." : "حفظ"}
        </button>
      </form>
    </div>
  );
}
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #eef1f2" }}>
      <span style={{ color: "var(--muted)", fontSize: 14 }}>{label}</span>
      <b style={{ fontSize: 14 }}>{value}</b>
    </div>
  );
}

function BuyModal({ product, requirePlayer, onClose, onBought, onFinish }:
  { product: SProduct; requirePlayer: boolean; onClose: () => void; onBought: () => void; onFinish: () => void }) {
  const [playerId, setPlayerId] = useState("");
  const [phone, setPhone] = useState("");
  const [sellPrice, setSellPrice] = useState("");
  const [done, setDone] = useState<any | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr("");
    try {
      const r = await api.post("/store/buy/", {
        product: product.id, player_id: playerId, customer_phone: phone,
        // فارغ ⇒ يعتمد الخادم سعر التوصية
        dealer_sell_price: sellPrice.trim(),
      });
      setDone(r.data);
      onBought();
    } catch (e: any) {
      setErr(e?.response?.data?.detail || "فشل الشراء");
    } finally { setBusy(false); }
  }

  // بعد إنشاء الطلب: الإغلاق يوجّه تلقائياً إلى قسم "طلباتي"
  function close() {
    onClose();
    if (done) onFinish();
  }

  return (
    <div style={overlay} onClick={close}>
      <form style={modal} onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <div style={{ background: "var(--primary)", color: "#fff", padding: "14px 18px", fontWeight: 700 }}>
          شراء: {product.name}
        </div>
        <div style={{ padding: 20 }}>
          {done ? (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 42 }}>{done.status === "success" ? "✅" : "🕓"}</div>
              <p style={{ margin: "10px 0", fontSize: 16 }}>
                {done.status === "success" ? "تم التنفيذ بنجاح!" : "تم إنشاء الطلب!"}
              </p>
              <p style={{ color: "var(--muted)" }}>رقم الطلب: <b>{done.receipt_no}</b></p>
              {done.pin_result ? (
                <div style={{ marginTop: 12, background: "#e7f6ec", border: "1px solid #b6e0c4", borderRadius: 8, padding: "12px 14px" }}>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4 }}>الكود / PIN</div>
                  <b style={{ fontSize: 18, letterSpacing: 1, color: "var(--ok)", direction: "ltr", display: "block" }}>{done.pin_result}</b>
                </div>
              ) : done.status === "success" ? (
                <div style={{ marginTop: 12, background: "#e7f6ec", border: "1px solid #b6e0c4", borderRadius: 8, padding: "12px 14px" }}>
                  <b style={{ color: "var(--ok)", fontSize: 15 }}>شُحن مباشرةً إلى حساب اللاعب ✓</b>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
                    هذا المنتج يُشحن على معرّف اللاعب مباشرةً — لا كود لإدخاله.
                  </div>
                  {done.provider_note && (
                    <div style={{ fontSize: 12.5, marginTop: 6 }}>{done.provider_note}</div>
                  )}
                </div>
              ) : (
                <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 8 }}>
                  {done.status_label} — ستظهر النتيجة في "طلباتي".
                </p>
              )}
              <button type="button" className="btn g" style={{ marginTop: 14 }} onClick={close}>
                عرض طلباتي ←
              </button>
            </div>
          ) : (
            <>
              <div style={{ fontSize: 14, color: "var(--muted)", marginBottom: 14 }}>
                سعر الشراء: <b style={{ color: "var(--primary-dark)" }}>{money(product.price)} ل.ت</b>
                <span style={{ marginInlineStart: 10 }}>
                  · التوصية: <b>{money(product.recommended_price)} ل.ت</b>
                </span>
              </div>
              {requirePlayer && (
                <>
                  <label style={lbl}>معرّف اللاعب (ID)</label>
                  <input style={inp} value={playerId} onChange={(e) => setPlayerId(e.target.value)} required autoFocus />
                </>
              )}
              <label style={lbl}>رقم الهاتف (اختياري)</label>
              <input style={inp} value={phone} onChange={(e) => setPhone(e.target.value)} />
              <label style={lbl}>سعر بيعك للزبون (اختياري)</label>
              <input style={inp} type="number" step="0.01" min="0" value={sellPrice}
                onChange={(e) => setSellPrice(e.target.value)}
                placeholder={`اتركه فارغاً لاعتماد سعر التوصية ${money(product.recommended_price)}`} />
              {sellPrice.trim() !== "" && (
                <div style={{ fontSize: 12.5, marginTop: 6, color: profitOf(sellPrice, product.price) < 0 ? "var(--danger)" : "var(--ok)" }}>
                  ربحك من هذه العملية: <b>{money(profitOf(sellPrice, product.price))} ل.ت</b>
                </div>
              )}
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
const filterBar: React.CSSProperties = {
  display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap",
  background: "#fff", padding: "12px 16px", borderRadius: 8, marginBottom: 14,
  boxShadow: "0 2px 8px rgba(0,0,0,.06)",
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
const detailsBtn: React.CSSProperties = {
  background: "transparent", border: "1px solid var(--border)", borderRadius: 5,
  color: "var(--primary)", padding: "4px 8px", cursor: "pointer", lineHeight: 1,
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
