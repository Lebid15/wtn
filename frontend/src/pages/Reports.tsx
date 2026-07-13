import { useEffect, useState } from "react";
import { api, type Dealer, type Game } from "../api";
import Icon from "../components/Icon";

interface Row { game: string; count: number; cost: string; sell: string; profit: string }
interface Totals { count: string; cost: string; sell: string; profit: string }

export default function Reports() {
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [filters, setFilters] = useState({ dealer: "", game: "", date_from: "", date_to: "" });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get("/dealers/").then((r) => setDealers(r.data.results));
    api.get("/catalog/games/").then((r) => setGames(r.data));
    run();
  }, []);

  function run() {
    setLoading(true);
    const params: Record<string, string> = {};
    Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });
    api.get("/orders/reports/summary/", { params })
      .then((r) => { setRows(r.data.results); setTotals(r.data.totals); })
      .finally(() => setLoading(false));
  }

  function clear() {
    setFilters({ dealer: "", game: "", date_from: "", date_to: "" });
    setTimeout(run, 0);
  }

  function exportCsv() {
    const header = ["اللعبة", "العدد", "الشراء", "البيع", "الربح"];
    const lines = rows.map((r) => [r.game, r.count, r.cost, r.sell, r.profit].join(","));
    const csv = "﻿" + [header.join(","), ...lines].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url; a.download = "تقرير_المبيعات.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  const money = (v: string) => Number(v).toLocaleString("en-US", { minimumFractionDigits: 2 });

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ fontSize: 20, color: "var(--primary-dark)", marginBottom: 12 }}>
        تقرير مبيعات الألعاب (Oyun Pin Toplam Raporu)
      </h2>

      {/* الفلاتر */}
      <div style={filterBar}>
        <Field label="الوكيل">
          <select value={filters.dealer} onChange={(e) => setFilters({ ...filters, dealer: e.target.value })} style={{ width: 170 }}>
            <option value="">كل الوكلاء</option>
            {dealers.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </Field>
        <Field label="اللعبة">
          <select value={filters.game} onChange={(e) => setFilters({ ...filters, game: e.target.value })} style={{ width: 150 }}>
            <option value="">كل الألعاب</option>
            {games.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </Field>
        <Field label="من تاريخ">
          <input type="date" value={filters.date_from} onChange={(e) => setFilters({ ...filters, date_from: e.target.value })} />
        </Field>
        <Field label="إلى تاريخ">
          <input type="date" value={filters.date_to} onChange={(e) => setFilters({ ...filters, date_to: e.target.value })} />
        </Field>
        <button className="btn" onClick={run}><Icon name="search" size={15} style={{ marginInlineEnd: 5 }} />عرض التقرير</button>
        <button className="btn g" onClick={exportCsv}><Icon name="excel" size={15} style={{ marginInlineEnd: 5 }} />تصدير Excel</button>
        <button className="btn r" onClick={clear}>إزالة الفلاتر</button>
      </div>

      <table style={table}>
        <thead>
          <tr>
            {["اللعبة", "العدد", "الشراء", "البيع", "الربح"].map((h) => <th key={h} style={th}>{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={5} style={{ ...td, padding: 24 }}>جارٍ التحميل...</td></tr>
          ) : rows.length === 0 ? (
            <tr><td colSpan={5} style={{ ...td, padding: 24 }}>لا توجد بيانات للفترة المحدّدة</td></tr>
          ) : rows.map((r, i) => (
            <tr key={i} style={{ background: i % 2 ? "var(--row-alt)" : "#fff" }}>
              <td style={{ ...td, textAlign: "right", paddingInlineStart: 12, fontWeight: 600 }}>{r.game}</td>
              <td style={td}>{r.count}</td>
              <td style={{ ...td, color: "var(--muted)" }}>{money(r.cost)}</td>
              <td style={td}>{money(r.sell)}</td>
              <td style={{ ...td, color: "var(--ok)", fontWeight: 600 }}>{money(r.profit)}</td>
            </tr>
          ))}
        </tbody>
        {totals && (
          <tfoot>
            <tr style={{ background: "#f5c518", fontWeight: 700 }}>
              <td style={td}>المجاميع</td>
              <td style={td}>{totals.count}</td>
              <td style={td}>{money(totals.cost)}</td>
              <td style={td}>{money(totals.sell)}</td>
              <td style={td}>{money(totals.profit)}</td>
            </tr>
          </tfoot>
        )}
      </table>
      <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 8 }}>
        * التقرير يشمل الطلبات الناجحة فقط (الطلبات الملغاة غير محسوبة).
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4 }}>{label}</div>
      {children}
    </div>
  );
}

const filterBar: React.CSSProperties = {
  display: "flex", gap: 12, alignItems: "end", flexWrap: "wrap",
  background: "#f2f5f6", padding: "14px 16px", borderRadius: 6, marginBottom: 16,
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
