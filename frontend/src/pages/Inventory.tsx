import { useEffect, useState } from "react";
import { api } from "../api";
import Icon from "../components/Icon";
import { money, symbolOf } from "../currency";

interface Row {
  name: string; amount: string; currency: string;
  base: string | null; kind: string; note: string; resolved: boolean;
}
interface Group {
  key: string; label: string; kind: "asset" | "liability"; hint: string;
  rows: Row[]; total_base: string; unresolved: number;
}
interface Live {
  base_currency: string;
  groups: Group[];
  totals: { assets: string; liabilities: string; net: string };
  notes: string[];
}

export default function Inventory() {
  const [d, setD] = useState<Live | null>(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    api.get("/inventory/live/")
      .then((r) => { setD(r.data); setErr(""); })
      .catch((e) => setErr(e?.response?.data?.detail || "تعذّر جلب الجرد"))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  if (loading && !d) return <div style={{ padding: 30, color: "var(--muted)" }}>جارٍ الحساب...</div>;
  if (err) return <div style={{ padding: 30, color: "var(--danger)" }}>{err}</div>;
  if (!d) return null;

  const sym = symbolOf(d.base_currency);
  const assets = d.groups.filter((g) => g.kind === "asset");
  const liabilities = d.groups.filter((g) => g.kind === "liability");
  const net = Number(d.totals.net);

  return (
    <div style={{ padding: 16, maxWidth: 1160, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
        <h2 style={{ fontSize: 20, color: "var(--primary-dark)", margin: 0 }}>الجرد النهائي</h2>
        <button className="btn" style={{ height: 32 }} onClick={load} disabled={loading}>
          <Icon name="refresh" size={14} style={{ marginInlineEnd: 5, verticalAlign: -2 }} />
          {loading ? "جارٍ التحديث..." : "تحديث"}
        </button>
      </div>

      {/* المجاميع الثلاثة */}
      <div className="summary" style={{ marginBottom: 16 }}>
        <div className="stat">
          <div className="label"><Icon name="wallet" size={15} style={{ color: "var(--ok)" }} /> مجموع الأصول</div>
          <div className="value num" style={{ color: "var(--ok)" }}>{money(d.totals.assets)} <small style={{ fontSize: 13 }}>{sym}</small></div>
          <span className="spark" />
        </div>
        <div className="stat">
          <div className="label"><Icon name="warning" size={15} style={{ color: "var(--debt)" }} /> مجموع الالتزامات</div>
          <div className="value num" style={{ color: "var(--debt)" }}>{money(d.totals.liabilities)} <small style={{ fontSize: 13 }}>{sym}</small></div>
          <span className="spark" />
        </div>
        <div className="stat">
          <div className="label"><Icon name="dollar" size={15} style={{ color: "var(--primary)" }} /> صافي رأس المال</div>
          <div className="value num" style={{ color: net < 0 ? "var(--debt)" : "var(--text)" }}>
            {money(d.totals.net)} <small style={{ fontSize: 13 }}>{sym}</small>
          </div>
          <span className="spark" />
        </div>
      </div>

      {d.notes.map((n, i) => (
        <div key={i} style={warn}><Icon name="warning" size={14} style={{ marginInlineEnd: 6, verticalAlign: -2 }} />{n}</div>
      ))}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "start" }}>
        <Column title="الأصول — ما لنا" color="var(--ok)" groups={assets} sym={sym} />
        <Column title="الالتزامات — ما علينا" color="var(--debt)" groups={liabilities} sym={sym} />
      </div>

      <div style={note}>
        <b>هذه المرحلة الأولى: قراءةٌ فقط.</b> تعرض ما تعرفه القاعدة الآن، بلا حفظ لقطة
        وبلا حساب ربح. الخطوة التالية — حفظ اللقطة ومقارنتها بسابقتها — بانتظار
        ما ستحدّده: أي البنود تدخل رأس المال، وما يُضاف يدوياً ممّا لا يعرفه النظام.
      </div>
    </div>
  );
}

function Column({ title, color, groups, sym }:
  { title: string; color: string; groups: Group[]; sym: string }) {
  const total = groups.reduce((s, g) => s + Number(g.total_base), 0);
  return (
    <div>
      <div style={{ ...colHead, borderInlineStartColor: color }}>
        <span style={{ fontWeight: 800, color }}>{title}</span>
        <span className="num" style={{ marginInlineStart: "auto", fontWeight: 800, color }}>
          {money(total)} {sym}
        </span>
      </div>
      {groups.length === 0 && <div style={{ ...card, color: "var(--muted)", fontSize: 13 }}>لا شيء مسجَّل</div>}
      {groups.map((g) => (
        <div key={g.key} style={card}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 4 }}>
            <b style={{ fontSize: 14 }}>{g.label}</b>
            <span className="num" style={{ marginInlineStart: "auto", fontWeight: 800 }}>
              {money(g.total_base)} {sym}
            </span>
          </div>
          <div style={{ fontSize: 11.5, color: "var(--muted)", marginBottom: 8 }}>{g.hint}</div>
          {g.rows.length === 0 ? (
            <div style={{ fontSize: 12.5, color: "var(--faint)" }}>— لا بنود —</div>
          ) : (
            <table style={{ width: "100%", fontSize: 12.5, borderCollapse: "collapse" }}>
              <tbody>
                {g.rows.map((r, i) => (
                  <tr key={i} style={{ borderTop: "1px solid var(--border)" }}>
                    <td style={{ padding: "6px 0" }}>
                      {r.name}
                      {r.note && <div style={{ fontSize: 11, color: "var(--faint)" }}>{r.note}</div>}
                    </td>
                    <td className="num" style={{ padding: "6px 0", textAlign: "end", whiteSpace: "nowrap" }}>
                      {money(r.amount)} <span style={{ fontSize: 11, color: "var(--faint)" }}>
                        {r.currency === "?" ? "؟" : symbolOf(r.currency)}
                      </span>
                      {r.base !== null && r.currency !== "?" && (
                        <div style={{ fontSize: 11, color: "var(--faint)" }}>= {money(r.base)} {sym}</div>
                      )}
                      {!r.resolved && (
                        <div style={{ fontSize: 11, color: "var(--debt)" }}>خارج المجموع</div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ))}
    </div>
  );
}

const colHead: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 8, padding: "9px 13px",
  background: "var(--surface-2)", border: "1px solid var(--border)",
  borderInlineStart: "4px solid", borderRadius: 9, marginBottom: 10, fontSize: 14,
};
const card: React.CSSProperties = {
  background: "var(--surface)", border: "1px solid var(--border)",
  borderRadius: 9, padding: "12px 14px", marginBottom: 10,
};
const warn: React.CSSProperties = {
  background: "rgba(224,168,0,.12)", border: "1px solid rgba(224,168,0,.45)",
  color: "var(--text)", fontSize: 12.5, padding: "9px 13px", borderRadius: 8,
  marginBottom: 10, lineHeight: 1.8,
};
const note: React.CSSProperties = {
  background: "var(--surface-2)", border: "1px solid var(--border)",
  color: "var(--muted)", fontSize: 12.5, padding: "11px 14px",
  borderRadius: 8, lineHeight: 1.9, marginTop: 16,
};
