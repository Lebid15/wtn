import { useEffect, useState } from "react";
import { api } from "../api";
import Icon from "../components/Icon";
import { CURRENCIES, labelOf, money, symbolOf } from "../currency";

/**
 * أسعار الصرف — قسم مستقلّ لكامل الموقع.
 * مرجع واحد تقرأ منه كل الأقسام: طرق الدفع اليوم، وعملة الوكيل والتسعير لاحقاً.
 */
export default function Exchange() {
  const [base, setBase] = useState("TRY");
  const [savedBase, setSavedBase] = useState("TRY");
  const [rates, setRates] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  // محوّل سريع للتحقّق من صحّة السعر قبل اعتماده
  const [test, setTest] = useState({ amount: "100", to: "TRY" });

  function load() {
    setLoading(true);
    api.get("/settings/exchange/")
      .then((r) => {
        setBase(r.data.base_currency);
        setSavedBase(r.data.base_currency);
        setRates(r.data.exchange_rates || {});
      })
      .finally(() => setLoading(false));
  }
  useEffect(() => load(), []);

  async function save() {
    setBusy(true); setMsg(null);
    try {
      const r = await api.put("/settings/exchange/", {
        base_currency: base,
        exchange_rates: Object.fromEntries(
          Object.entries(rates).filter(([, v]) => String(v).trim() !== ""),
        ),
      });
      setRates(r.data.exchange_rates || {});
      setBase(r.data.base_currency);
      setSavedBase(r.data.base_currency);
      setMsg({ ok: true, text: "حُفظت أسعار الصرف — تعمل بها كل أقسام الموقع فوراً" });
    } catch (e: any) {
      setMsg({ ok: false, text: e?.response?.data?.detail || "تعذّر الحفظ" });
    } finally { setBusy(false); }
  }

  const others = CURRENCIES.filter((c) => c.code !== base);
  const rateOf = (code: string) => Number(rates[code] || 0);
  const missing = others.filter((c) => !rateOf(c.code)).length;

  const testRate = test.to === base ? 1 : rateOf(test.to);
  const testResult = Number(test.amount || 0) * testRate;

  if (loading) return <div style={{ padding: 30 }}>جارٍ التحميل...</div>;

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "18px 16px 40px" }}>
      {/* ===== عملة الموقع ===== */}
      <div className="card">
        <div className="card-title">
          <Icon name="dollar" size={16} style={{ color: "var(--primary)" }} /> أسعار الصرف — مرجع الموقع كلّه
        </div>
        <div style={{ padding: 16 }}>
          <div style={{ display: "flex", gap: 16, alignItems: "flex-end", flexWrap: "wrap" }}>
            <div style={{ minWidth: 260 }}>
              <div style={lbl}>عملة الموقع (عملة الدفاتر والمحافظ)</div>
              <select value={base} onChange={(e) => setBase(e.target.value)} style={inp}>
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>{c.symbol} {c.label} ({c.code})</option>
                ))}
              </select>
            </div>
            {base !== savedBase && (
              <div style={{ ...warn, flex: "1 1 320px" }}>
                ⚠ تغيير عملة الموقع يغيّر معنى كل رقم محفوظ (الأرصدة والتكاليف والأسعار)
                — الأرقام لا تُحوَّل تلقائياً. غيّرها فقط قبل تشغيل المتجر فعلياً.
              </div>
            )}
          </div>
          <div style={note}>
            كل مبلغ في النظام محفوظ بـ<b> {labelOf(base)} </b>. اكتب لكل عملة
            <b> كم منها يساوي {symbolOf(base)} 1 </b> — نفس الرقم الذي تسمعه في السوق.
            يستعملها قسم <b>طرق الدفع</b> في حساب ما يُضاف لمحفظة الوكيل، و<b>عملة عرض
            الوكيل</b> في كل ما يراه في لوحته.
          </div>
        </div>
      </div>

      {/* ===== جدول الأسعار ===== */}
      <div className="card">
        <div className="card-title">
          <Icon name="refresh" size={16} style={{ color: "var(--primary)" }} /> الأسعار مقابل {labelOf(base)}
          {missing > 0 && (
            <span style={{ marginInlineStart: 10, fontSize: 12, color: "var(--debt)" }}>
              {missing} عملة بلا سعر — لا يمكن استعمالها في طرق الدفع
            </span>
          )}
        </div>
        <div className="table-scroll">
          <table className="grid">
            <thead>
              <tr>
                <th className="cell-start">العملة</th>
                <th>الرمز</th>
                <th>كل 1 {base} يساوي…</th>
                <th>الاتجاه المعاكس</th>
                <th>الحالة</th>
              </tr>
            </thead>
            <tbody>
              {others.map((c) => {
                const v = rateOf(c.code);
                return (
                  <tr key={c.code}>
                    <td className="cell-start"><b>{c.label}</b></td>
                    <td style={{ direction: "ltr" }}>{c.symbol} {c.code}</td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center" }}>
                        <span style={{ fontSize: 12, color: "var(--muted)", whiteSpace: "nowrap" }}>
                          1 {symbolOf(base)} {base} =
                        </span>
                        <input type="number" step="0.0001" value={rates[c.code] ?? ""}
                          onChange={(e) => setRates((o) => ({ ...o, [c.code]: e.target.value }))}
                          placeholder="—" style={{ ...inp, width: 150 }} />
                        <span style={{ fontSize: 12, color: "var(--muted)" }}>{c.code}</span>
                      </div>
                    </td>
                    <td style={{ color: "var(--muted)", fontSize: 12.5 }}>
                      {v > 0 ? <>1 {c.code} = {money(1 / v, 6)} {base}</> : "—"}
                    </td>
                    <td>
                      {v > 0
                        ? <span style={{ color: "var(--ok)", fontWeight: 700 }}>● مضبوط</span>
                        : <span style={{ color: "var(--muted)" }}>○ غير مضبوط</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div style={{ padding: 16, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <button className="btn g" onClick={save} disabled={busy} style={{ height: 36 }}>
            {busy ? "جارٍ الحفظ..." : "حفظ أسعار الصرف"}
          </button>
          <button className="btn" style={{ height: 36, background: "#8a999e" }} onClick={load} disabled={busy}>
            استعادة المحفوظ
          </button>
          {msg && (
            <span style={{
              fontSize: 12.5, padding: "7px 12px", borderRadius: 6,
              background: msg.ok ? "rgba(53,194,69,.10)" : "rgba(221,68,68,.10)",
              color: msg.ok ? "var(--ok)" : "var(--danger)",
            }}>{msg.text}</span>
          )}
        </div>
      </div>

      {/* ===== محوّل تجريبي ===== */}
      <div className="card">
        <div className="card-title">
          <Icon name="search" size={16} style={{ color: "var(--primary)" }} /> تحقّق سريع
        </div>
        <div style={{ padding: 16, display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div>
            <div style={lbl}>المبلغ بـ{base}</div>
            <input type="number" value={test.amount}
              onChange={(e) => setTest((o) => ({ ...o, amount: e.target.value }))}
              style={{ ...inp, width: 140 }} />
          </div>
          <div>
            <div style={lbl}>إلى عملة</div>
            <select value={test.to} onChange={(e) => setTest((o) => ({ ...o, to: e.target.value }))}
              style={{ ...inp, width: 190 }}>
              {others.map((c) => <option key={c.code} value={c.code}>{c.symbol} {c.label}</option>)}
            </select>
          </div>
          <div style={result}>
            {testRate > 0 ? (
              <>
                {money(test.amount)} {symbolOf(base)} {base} ={" "}
                <b style={{ fontSize: 18 }}>{money(testResult)}</b> {symbolOf(test.to)} {test.to}
              </>
            ) : (
              <span style={{ color: "var(--debt)" }}>لا سعر مضبوط لـ {test.to}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const inp: React.CSSProperties = { width: "100%", height: 36, borderRadius: 8 };
const lbl: React.CSSProperties = {
  fontSize: 12, color: "var(--muted)", fontWeight: 700, marginBottom: 4,
};
const note: React.CSSProperties = {
  marginTop: 14, fontSize: 12.5, color: "var(--muted)", lineHeight: 1.9,
};
const warn: React.CSSProperties = {
  background: "rgba(232,176,19,.12)", color: "var(--debt)", borderRadius: 8,
  padding: "9px 12px", fontSize: 12.5, lineHeight: 1.7,
};
const result: React.CSSProperties = {
  background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8,
  padding: "9px 16px", fontSize: 14, minHeight: 36, display: "flex", alignItems: "center",
};
