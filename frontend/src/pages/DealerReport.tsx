import { useEffect, useState } from "react";
import { api } from "../api";

interface Row { dealer: string; count: number; sell: string; profit: string }
interface Totals { count: string; sell: string; profit: string }

export default function DealerReport({ title, highlight }:
  { title: string; highlight: "profit" | "sell" }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get("/orders/reports/dealers/")
      .then((r) => { setRows(r.data.results); setTotals(r.data.totals); })
      .finally(() => setLoading(false));
  }, [title]);

  const money = (v: string) => Number(v).toLocaleString("en-US", { minimumFractionDigits: 2 });
  const hi = (col: "profit" | "sell") =>
    col === highlight ? { color: "var(--ok)", fontWeight: 700 } : {};

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ fontSize: 20, color: "var(--primary-dark)", marginBottom: 14 }}>{title}</h2>
      <table style={table}>
        <thead>
          <tr>{["الوكيل", "عدد الطلبات", "إجمالي المبيعات", "إجمالي الربح"]
            .map((h) => <th key={h} style={th}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={4} style={{ ...td, padding: 24 }}>جارٍ التحميل...</td></tr>
          ) : rows.length === 0 ? (
            <tr><td colSpan={4} style={{ ...td, padding: 24 }}>لا توجد بيانات</td></tr>
          ) : rows.map((r, i) => (
            <tr key={i} style={{ background: i % 2 ? "var(--row-alt)" : "#fff" }}>
              <td style={{ ...td, textAlign: "right", paddingInlineStart: 12, fontWeight: 600 }}>{r.dealer}</td>
              <td style={td}>{r.count}</td>
              <td style={{ ...td, ...hi("sell") }}>{money(r.sell)}</td>
              <td style={{ ...td, ...hi("profit") }}>{money(r.profit)}</td>
            </tr>
          ))}
        </tbody>
        {totals && (
          <tfoot>
            <tr style={{ background: "#f5c518", fontWeight: 700 }}>
              <td style={td}>المجاميع</td>
              <td style={td}>{totals.count}</td>
              <td style={td}>{money(totals.sell)}</td>
              <td style={td}>{money(totals.profit)}</td>
            </tr>
          </tfoot>
        )}
      </table>
      <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 8 }}>* الطلبات الناجحة فقط.</div>
    </div>
  );
}
const table: React.CSSProperties = {
  width: "100%", borderCollapse: "collapse", background: "var(--surface)", fontSize: 13.5,
};
const th: React.CSSProperties = {
  background: "var(--surface-2)", color: "var(--text)", padding: "11px 10px",
  textAlign: "center", fontWeight: 800, fontSize: 12.5, whiteSpace: "nowrap",
  border: "1px solid var(--border)", borderTop: 0,
};
const td: React.CSSProperties = {
  padding: 10, textAlign: "center", whiteSpace: "nowrap", verticalAlign: "middle",
  background: "var(--surface)", border: "1px solid var(--border)",
  borderBottom: "3px solid var(--row-sep)",
};
