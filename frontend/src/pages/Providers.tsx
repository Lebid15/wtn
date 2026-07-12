import { useEffect, useState } from "react";
import { api, type Provider } from "../api";
import Icon from "../components/Icon";

export default function Providers() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [totals, setTotals] = useState<{ real_balance: string; balance: string; debt: string } | null>(null);
  const [showPassive, setShowPassive] = useState(false);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    Promise.all([
      api.get("/providers/", { params: showPassive ? { status: "passive" } : {} }),
      api.get("/providers/totals/"),
    ]).then(([p, t]) => { setProviders(p.data); setTotals(t.data); })
      .finally(() => setLoading(false));
  }
  useEffect(() => load(), [showPassive]);

  const money = (v: string) => Number(v).toLocaleString("en-US", { minimumFractionDigits: 2 }) + " ل.ت";
  const typeColor: Record<string, string> = {
    same_system: "var(--primary)", pool: "#c1692a", card_store: "#33454a", loader: "var(--primary-dark)",
  };

  if (loading) return <div style={{ padding: 30 }}>جارٍ التحميل...</div>;

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
        <h2 style={{ fontSize: 20, color: "var(--primary-dark)" }}>مزوّدو API (Oyun Apileri)</h2>
        <button className="btn g">➕ إضافة مزوّد</button>
        <button className={showPassive ? "btn" : "btn r"} onClick={() => setShowPassive((v) => !v)}>
          {showPassive ? "عرض النشطة" : "⏸ المعطّلة"}
        </button>
      </div>

      <table style={table}>
        <thead>
          <tr>
            <th style={{ ...th, textAlign: "right", paddingInlineStart: 12 }}>اسم المزوّد</th>
            <th style={th}>النوع</th>
            <th style={th}>الحالة</th>
            <th style={th}>طلبات معلّقة</th>
            <th style={th}>الرصيد الفعلي</th>
            <th style={th}>الرصيد</th>
            <th style={th}>الدين</th>
            <th style={th}>إجراءات</th>
          </tr>
        </thead>
        <tbody>
          {providers.map((p, i) => (
            <tr key={p.id} style={{ background: i % 2 ? "var(--row-alt)" : "#fff" }}>
              <td style={{ ...td, textAlign: "right", paddingInlineStart: 12, fontWeight: 600 }}>{p.name}</td>
              <td style={{ ...td, color: typeColor[p.type], fontWeight: 600 }}>{p.type_label}</td>
              <td style={td}>
                <span style={{
                  display: "inline-block", width: 11, height: 11, borderRadius: "50%",
                  background: p.status === "active" ? "var(--ok)" : "var(--danger)",
                }} />
              </td>
              <td style={{ ...td, color: "var(--muted)" }}>0 طلب · 0.00</td>
              <td style={{ ...td, fontWeight: 600 }}>{money(p.real_balance)}</td>
              <td style={td}>{money(p.balance)}</td>
              <td style={{ ...td, color: Number(p.debt) > 0 ? "var(--danger)" : "var(--muted)" }}>
                {money(p.debt)}
              </td>
              <td style={td}>
                <div style={{ display: "flex", gap: 4, justifyContent: "center", color: "var(--muted)" }}>
                  <Icon name="settings" size={15} /><Icon name="edit" size={15} />
                  <Icon name="card" size={15} /><Icon name="chart" size={15} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
        {totals && (
          <tfoot>
            <tr style={{ background: "#f5c518", fontWeight: 700 }}>
              <td style={{ ...td, textAlign: "right", paddingInlineStart: 12 }} colSpan={4}>المجاميع</td>
              <td style={td}>{money(totals.real_balance)}</td>
              <td style={td}>{money(totals.balance)}</td>
              <td style={td}>{money(totals.debt)}</td>
              <td style={td}></td>
            </tr>
          </tfoot>
        )}
      </table>

      <div style={note}>
        أنواع المزوّدين: <b>نفس النظام</b> (ربط لوحة أخرى) · <b>متجر بطاقات</b> (مزوّد خارجي)
        · <b>بنك البينات</b> (مخزون داخلي) · <b>منفّذ يدوي</b> (بشري). التوجيه بثلاثة
        مستويات (رئيسي + بديلين) يُربط من صفحة قائمة المنتجات.
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
const note: React.CSSProperties = {
  background: "#f6f8f9", border: "1px solid #dbe3e5", color: "var(--muted)",
  fontSize: 13, padding: "10px 14px", borderRadius: 6, marginTop: 14, lineHeight: 1.8,
};
