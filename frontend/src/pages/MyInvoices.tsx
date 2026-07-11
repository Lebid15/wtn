import { useEffect, useState } from "react";
import { api } from "../api";

/** فواتير اشتراك المتجر (يراها صاحب المتجر — تصدرها المنصّة). */
export default function MyInvoices() {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => { api.get("/invoices/").then((r) => setRows(r.data.results)); }, []);

  return (
    <div>
      <h2 style={{ fontSize: 18, marginBottom: 14 }}>فواتير الاشتراك</h2>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff", fontSize: 13, boxShadow: "0 2px 8px rgba(0,0,0,.06)", borderRadius: 8, overflow: "hidden" }}>
          <thead>
            <tr>
              {["#", "الخطة", "المبلغ", "الفترة", "الحالة", "التاريخ"].map((h) => (
                <th key={h} style={{ background: "var(--primary-dark)", color: "#fff", padding: "10px 8px", fontSize: 12 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: 24, textAlign: "center", color: "var(--muted)" }}>لا فواتير بعد.</td></tr>
            ) : rows.map((i) => (
              <tr key={i.id}>
                <td style={cell}>{i.id}</td>
                <td style={cell}>{i.plan_label}</td>
                <td style={{ ...cell, fontWeight: 700, color: "var(--primary-dark)" }}>{i.amount}</td>
                <td style={{ ...cell, direction: "ltr", fontSize: 12, color: "var(--muted)" }}>{i.period_start} → {i.period_end}</td>
                <td style={cell}>
                  <span style={{ color: i.status === "paid" ? "var(--ok)" : "var(--danger)", fontWeight: 700 }}>● {i.status_label}</span>
                </td>
                <td style={{ ...cell, color: "var(--muted)", fontSize: 12 }}>{i.created_at}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const cell: React.CSSProperties = { padding: "9px 8px", textAlign: "center", borderBottom: "1px solid #eef1f2" };
