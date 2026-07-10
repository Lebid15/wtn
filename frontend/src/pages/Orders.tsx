import { Fragment, useEffect, useState } from "react";
import { api, type Order } from "../api";

const FILTERS = [
  { key: "all", label: "الكل" },
  { key: "pending", label: "قيد الانتظار" },
  { key: "success", label: "ناجح" },
  { key: "cancelled", label: "ملغى" },
  { key: "stuck", label: "عالق" },
];
const STATUS_COLOR: Record<string, string> = {
  pending: "#c1900a", processing: "#2c5f9e", success: "var(--ok)",
  cancelled: "var(--danger)", stuck: "#8a4a00",
};

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);

  function load() {
    setLoading(true);
    api.get("/orders/", { params: { status: filter, q } })
      .then((r) => setOrders(r.data.results))
      .finally(() => setLoading(false));
  }
  useEffect(() => load(), [filter]);

  async function act(id: number, action: "execute" | "cancel") {
    await api.post(`/orders/${id}/${action}/`, {});
    load();
  }

  const money = (v: string) => Number(v).toLocaleString("en-US", { minimumFractionDigits: 2 });

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ fontSize: 20, color: "var(--primary-dark)", marginBottom: 12 }}>
        متابعة الطلبات (Oyun-Pin Takip)
      </h2>

      {/* أزرار الفلترة السريعة */}
      <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
        {FILTERS.map((f) => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={filter === f.key ? "btn" : "btn"}
            style={{ background: filter === f.key ? "var(--primary)" : "#8a999e" }}>
            {f.label}
          </button>
        ))}
        <input placeholder="بحث برقم الفاتورة..." value={q}
          onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && load()}
          style={{ width: 220, marginInlineStart: "auto" }} />
        <button className="btn g" onClick={load}>بحث</button>
      </div>

      <table style={table}>
        <thead>
          <tr>
            {["رقم الفاتورة", "الوكيل", "المنتج", "العميل/اللاعب", "التكلفة", "البيع",
              "الربح", "الحالة", "المزوّد", "إجراء"].map((h) => <th key={h} style={th}>{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={10} style={{ ...td, padding: 26 }}>جارٍ التحميل...</td></tr>
          ) : orders.length === 0 ? (
            <tr><td colSpan={10} style={{ ...td, padding: 26 }}>لا توجد طلبات</td></tr>
          ) : orders.map((o, i) => (
            <Fragment key={o.id}>
              <tr style={{ background: i % 2 ? "var(--row-alt)" : "#fff" }}>
                <td style={{ ...td, cursor: "pointer", color: "var(--primary-dark)", fontWeight: 600 }}
                  onClick={() => setExpanded(expanded === o.id ? null : o.id)}>
                  {o.receipt_no}
                </td>
                <td style={td}>{o.dealer_name}</td>
                <td style={{ ...td, textAlign: "right", paddingInlineStart: 10 }}>
                  <div style={{ fontWeight: 600 }}>{o.product_name}</div>
                  <div style={{ fontSize: 11, color: "var(--muted)" }}>{o.game_name}</div>
                </td>
                <td style={{ ...td, fontSize: 13 }}>{o.player_id || o.customer_phone || "—"}</td>
                <td style={{ ...td, color: "var(--muted)" }}>{money(o.cost_price)}</td>
                <td style={{ ...td, fontWeight: 600 }}>{money(o.sell_price)}</td>
                <td style={{ ...td, color: "var(--ok)", fontWeight: 600 }}>{money(o.profit)}</td>
                <td style={td}>
                  <span style={{ color: STATUS_COLOR[o.status], fontWeight: 700 }}>● {o.status_label}</span>
                </td>
                <td style={{ ...td, fontSize: 13 }}>{o.provider_name || "—"}</td>
                <td style={td}>
                  {o.status === "pending" || o.status === "stuck" ? (
                    <>
                      <button className="btn g" style={miniBtn} onClick={() => act(o.id, "execute")}>تنفيذ</button>{" "}
                      <button className="btn r" style={miniBtn} onClick={() => act(o.id, "cancel")}>إلغاء</button>
                    </>
                  ) : "—"}
                </td>
              </tr>
              {expanded === o.id && (
                <tr>
                  <td colSpan={10} style={detailCell}>
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
  );
}

const table: React.CSSProperties = {
  width: "100%", borderCollapse: "collapse", background: "#fff", fontSize: 14,
};
const th: React.CSSProperties = {
  background: "var(--th-bg)", color: "#fff", padding: "10px 6px",
  textAlign: "center", fontWeight: 600, whiteSpace: "nowrap",
};
const td: React.CSSProperties = {
  padding: "8px 6px", textAlign: "center", borderBottom: "1px solid #edf1f2",
};
const miniBtn: React.CSSProperties = { height: 26, padding: "0 10px", fontSize: 12 };
const detailCell: React.CSSProperties = {
  padding: "10px 16px", background: "#f6f8f9", borderBottom: "2px solid var(--primary)",
  fontSize: 13, textAlign: "right", color: "var(--text)",
};
