import { useEffect, useState } from "react";
import { api } from "../api";

interface Notif {
  id: number; dealer_name: string; account_title: string; amount: string;
  note: string; status: string; status_label: string; created_at: string;
}

const FILTERS = [
  { key: "pending", label: "قيد المراجعة" },
  { key: "approved", label: "مقبول" },
  { key: "rejected", label: "مرفوض" },
  { key: "all", label: "الكل" },
];
const STATUS_COLOR: Record<string, string> = {
  pending: "#c1900a", approved: "var(--ok)", rejected: "var(--danger)",
};

export default function PaymentTracking() {
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [filter, setFilter] = useState("pending");
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    api.get("/payments/notifications/", { params: { status: filter } })
      .then((r) => setNotifs(r.data.results))
      .finally(() => setLoading(false));
  }
  useEffect(() => load(), [filter]);

  async function decide(id: number, action: "approve" | "reject") {
    await api.post(`/payments/notifications/${id}/${action}/`, {});
    load();
  }

  const money = (v: string) => Number(v).toLocaleString("en-US", { minimumFractionDigits: 2 });

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ fontSize: 20, color: "var(--primary-dark)", marginBottom: 12 }}>
        متابعة الدفع (Ödeme Takip)
      </h2>

      <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        {FILTERS.map((f) => (
          <button key={f.key} onClick={() => setFilter(f.key)} className="btn"
            style={{ background: filter === f.key ? "var(--primary)" : "#8a999e" }}>
            {f.label}
          </button>
        ))}
      </div>

      <table style={table}>
        <thead>
          <tr>
            {["#", "الوكيل", "الحساب", "المبلغ", "ملاحظة", "التاريخ", "الحالة", "إجراء"]
              .map((h) => <th key={h} style={th}>{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={8} style={{ ...td, padding: 24 }}>جارٍ التحميل...</td></tr>
          ) : notifs.length === 0 ? (
            <tr><td colSpan={8} style={{ ...td, padding: 24 }}>لا توجد إشعارات</td></tr>
          ) : notifs.map((n, i) => (
            <tr key={n.id} style={{ background: i % 2 ? "var(--row-alt)" : "#fff" }}>
              <td style={{ ...td, color: "var(--muted)" }}>{n.id}</td>
              <td style={{ ...td, fontWeight: 600 }}>{n.dealer_name}</td>
              <td style={td}>{n.account_title || "—"}</td>
              <td style={{ ...td, fontWeight: 700, color: "var(--primary-dark)" }}>{money(n.amount)}</td>
              <td style={{ ...td, fontSize: 13 }}>{n.note || "—"}</td>
              <td style={{ ...td, fontSize: 13, color: "var(--muted)" }}>{n.created_at}</td>
              <td style={td}>
                <span style={{ color: STATUS_COLOR[n.status], fontWeight: 700 }}>● {n.status_label}</span>
              </td>
              <td style={td}>
                {n.status === "pending" ? (
                  <>
                    <button className="btn g" style={mini} onClick={() => decide(n.id, "approve")}>قبول</button>{" "}
                    <button className="btn r" style={mini} onClick={() => decide(n.id, "reject")}>رفض</button>
                  </>
                ) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={note}>
        عند <b style={{ color: "var(--ok)" }}>قبول</b> إشعار الدفع، يُضاف المبلغ فوراً إلى محفظة الوكيل
        (حركة شحن في دفتر الأستاذ).
      </div>
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
const mini: React.CSSProperties = { height: 26, padding: "0 12px", fontSize: 12 };
const note: React.CSSProperties = {
  background: "#f6f8f9", border: "1px solid #dbe3e5", color: "var(--muted)",
  fontSize: 13, padding: "10px 14px", borderRadius: 6, marginTop: 14,
};
