import { useEffect, useState } from "react";
import { api, type Game, type GameDetail } from "../api";

export default function Games() {
  const [games, setGames] = useState<Game[]>([]);
  const [selected, setSelected] = useState<GameDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/catalog/games/").then((r) => setGames(r.data)).finally(() => setLoading(false));
  }, []);

  function openGame(id: number) {
    api.get(`/catalog/games/${id}/`).then((r) => setSelected(r.data));
  }

  const money = (v: string) => Number(v).toLocaleString("en-US", { minimumFractionDigits: 2 });

  if (loading) return <div style={{ padding: 30 }}>جارٍ التحميل...</div>;

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <h2 style={{ fontSize: 20, color: "var(--primary-dark)" }}>قائمة الألعاب</h2>
        <button className="btn g">➕ إضافة لعبة</button>
        <span style={{ color: "var(--muted)", fontSize: 14 }}>({games.length} لعبة)</span>
      </div>

      {/* شبكة بطاقات الألعاب */}
      <div style={grid}>
        {games.map((g) => (
          <div
            key={g.id}
            style={{ ...card, ...(selected?.id === g.id ? cardActive : {}) }}
            onClick={() => openGame(g.id)}
          >
            <div style={thumb}>{g.image_url ? <img src={g.image_url} style={{ width: "100%" }} /> : "🎮"}</div>
            <div style={{ fontWeight: 700, marginTop: 8 }}>{g.name}</div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 3 }}>
              {g.product_count} منتج
            </div>
            <span style={{ ...pill, ...(g.status === "active" ? pillOk : pillOff) }}>
              {g.status_label}
            </span>
          </div>
        ))}
      </div>

      {/* منتجات اللعبة المختارة */}
      {selected && (
        <div style={{ marginTop: 24 }}>
          <h3 style={{ fontSize: 17, marginBottom: 10 }}>
            منتجات: {selected.name}
            {selected.require_player_id && (
              <span style={{ fontSize: 12, color: "var(--muted)", marginInlineStart: 8 }}>
                (يتطلّب معرّف لاعب)
              </span>
            )}
            <button className="btn g" style={{ marginInlineStart: 12 }}>➕ إضافة منتج</button>
          </h3>
          <table style={table}>
            <thead>
              <tr>
                {["المنتج", "التكلفة", "السعر الموصى", "الربح", "التنفيذ", "الحالة"].map((h) => (
                  <th key={h} style={th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {selected.products.map((p, i) => (
                <tr key={p.id} style={{ background: i % 2 ? "var(--row-alt)" : "#fff" }}>
                  <td style={{ ...td, textAlign: "right", paddingInlineStart: 14, fontWeight: 600 }}>
                    {p.name}
                  </td>
                  <td style={td}>{money(p.cost_price)}</td>
                  <td style={td}>{money(p.recommended_price)}</td>
                  <td style={{ ...td, color: "var(--ok)", fontWeight: 600 }}>{money(p.profit)}</td>
                  <td style={td}>{p.execution_type === "auto" ? "تلقائي" : "يدوي"}</td>
                  <td style={td}>
                    <span style={{ ...pill, ...(p.status === "active" ? pillOk : pillOff) }}>
                      {p.status_label}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const grid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(6, 1fr)",
  gap: 14,
};
const card: React.CSSProperties = {
  background: "#fff",
  border: "1px solid var(--border)",
  borderRadius: 8,
  padding: 14,
  textAlign: "center",
  cursor: "pointer",
};
const cardActive: React.CSSProperties = {
  borderColor: "var(--primary)",
  boxShadow: "0 0 0 2px var(--primary)",
};
const thumb: React.CSSProperties = {
  height: 70,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 40,
  background: "#f2f5f6",
  borderRadius: 6,
};
const pill: React.CSSProperties = {
  display: "inline-block",
  fontSize: 11,
  padding: "2px 9px",
  borderRadius: 9,
  marginTop: 8,
};
const pillOk: React.CSSProperties = { background: "#e4f3ea", color: "var(--ok)" };
const pillOff: React.CSSProperties = { background: "#f7e6e4", color: "var(--danger)" };
const table: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  background: "#fff",
  fontSize: 15,
};
const th: React.CSSProperties = {
  background: "var(--th-bg)",
  color: "#fff",
  padding: "10px 6px",
  textAlign: "center",
  fontWeight: 600,
};
const td: React.CSSProperties = {
  padding: "9px 6px",
  textAlign: "center",
  borderBottom: "1px solid #edf1f2",
};
