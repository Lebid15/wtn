import { Fragment, useEffect, useState } from "react";
import { api } from "../api";

interface Cell { price: string; custom: boolean }
interface MatrixProduct {
  id: number; name: string; cost_price: string; recommended_price: string;
  prices: Record<string, Cell>;
}
interface MatrixGame { game_id: number; game_name: string; products: MatrixProduct[] }
interface Group { id: number; name: string }

export default function PriceGroups() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [games, setGames] = useState<MatrixGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<{ p: number; g: number } | null>(null);
  const [draft, setDraft] = useState("");

  function load() {
    setLoading(true);
    api.get("/catalog/price-matrix/")
      .then((r) => { setGroups(r.data.groups); setGames(r.data.games); })
      .finally(() => setLoading(false));
  }
  useEffect(() => load(), []);

  async function createGroup() {
    const name = prompt("اسم مجموعة الأسعار الجديدة:");
    if (!name) return;
    await api.post("/catalog/price-groups/", { name });
    load();
  }

  async function saveCell(productId: number, groupId: number) {
    if (draft.trim() !== "") {
      await api.post("/catalog/set-price/", { product: productId, price_group: groupId, price: draft });
    }
    setEditing(null);
    // تحديث محلي فوري
    setGames((gs) => gs.map((game) => ({
      ...game,
      products: game.products.map((p) =>
        p.id === productId
          ? { ...p, prices: { ...p.prices, [groupId]: { price: draft, custom: true } } }
          : p),
    })));
  }

  const money = (v: string) => Number(v).toLocaleString("en-US", { minimumFractionDigits: 2 });

  if (loading) return <div style={{ padding: 30 }}>جارٍ التحميل...</div>;

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ fontSize: 20, color: "var(--primary-dark)", marginBottom: 12 }}>
        مجموعات الأسعار (Fiyat Grupları)
      </h2>

      {/* شريط الأدوات */}
      <div style={toolbar}>
        <button className="btn g" onClick={createGroup}>➕ إنشاء مجموعة أسعار</button>
        <button className="btn">💱 تعديل سعر الصرف</button>
        <button className="btn">📊 تسعير جماعي</button>
        <button className="btn">🔄 تحديث التكاليف</button>
        <button className="btn r">🗑 حذف مجموعة</button>
      </div>
      <div style={note}>
        اضغط على أي خلية سعر لتعديلها. الخلية <b style={{ color: "var(--primary-dark)" }}>الملوّنة</b> = سعر
        مخصّص، والرمادية = السعر الموصى (افتراضي).
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={table}>
          <thead>
            <tr>
              <th style={{ ...th, width: 50 }}>Id</th>
              <th style={{ ...th, textAlign: "right", paddingInlineStart: 12 }}>المنتج</th>
              <th style={th}>التكلفة</th>
              <th style={th}>الموصى</th>
              {groups.map((g) => (
                <th key={g.id} style={{ ...th, background: "var(--primary)" }}>مجموعة {g.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {games.map((game) => (
              <Fragment key={game.game_id}>
                <tr><td colSpan={4 + groups.length} style={groupHead}>{game.game_name}</td></tr>
                {game.products.map((p, i) => (
                  <tr key={p.id} style={{ background: i % 2 ? "var(--row-alt)" : "#fff" }}>
                    <td style={{ ...td, color: "var(--muted)" }}>{p.id}</td>
                    <td style={{ ...td, textAlign: "right", paddingInlineStart: 12, fontWeight: 600 }}>{p.name}</td>
                    <td style={{ ...td, color: "var(--muted)" }}>{money(p.cost_price)}</td>
                    <td style={td}>{money(p.recommended_price)}</td>
                    {groups.map((g) => {
                      const cell = p.prices[g.id];
                      const isEditing = editing?.p === p.id && editing?.g === g.id;
                      return (
                        <td key={g.id} style={{ ...td, cursor: "pointer",
                          color: cell?.custom ? "var(--primary-dark)" : "var(--muted)",
                          fontWeight: cell?.custom ? 700 : 400 }}
                          onClick={() => { if (!isEditing) { setEditing({ p: p.id, g: g.id }); setDraft(cell?.price ?? ""); } }}>
                          {isEditing ? (
                            <input autoFocus type="number" step="0.01" value={draft}
                              onChange={(e) => setDraft(e.target.value)}
                              onBlur={() => saveCell(p.id, g.id)}
                              onKeyDown={(e) => e.key === "Enter" && saveCell(p.id, g.id)}
                              style={{ width: 80, height: 26 }} />
                          ) : (
                            money(cell?.price ?? "0")
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const toolbar: React.CSSProperties = {
  display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10,
};
const note: React.CSSProperties = {
  background: "#f6f8f9", border: "1px solid #dbe3e5", color: "var(--muted)",
  fontSize: 13, padding: "9px 14px", borderRadius: 6, marginBottom: 14,
};
const table: React.CSSProperties = {
  width: "100%", borderCollapse: "collapse", background: "#fff", fontSize: 14,
};
const th: React.CSSProperties = {
  background: "var(--th-bg)", color: "#fff", padding: "10px 6px",
  textAlign: "center", fontWeight: 600, whiteSpace: "nowrap",
};
const td: React.CSSProperties = {
  padding: "8px 8px", textAlign: "center", borderBottom: "1px solid #edf1f2",
  borderInlineStart: "1px solid #f2f5f6",
};
const groupHead: React.CSSProperties = {
  background: "#f5c518", color: "#4a3c00", fontWeight: 700,
  padding: "7px 14px", textAlign: "right", fontSize: 14,
};
