import { useEffect, useState } from "react";
import { api } from "../api";
import Icon from "../components/Icon";

interface Pool {
  id: number; name: string; description: string; provider_name: string;
  status: string; status_label: string; created_at: string;
  total_cost: string; pin_count: number; available_count: number;
}

export default function Pool() {
  const [pools, setPools] = useState<Pool[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", description: "" });

  function load() {
    setLoading(true);
    api.get("/pool/").then((r) => setPools(r.data)).finally(() => setLoading(false));
  }
  useEffect(() => load(), []);

  async function addGroup(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name) return;
    await api.post("/pool/", form);
    setForm({ name: "", description: "" });
    load();
  }

  const money = (v: string) => Number(v).toLocaleString("en-US", { minimumFractionDigits: 2 });
  const totalCost = pools.reduce((s, p) => s + Number(p.total_cost), 0);

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ fontSize: 20, color: "var(--primary-dark)", marginBottom: 14 }}>
        بنك الأكواد (Havuz Apileri Takip)
      </h2>

      {/* نموذج إنشاء مجموعة */}
      <form onSubmit={addGroup} style={createBar}>
        <div>
          <div style={lbl}>اسم المجموعة</div>
          <input style={{ width: 180 }} value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div>
          <div style={lbl}>وصف المجموعة</div>
          <input style={{ width: 240 }} value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <button className="btn g" style={{ height: 32 }}><Icon name="plus" size={15} style={{ marginInlineEnd: 5 }} />إضافة</button>
        <button type="button" className="btn"><Icon name="refresh" size={15} style={{ marginInlineEnd: 5 }} />إرسال/استلام بينات</button>
        <button type="button" className="btn"><Icon name="chart" size={15} style={{ marginInlineEnd: 5 }} />بيناتي</button>
      </form>

      {/* جدول المجموعات */}
      <table style={table}>
        <thead>
          <tr>
            {["ID", "اسم المجموعة", "الوصف", "التكلفة الإجمالية", "البينات", "المزوّد",
              "تاريخ الإنشاء", "الحالة", "إجراء"].map((h) => <th key={h} style={th}>{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={9} style={{ ...td, padding: 24 }}>جارٍ التحميل...</td></tr>
          ) : pools.length === 0 ? (
            <tr><td colSpan={9} style={{ ...td, padding: 24 }}>لا توجد مجموعات</td></tr>
          ) : pools.map((p, i) => (
            <tr key={p.id} style={{ background: i % 2 ? "var(--row-alt)" : "#fff" }}>
              <td style={{ ...td, color: "var(--muted)" }}>{p.id}</td>
              <td style={{ ...td, textAlign: "right", paddingInlineStart: 12, fontWeight: 600, color: "var(--primary-dark)" }}>{p.name}</td>
              <td style={td}>{p.description || "—"}</td>
              <td style={{ ...td, fontWeight: 600 }}>{money(p.total_cost)}</td>
              <td style={td}>
                <span style={{ color: p.available_count > 0 ? "var(--ok)" : "var(--muted)" }}>
                  {p.available_count}</span> / {p.pin_count}
              </td>
              <td style={{ ...td, fontSize: 13 }}>{p.provider_name || "—"}</td>
              <td style={{ ...td, fontSize: 13, color: "var(--muted)" }}>{p.created_at}</td>
              <td style={td}>
                <span style={{ color: p.status === "active" ? "var(--ok)" : "var(--danger)", fontWeight: 600 }}>
                  {p.status_label}
                </span>
              </td>
              <td style={td}>
                <div style={{ display: "flex", gap: 4, justifyContent: "center", color: "var(--muted)" }}>
                  <Icon name="edit" size={15} /><Icon name="wrench" size={15} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr style={{ background: "#eef4f5", fontWeight: 700 }}>
            <td style={td} colSpan={3}>التكلفة الإجمالية</td>
            <td style={td}>{money(String(totalCost))}</td>
            <td style={td} colSpan={5}></td>
          </tr>
        </tfoot>
      </table>

      {/* قسم المبيعات الجماعية غير المكتملة */}
      <div style={{ ...panelHead, marginTop: 24 }}>المبيعات الجماعية غير المكتملة</div>
      <table style={table}>
        <thead>
          <tr>
            {["ID", "الوكيل", "اللعبة", "المنتج", "الكمية", "المبلغ الإجمالي", "التاريخ", "إجراء"]
              .map((h) => <th key={h} style={th}>{h}</th>)}
          </tr>
        </thead>
        <tbody>
          <tr><td colSpan={8} style={{ ...td, padding: 22, color: "var(--muted)" }}>لا توجد مبيعات جماعية معلّقة</td></tr>
        </tbody>
      </table>
    </div>
  );
}

const createBar: React.CSSProperties = {
  display: "flex", gap: 12, alignItems: "end", flexWrap: "wrap",
  background: "#f2f5f6", padding: "14px 16px", borderRadius: 6, marginBottom: 16,
};
const lbl: React.CSSProperties = { fontSize: 12, color: "var(--muted)", marginBottom: 4 };
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
const panelHead: React.CSSProperties = {
  background: "var(--primary)", color: "#fff", padding: "10px 18px",
  fontSize: 15, fontWeight: 700, borderRadius: "6px 6px 0 0",
};
