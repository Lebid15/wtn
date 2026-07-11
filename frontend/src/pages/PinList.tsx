import { Fragment, useEffect, useMemo, useState } from "react";
import { api, type Product } from "../api";

export default function PinList() {
  const [products, setProducts] = useState<Product[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/catalog/products/").then((r) => setProducts(r.data)).finally(() => setLoading(false));
  }, []);

  // تجميع المنتجات حسب اللعبة (رؤوس صفراء)
  const grouped = useMemo(() => {
    const filtered = q
      ? products.filter((p) => p.name.includes(q) || p.game_name.includes(q))
      : products;
    const map = new Map<string, Product[]>();
    for (const p of filtered) {
      if (!map.has(p.game_name)) map.set(p.game_name, []);
      map.get(p.game_name)!.push(p);
    }
    return [...map.entries()];
  }, [products, q]);

  const money = (v: string) => Number(v).toLocaleString("en-US", { minimumFractionDigits: 2 });

  if (loading) return <div style={{ padding: 30 }}>جارٍ التحميل...</div>;

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
        <h2 style={{ fontSize: 20, color: "var(--primary-dark)" }}>قائمة المنتجات (Pin Listesi)</h2>
        <input placeholder="بحث..." value={q} onChange={(e) => setQ(e.target.value)} style={{ width: 240, marginInlineStart: "auto" }} />
      </div>

      <table style={table}>
        <thead>
          <tr>
            <th style={{ ...th, width: 60 }}>ID</th>
            <th style={{ ...th, textAlign: "right", paddingInlineStart: 12 }}>اسم المنتج</th>
            <th style={th}>التكلفة</th>
            <th style={th}>الموصى</th>
            <th style={th}>API الرئيسي</th>
            <th style={th}>API 1 (بديل)</th>
            <th style={th}>API 2 (بديل)</th>
          </tr>
        </thead>
        <tbody>
          {grouped.map(([game, items]) => (
            <Fragment key={game}>
              <tr>
                <td colSpan={7} style={groupHead}>{game}</td>
              </tr>
              {items.map((p, i) => (
                <tr key={p.id} style={{ background: i % 2 ? "var(--row-alt)" : "#fff" }}>
                  <td style={{ ...td, color: "var(--muted)" }}>{p.id}</td>
                  <td style={{ ...td, textAlign: "right", paddingInlineStart: 12, fontWeight: 600 }}>
                    {p.status === "active" && <span style={{ color: "var(--ok)" }}>✔ </span>}
                    {p.name}
                  </td>
                  <td style={td}>{money(p.cost_price)}</td>
                  <td style={td}>{money(p.recommended_price)}</td>
                  <td style={td}><ApiSelect /></td>
                  <td style={td}><ApiSelect fallback /></td>
                  <td style={td}><ApiSelect fallback /></td>
                </tr>
              ))}
            </Fragment>
          ))}
        </tbody>
      </table>

      <div style={note}>
        ملاحظة: أعمدة الـ API (توجيه بثلاثة مستويات: رئيسي + بديلين) ستُفعّل عند بناء
        قسم <b>مزوّدي API</b> — حالياً معطّلة كعنصر نائب مطابق للمرجع.
      </div>
    </div>
  );
}

function ApiSelect({ fallback = false }: { fallback?: boolean }) {
  return (
    <select disabled style={{ width: 150, opacity: 0.6 }}>
      <option>{fallback ? "بديل مغلق" : "— اختر —"}</option>
    </select>
  );
}

const table: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  background: "#fff",
  fontSize: 14,
};
const th: React.CSSProperties = {
  background: "var(--th-bg)",
  color: "#fff",
  padding: "10px 6px",
  textAlign: "center",
  fontWeight: 600,
};
const td: React.CSSProperties = {
  padding: "8px 6px",
  textAlign: "center",
  borderBottom: "1px solid #edf1f2",
};
const groupHead: React.CSSProperties = {
  background: "#f5c518",
  color: "#4a3c00",
  fontWeight: 700,
  padding: "7px 14px",
  textAlign: "right",
  fontSize: 14,
};
const note: React.CSSProperties = {
  background: "#f6f8f9",
  border: "1px solid #dbe3e5",
  color: "var(--muted)",
  fontSize: 13,
  padding: "10px 14px",
  borderRadius: 6,
  marginTop: 14,
};
