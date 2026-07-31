import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { labelOf, symbolOf } from "../currency";

interface Group { id: number; name: string }
interface DealerRow {
  id: number; login_id: string; name: string;
  oyun_load_limit: string; foreign_ip_allowed: boolean; price_group: number | null;
  display_currency: string;
}

const LIMIT_OPTIONS = ["1000", "5000", "10000", "25000", "50000", "100000"];

export default function DealerPrices() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [dealers, setDealers] = useState<DealerRow[]>([]);
  const [q, setQ] = useState("");
  const [bulkGroup, setBulkGroup] = useState("");
  const [baseCurrency, setBaseCurrency] = useState("TRY");
  const [currencies, setCurrencies] = useState<string[]>([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    api.get("/catalog/dealer-prices/")
      .then((r) => {
        setGroups(r.data.groups); setDealers(r.data.dealers);
        setBaseCurrency(r.data.base_currency); setCurrencies(r.data.available_currencies || []);
      })
      .finally(() => setLoading(false));
  }
  useEffect(() => load(), []);

  async function update(id: number, patch: Partial<DealerRow>) {
    setErr("");
    try {
      const r = await api.post(`/catalog/dealer-prices/${id}/`, patch);
      setDealers((ds) => ds.map((d) => (d.id === id ? { ...d, ...r.data } : d)));
    } catch (e: any) {
      setErr(e?.response?.data?.detail || "تعذّر التحديث");
    }
  }

  async function bulkAssign() {
    if (!bulkGroup) return;
    await api.post("/catalog/dealer-prices/bulk-group/", { price_group: bulkGroup });
    load();
  }

  const filtered = useMemo(
    () => (q ? dealers.filter((d) => d.name.includes(q) || d.login_id.includes(q)) : dealers),
    [dealers, q]
  );

  if (loading) return <div style={{ padding: 30 }}>جارٍ التحميل...</div>;

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ fontSize: 20, color: "var(--primary-dark)", marginBottom: 14 }}>
        إعدادات أسعار الوكلاء (Bayi Fiyat Ayarları)
      </h2>

      {/* تعيين جماعي */}
      <div style={{ display: "flex", alignItems: "end", gap: 12, marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 4 }}>تعيين مجموعة أسعار جماعياً</div>
          <select value={bulkGroup} onChange={(e) => setBulkGroup(e.target.value)} style={{ width: 220 }}>
            <option value="">— اختر مجموعة —</option>
            {groups.map((g) => <option key={g.id} value={g.id}>مجموعة {g.name}</option>)}
          </select>
        </div>
        <button className="btn g" onClick={bulkAssign}>تحديث الكل</button>
        <input placeholder="بحث..." value={q} onChange={(e) => setQ(e.target.value)}
          style={{ width: 220, marginInlineStart: "auto" }} />
      </div>

      <div style={warn}>
        ⚠️ تنبيه: إذن IP الخارجي للوكيل لا يعمل في طلبات الـ API. إذا سُرقت بيانات دخول
        الوكيل فلن يوفّر هذا الإعداد الحماية.
      </div>

      <div style={info}>
        <b>عملة العرض</b> تغيّر ما يراه الوكيل فقط: رصيده وأسعار الباقات وطلباته وتقاريره.
        دفتر المتجر كلّه يبقى بـ<b> {labelOf(baseCurrency)} </b>، فلا يتأثّر ربحك ولا
        تختلّ عمليات الإلغاء والإرجاع. تظهر هنا العملات التي لها سعر صرف مضبوط في{" "}
        <Link to="/ayarlar/exchange" style={{ color: "var(--primary)", fontWeight: 700 }}>
          أسعار الصرف
        </Link>{" "}
        وحدها. ونبّه الوكيل: تغيّر سعر الصرف يغيّر رقم رصيده المعروض بلا أي حركة منه.
      </div>

      {err && (
        <div style={{ ...warn, background: "#fdecea" }}>{err}</div>
      )}

      <table style={table}>
        <thead>
          <tr>
            <th style={{ ...th, width: 70 }}>رقم الوكيل</th>
            <th style={{ ...th, textAlign: "right", paddingInlineStart: 12 }}>اسم الوكيل</th>
            <th style={th}>حد تحميل الألعاب</th>
            <th style={th}>إذن IP خارجي</th>
            <th style={th}>مجموعة الأسعار</th>
            <th style={th}>عملة العرض</th>
            <th style={th}>تفاصيل</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((d, i) => (
            <tr key={d.id} style={{ background: i % 2 ? "var(--row-alt)" : "#fff" }}>
              <td style={{ ...td, color: "var(--muted)" }}>{d.login_id}</td>
              <td style={{ ...td, textAlign: "right", paddingInlineStart: 12, fontWeight: 600, color: "var(--primary-dark)" }}>
                {d.name}
              </td>
              <td style={td}>
                <select value={d.oyun_load_limit.split(".")[0]}
                  onChange={(e) => update(d.id, { oyun_load_limit: e.target.value })}>
                  {LIMIT_OPTIONS.map((l) => <option key={l} value={l}>{Number(l).toLocaleString("en-US")}</option>)}
                </select>
              </td>
              <td style={td}>
                <label style={radioLbl}>
                  <input type="radio" checked={d.foreign_ip_allowed}
                    onChange={() => update(d.id, { foreign_ip_allowed: true })} /> نعم
                </label>
                <label style={radioLbl}>
                  <input type="radio" checked={!d.foreign_ip_allowed}
                    onChange={() => update(d.id, { foreign_ip_allowed: false })} /> لا
                </label>
              </td>
              <td style={td}>
                <select value={d.price_group ?? ""}
                  onChange={(e) => update(d.id, { price_group: e.target.value ? Number(e.target.value) : null })}>
                  <option value="">— بدون —</option>
                  {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </td>
              <td style={td}>
                <select value={d.display_currency || ""}
                  onChange={(e) => update(d.id, { display_currency: e.target.value })}
                  title="العملة التي يرى بها الوكيل رصيده وأسعار الباقات">
                  <option value="">{symbolOf(baseCurrency)} عملة الموقع ({baseCurrency})</option>
                  {currencies.map((c) => (
                    <option key={c} value={c}>{symbolOf(c)} {labelOf(c)} ({c})</option>
                  ))}
                </select>
              </td>
              <td style={td}>
                <button style={detailBtn} title="لوحة أسعار خاصة بهذا الوكيل">✏</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const info: React.CSSProperties = {
  background: "#f6f8f9", border: "1px solid #dbe3e5", color: "var(--muted)",
  fontSize: 12.5, padding: "10px 14px", borderRadius: 6, marginBottom: 14, lineHeight: 1.9,
};
const warn: React.CSSProperties = {
  background: "#fdecea", border: "1px solid #f5c6c2", color: "var(--danger)",
  fontSize: 13, padding: "10px 14px", borderRadius: 6, marginBottom: 14,
};
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
const radioLbl: React.CSSProperties = { fontSize: 13, margin: "0 6px", cursor: "pointer" };
const detailBtn: React.CSSProperties = {
  border: 0, borderRadius: "50%", width: 28, height: 28,
  background: "var(--ok)", color: "#fff", fontSize: 14,
};
