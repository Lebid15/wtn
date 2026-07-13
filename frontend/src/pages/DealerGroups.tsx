import { useEffect, useState } from "react";
import { api } from "../api";
import Icon from "../components/Icon";

interface Group { id: number; name: string; dealer_count: number }

export default function DealerGroups() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<number | null>(null);
  const [draft, setDraft] = useState("");

  function load() {
    setLoading(true);
    api.get("/dealer-groups/").then((r) => setGroups(r.data)).finally(() => setLoading(false));
  }
  useEffect(() => load(), []);

  async function addGroup() {
    const name = prompt("اسم مجموعة الوكلاء الجديدة:");
    if (!name) return;
    await api.post("/dealer-groups/", { name });
    load();
  }
  async function saveEdit(id: number) {
    if (draft.trim()) await api.patch(`/dealer-groups/${id}/`, { name: draft });
    setEditing(null);
    load();
  }
  async function remove(id: number) {
    if (!confirm("حذف هذه المجموعة؟")) return;
    await api.delete(`/dealer-groups/${id}/`);
    load();
  }

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
        <h2 style={{ fontSize: 20, color: "var(--primary-dark)" }}>مجموعات الوكلاء (Bayi Grupları)</h2>
        <button className="btn g" onClick={addGroup}><Icon name="plus" size={15} style={{ marginInlineEnd: 5 }} />إضافة مجموعة</button>
      </div>

      <table style={table}>
        <thead>
          <tr>
            <th style={{ ...th, width: 90 }}>رقم المجموعة</th>
            <th style={{ ...th, textAlign: "right", paddingInlineStart: 12 }}>اسم المجموعة</th>
            <th style={{ ...th, width: 120 }}>تعديل</th>
            <th style={{ ...th, width: 90 }}>حذف</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={4} style={{ ...td, padding: 24 }}>جارٍ التحميل...</td></tr>
          ) : groups.length === 0 ? (
            <tr><td colSpan={4} style={{ ...td, padding: 24 }}>لا توجد مجموعات — أضف أول مجموعة</td></tr>
          ) : groups.map((g, i) => (
            <tr key={g.id} style={{ background: i % 2 ? "var(--row-alt)" : "#fff" }}>
              <td style={{ ...td, color: "var(--muted)" }}>{g.id}</td>
              <td style={{ ...td, textAlign: "right", paddingInlineStart: 12, fontWeight: 600 }}>
                {editing === g.id ? (
                  <input autoFocus value={draft} onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && saveEdit(g.id)}
                    onBlur={() => saveEdit(g.id)} style={{ width: 240 }} />
                ) : g.name}
              </td>
              <td style={td}>
                <button className="btn" style={mini} onClick={() => { setEditing(g.id); setDraft(g.name); }}>✏ تعديل</button>
              </td>
              <td style={td}>
                <button className="btn r" style={mini} onClick={() => remove(g.id)}>❌</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

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
const mini: React.CSSProperties = { height: 28, padding: "0 12px", fontSize: 13 };
