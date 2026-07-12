import { Fragment, useEffect, useState } from "react";
import { api, type Order } from "../api";
import Icon from "../components/Icon";

// ألوان أيقونات الألعاب (حين لا توجد صورة)
const GCOLORS = ["#101418,#2c343d", "#5b21b6,#8b5cf6", "#b45309,#f59e0b", "#065f46,#10b981", "#9d174d,#ec4899"];
const gcolor = (name: string) => GCOLORS[(name?.charCodeAt(0) || 0) % GCOLORS.length];
const ginitials = (name: string) => (name || "?").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

const DOT: Record<string, string> = { pending: "wait", processing: "wait", success: "ok", cancelled: "err", stuck: "err" };

interface Opt { id: number; name: string; game?: number }

const EMPTY = { game: "", product: "", dealer: "", provider: "", q: "", phone: "", min: "", max: "", date_from: "", date_to: "", player: "" };

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [status, setStatus] = useState("all");
  const [f, setF] = useState({ ...EMPTY });
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [games, setGames] = useState<Opt[]>([]);
  const [products, setProducts] = useState<Opt[]>([]);
  const [dealers, setDealers] = useState<Opt[]>([]);
  const [providers, setProviders] = useState<Opt[]>([]);

  function load(st = status, filters = f) {
    setLoading(true);
    const params: any = { status: st };
    Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });
    api.get("/orders/", { params }).then((r) => setOrders(r.data.results)).finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    api.get("/catalog/games/").then((r) => setGames(r.data.results || r.data));
    api.get("/catalog/products/").then((r) => setProducts((r.data.results || r.data).map((p: any) => ({ id: p.id, name: p.name, game: p.game }))));
    api.get("/dealers/").then((r) => setDealers(r.data.results));
    api.get("/providers/").then((r) => setProviders(r.data.results || r.data));
  }, []);

  function setStatusAndLoad(st: string) { setStatus(st); load(st); }
  function clearFilters() { setF({ ...EMPTY }); setStatus("all"); load("all", { ...EMPTY }); }

  async function act(id: number, action: "execute" | "cancel") {
    await api.post(`/orders/${id}/${action}/`, {});
    load();
  }

  const money = (v: string) => Number(v).toLocaleString("en-US", { minimumFractionDigits: 2 });
  const set = (k: string, v: string) => setF((old) => ({ ...old, [k]: v }));
  const shownProducts = f.game ? products.filter((p) => String(p.game) === f.game) : products;

  return (
    <div style={{ maxWidth: 1340, margin: "0 auto", padding: "18px 16px 40px" }}>
      {/* ===== لوحة الفلاتر (بنية المرجع: Oyun-Pin İşlemeleri) ===== */}
      <div className="card">
        <div className="card-title">
          <Icon name="filter" size={16} style={{ color: "var(--primary)" }} /> عمليات Oyun-Pin — متابعة الطلبات
          {/* نقاط الفلترة السريعة بالحالة (مثل المرجع) */}
          <span style={{ marginInlineStart: "auto", display: "inline-flex", gap: 6, alignItems: "center" }}>
            {([["all", "#7d8f94", "الكل"], ["pending", "#e8b013", "قيد الانتظار"], ["success", "#35c245", "ناجح"],
               ["cancelled", "#dd4444", "ملغى"], ["stuck", "#8a5a00", "عالق"]] as [string, string, string][]).map(([k, c, t]) => (
              <button key={k} title={t} onClick={() => setStatusAndLoad(k)}
                style={{ ...qdot, background: c, outline: status === k ? "2px solid var(--primary)" : "none" }} />
            ))}
          </span>
        </div>
        <div style={fgrid}>
          <Field label="اللعبة">
            <select value={f.game} onChange={(e) => setF((o) => ({ ...o, game: e.target.value, product: "" }))} style={inp}>
              <option value="">اختر من فضلك</option>
              {games.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </Field>
          <Field label="المنتج">
            <select value={f.product} onChange={(e) => set("product", e.target.value)} style={inp}>
              <option value="">اختر من فضلك</option>
              {shownProducts.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
          <Field label="الوكيل">
            <select value={f.dealer} onChange={(e) => set("dealer", e.target.value)} style={inp}>
              <option value="">اختر من فضلك</option>
              {dealers.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </Field>
          <Field label="API">
            <select value={f.provider} onChange={(e) => set("provider", e.target.value)} style={inp}>
              <option value="">اختر من فضلك</option>
              {providers.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
          <Field label="رقم الفيش"><input value={f.q} onChange={(e) => set("q", e.target.value)} style={inp} /></Field>
          <Field label="هاتف المشترك"><input value={f.phone} onChange={(e) => set("phone", e.target.value)} style={inp} /></Field>
          <Field label="أقل مبلغ"><input type="number" value={f.min} onChange={(e) => set("min", e.target.value)} style={inp} /></Field>
          <Field label="أعلى مبلغ"><input type="number" value={f.max} onChange={(e) => set("max", e.target.value)} style={inp} /></Field>
          <Field label="تاريخ العملية (من / إلى)">
            <div style={{ display: "flex", gap: 6 }}>
              <input type="date" value={f.date_from} onChange={(e) => set("date_from", e.target.value)} style={{ ...inp, flex: 1 }} />
              <input type="date" value={f.date_to} onChange={(e) => set("date_to", e.target.value)} style={{ ...inp, flex: 1 }} />
            </div>
          </Field>
          <Field label="معرّف اللاعب"><input value={f.player} onChange={(e) => set("player", e.target.value)} style={inp} /></Field>
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end", gridColumn: "span 2" }}>
            <button className="btn g" style={{ height: 36, flex: 1 }} onClick={() => load()}>
              <Icon name="filter" size={14} style={{ marginInlineEnd: 5, verticalAlign: -2 }} />فلترة
            </button>
            <button className="btn r" style={{ height: 36, flex: 1 }} onClick={clearFilters}>إزالة الفلتر</button>
          </div>
        </div>
      </div>

      {/* ===== الجدول (أعمدة المرجع الـ13 + إجراء) — النمط المعتمد ===== */}
      <div className="card">
        <div className="table-scroll">
          <table className="grid">
            <thead>
              <tr>
                <th><input type="checkbox" title="تحديد الكل" /></th>
                <th>اللعبة</th>
                <th>رقم الفيش</th>
                <th>الوكيل</th>
                <th className="cell-start">اسم المنتج</th>
                <th>هاتف الزبون / معرّف اللاعب</th>
                <th>الشراء</th>
                <th>البيع</th>
                <th>الربح</th>
                <th>حالة العملية</th>
                <th>طباعة / SMS</th>
                <th>API</th>
                <th>الانتظار</th>
                <th>إجراء</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={14} style={{ padding: 26, color: "var(--muted)" }}>جارٍ التحميل...</td></tr>
              ) : orders.length === 0 ? (
                <tr><td colSpan={14} style={{ padding: 26, color: "var(--muted)" }}>لا توجد طلبات</td></tr>
              ) : orders.map((o) => (
                <Fragment key={o.id}>
                  <tr>
                    <td><input type="checkbox" /></td>
                    <td><span className="gicon" style={{ background: `linear-gradient(135deg,${gcolor(o.game_name)})` }}>{ginitials(o.game_name)}</span></td>
                    <td className="num" style={{ color: "var(--primary-dark)", fontWeight: 700, cursor: "pointer" }}
                      onClick={() => setExpanded(expanded === o.id ? null : o.id)} title="عرض التفاصيل">
                      {o.receipt_no}
                    </td>
                    <td>{o.dealer_name}</td>
                    <td className="cell-start" style={{ fontWeight: 600 }}>{o.product_name}</td>
                    <td className="num" style={{ lineHeight: 1.35 }}>
                      {o.customer_phone || "—"}<br />
                      <span style={{ color: "var(--faint)" }}>{o.player_id || "—"}</span>
                    </td>
                    <td className="buy num">{money(o.cost_price)} ل.ت</td>
                    <td className="sell num">{money(o.sell_price)} ل.ت</td>
                    <td className="profit num">{money(o.profit)} ل.ت</td>
                    <td><span className={`stdot ${DOT[o.status] || "wait"}`} title={o.status_label} /></td>
                    <td>
                      <div style={{ display: "flex", gap: 4, justifyContent: "center" }}>
                        <MiniBtn name="print" title="طباعة" />
                        <MiniBtn name="chat" title="إرسال SMS" />
                      </div>
                    </td>
                    <td style={{ color: "var(--muted)" }}>{o.provider_name || "—"}</td>
                    <td style={{ color: "var(--muted)", fontSize: 12.5 }}>
                      {o.status === "success" ? "مكتمل" : o.status === "cancelled" ? "ملغى" : o.created_at.split(" ")[1] || "—"}
                    </td>
                    <td>
                      {o.status === "pending" || o.status === "stuck" ? (
                        <div style={{ display: "flex", gap: 4, justifyContent: "center" }}>
                          <MiniBtn name="check" color="var(--ok)" title="تنفيذ" onClick={() => act(o.id, "execute")} />
                          <MiniBtn name="x" color="var(--danger)" title="إلغاء" onClick={() => act(o.id, "cancel")} />
                        </div>
                      ) : "—"}
                    </td>
                  </tr>
                  {expanded === o.id && (
                    <tr>
                      <td colSpan={14} className="cell-start" style={{ background: "var(--surface-2)", fontSize: 13 }}>
                        <b>تفاصيل الطلب:</b>{" "}
                        التاريخ: {o.created_at} · الرصيد قبل: {money(o.balance_before)} → بعد: {money(o.balance_after)}
                        {o.pin_result && <> · <b style={{ color: "var(--ok)" }}>PIN: {o.pin_result}</b></>}
                        {o.api_response && <> · رد النظام: {o.api_response}</>}
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 12.5, color: "var(--muted)", fontWeight: 700, marginBottom: 4 }}>{label}</div>
      {children}
    </div>
  );
}

function MiniBtn({ name, title, color = "var(--muted)", onClick }:
  { name: string; title: string; color?: string; onClick?: () => void }) {
  return (
    <button onClick={onClick} title={title} style={{
      border: "1px solid var(--border)", background: "var(--surface)", color,
      width: 28, height: 28, borderRadius: 7, display: "inline-flex",
      alignItems: "center", justifyContent: "center", cursor: "pointer",
    }}>
      <Icon name={name} size={14} />
    </button>
  );
}

const fgrid: React.CSSProperties = {
  display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px 16px", padding: 16,
};
const inp: React.CSSProperties = { width: "100%", height: 36, borderRadius: 8 };
const qdot: React.CSSProperties = {
  width: 16, height: 16, borderRadius: "50%", border: "1px solid rgba(0,0,0,.15)",
  cursor: "pointer", boxShadow: "inset 0 -2px 3px rgba(0,0,0,.2)",
};
