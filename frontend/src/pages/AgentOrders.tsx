import { useEffect, useState } from "react";
import { api } from "../api";
import Icon from "../components/Icon";
import { symbolOf } from "../currency";

const STATUSES: [string, string][] = [
  ["all", "الكل"], ["success", "ناجح"], ["pending", "قيد الانتظار"],
  ["processing", "قيد التنفيذ"], ["cancelled", "ملغى"],
];

/**
 * طلبات دكاكين الوكيل الكبير.
 *
 * ليست طلباته هو — هو لا يشحن من الموقع. هذه ما اشتراه دكاكينه منه: بكم دفعوا
 * وكم ربح هو من كل طلب.
 */
export default function AgentOrders() {
  const [rows, setRows] = useState<any[]>([]);
  const [cur, setCur] = useState("");
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get("/agent/orders/", { params: { status } })
      .then((r) => { setRows(r.data.results || []); setCur(r.data.currency || ""); })
      .finally(() => setLoading(false));
  }, [status]);

  const money = (v: string) => Number(v).toLocaleString("en-US", { minimumFractionDigits: 2 });
  const sym = symbolOf(cur);
  const totalProfit = rows.reduce((s, o) => s + Number(o.profit || 0), 0);

  const tone = (s: string) =>
    s === "success" ? "var(--ok)" : s === "cancelled" ? "var(--danger)" : "var(--muted)";

  return (
    <div style={{ maxWidth: 1320, margin: "0 auto", padding: "22px 20px 40px" }}>
      <div className="toolbar">
        <div className="segment">
          {STATUSES.map(([k, label]) => (
            <button key={k} className={status === k ? "active" : ""} onClick={() => setStatus(k)}>
              {label}
            </button>
          ))}
        </div>
        <span style={{ marginInlineStart: "auto", color: "var(--muted)", fontSize: 13 }}>
          العدد: <b style={{ color: "var(--text)" }}>{rows.length}</b>
          <span style={{ marginInlineStart: 14 }}>
            ربحي منها: <b className="num bal-pos">{money(String(totalProfit))} {sym}</b>
          </span>
        </span>
      </div>

      <div className="card">
        <div className="card-title">
          <Icon name="chart" size={16} style={{ color: "var(--primary)" }} /> طلبات وكلائي
        </div>
        <div className="table-scroll">
          <table className="grid">
            <thead>
              <tr>
                <th>رقم الإيصال</th>
                <th className="cell-start">الدكان</th>
                <th className="cell-start">الباقة</th>
                <th>اللعبة</th>
                <th>دفع لي</th>
                <th>ربحي</th>
                <th>الحالة</th>
                <th>التاريخ</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ padding: 30, color: "var(--muted)" }}>جارٍ التحميل...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={8} style={{ padding: 30, color: "var(--muted)" }}>لا طلبات مطابقة</td></tr>
              ) : rows.map((o) => (
                <tr key={o.id}>
                  <td className="num" style={{ color: "var(--faint)", fontSize: 12.5 }}>{o.receipt_no}</td>
                  <td className="cell-start" style={{ fontWeight: 700 }}>{o.dealer_name}</td>
                  <td className="cell-start">{o.product_name}</td>
                  <td style={{ color: "var(--muted)", fontSize: 13 }}>{o.game_name}</td>
                  <td className="num">{money(o.sell_price)} <small style={{ color: "var(--faint)" }}>{sym}</small></td>
                  <td className="num bal-pos" style={{ fontWeight: 700 }}>{money(o.profit)}</td>
                  <td style={{ color: tone(o.status), fontWeight: 700, fontSize: 12.5 }}>{o.status_label}</td>
                  <td style={{ color: "var(--muted)", fontSize: 12.5 }}>{o.created_at}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
