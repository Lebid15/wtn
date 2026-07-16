import { Fragment, useEffect, useMemo, useState } from "react";
import { api, type Product, type Provider } from "../api";

export default function PinList() {
  const [products, setProducts] = useState<Product[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get("/catalog/products/"),
      api.get("/providers/", { params: { status: "active" } }),
    ]).then(([pr, pv]) => { setProducts(pr.data); setProviders(pv.data); })
      .finally(() => setLoading(false));
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

  // حفظ توجيه المنتج فوراً (المزوّد الرئيسي/البديلان/معرّف الباقة)
  async function patch(id: number, field: string, value: string) {
    const body: any = { [field]: field === "provider_package_id" ? value : (value || null) };
    const r = await api.patch(`/catalog/products/${id}/`, body);
    setProducts((ps) => ps.map((x) => (x.id === id ? { ...x, ...r.data } : x)));
  }

  if (loading) return <div style={{ padding: 30 }}>جارٍ التحميل...</div>;

  return (
    <div style={{ maxWidth: 1340, margin: "0 auto", padding: "18px 16px 40px" }}>
      <div className="card">
        <div className="card-title">
          توجيه الباقات (Pin Listesi)
          <span style={{ fontWeight: 400, fontSize: 12, color: "var(--debt)" }}>
            ** اسحب صفّ المنتج وأفلته لترتيب ما يراه وكلاؤك
          </span>
          <div style={{ position: "relative", marginInlineStart: "auto" }}>
            <input placeholder="بحث..." value={q} onChange={(e) => setQ(e.target.value)}
              style={{ width: 240, height: 34, borderRadius: 8 }} />
          </div>
        </div>
        <div className="table-scroll">
          <table className="grid">
            <thead>
              <tr>
                <th style={{ width: 34 }}><input type="checkbox" title="تحديد الكل" /></th>
                <th style={{ width: 60 }}>ID</th>
                <th className="cell-start">اسم المنتج</th>
                <th>سعر الشراء</th>
                <th>الموصى</th>
                <th>API القابلة للإرسال</th>
                <th>API 1</th>
                <th>API 2</th>
              </tr>
            </thead>
            <tbody>
              {grouped.map(([game, items]) => (
                <Fragment key={game}>
                  <tr>
                    <td colSpan={8} style={groupHead}>{game}</td>
                  </tr>
                  {items.map((p) => (
                    <tr key={p.id}>
                      <td><input type="checkbox" /></td>
                      <td className="num" style={{ color: "var(--faint)" }}>{p.id}</td>
                      <td className="cell-start" style={{ fontWeight: 600 }}>
                        {p.status === "active" && <span style={{ color: "var(--ok)" }}>✔ </span>}
                        {p.name}
                      </td>
                      <td className="buy num">{money(p.cost_price)}</td>
                      <td className="sell num">{money(p.recommended_price)}</td>
                      <td>
                        <ApiSelect providers={providers} value={p.provider} onPick={(v) => patch(p.id, "provider", v)} />
                        <input defaultValue={p.provider_package_id}
                          onBlur={(e) => e.target.value !== p.provider_package_id && patch(p.id, "provider_package_id", e.target.value)}
                          placeholder="معرّف الباقة لدى المزوّد"
                          style={{ width: 150, height: 26, fontSize: 11, marginTop: 4, borderRadius: 6 }} />
                      </td>
                      <td><ApiSelect providers={providers} fallback value={p.provider_alt1} onPick={(v) => patch(p.id, "provider_alt1", v)} /></td>
                      <td><ApiSelect providers={providers} fallback value={p.provider_alt2} onPick={(v) => patch(p.id, "provider_alt2", v)} /></td>
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={note}>
        توجيه بثلاثة مستويات: يُرسل الطلب للمزوّد الرئيسي، وعند فشله يُجرّب البديل الأول
        ثم الثاني تلقائياً. المزوّدون تُدارون من قسم <b>مزوّدي API</b>.
      </div>
    </div>
  );
}

function ApiSelect({ providers, fallback = false, value, onPick }:
  { providers: Provider[]; fallback?: boolean; value: number | null; onPick: (v: string) => void }) {
  return (
    <select style={{ width: 150, height: 30 }} value={value ?? ""} onChange={(e) => onPick(e.target.value)}>
      <option value="">{fallback ? "بديل مغلق" : "— اختر —"}</option>
      {providers.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
    </select>
  );
}

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
