import { useEffect, useState } from "react";
import { api } from "../api";
import Icon from "../components/Icon";
import { money, symbolOf } from "../currency";

interface MField {
  id: number; label: string; kind: string; options: string;
  placeholder: string; required: boolean;
}
interface Method {
  id: number; name: string; subtitle: string; logo_url: string; color: string;
  currency: string; instructions: string; account_box: string; warning: string;
  min_amount: string; max_amount: string; commission_percent: string;
  rate: string; fields_list: MField[];
}
interface Deposit {
  id: number; method_name: string; amount: string; currency: string;
  credit_amount: string; status: string; status_label: string;
  admin_note: string; created_at: string;
}

const STATUS_TONE: Record<string, { bg: string; fg: string }> = {
  pending: { bg: "#FAEF77", fg: "#6b5500" },
  approved: { bg: "#D8F781", fg: "#2c5200" },
  rejected: { bg: "#F5BEAC", fg: "#7a2410" },
};

/* ═════════ القسم: شبكة الطرق · نموذج الطريقة · سجلّ الطلبات ═════════ */
export default function TopUp({ onDone }: { onDone: () => void }) {
  const [methods, setMethods] = useState<Method[]>([]);
  const [walletCurrency, setWalletCurrency] = useState("");
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [open, setOpen] = useState<Method | null>(null);
  const [loading, setLoading] = useState(true);

  function loadDeposits() {
    api.get("/payments/store/deposits/").then((r) => setDeposits(r.data.results)).catch(() => {});
  }
  useEffect(() => {
    api.get("/payments/store/methods/")
      .then((r) => { setMethods(r.data.methods); setWalletCurrency(r.data.wallet_currency); })
      .finally(() => setLoading(false));
    loadDeposits();
  }, []);

  if (loading) return <div style={{ padding: 20 }}>جارٍ التحميل...</div>;

  if (open) {
    return (
      <MethodForm method={open} walletCurrency={walletCurrency}
        onBack={() => setOpen(null)}
        onSent={() => { setOpen(null); loadDeposits(); onDone(); }} />
    );
  }

  return (
    <div>
      <div style={{ fontWeight: 800, margin: "0 2px 14px", display: "flex", alignItems: "center", gap: 8 }}>
        <Icon name="card" size={18} />اختر طريقة الدفع
      </div>

      {methods.length === 0 ? (
        <div style={empty}>
          لم يفعّل صاحب المتجر أي طريقة دفع بعد — تواصل معه لشحن رصيدك.
        </div>
      ) : (
        <div style={cardsGrid}>
          {methods.map((m) => (
            <button key={m.id} onClick={() => setOpen(m)} style={{
              ...methodCard,
              background: m.logo_url
                ? `#0d1117 center/cover no-repeat url(${m.logo_url})`
                : `linear-gradient(135deg, ${m.color || "#2f6f8f"}, #101418)`,
            }}>
              <span style={cardLabel}>
                {m.name}
                {m.subtitle && <span style={cardSub}>{m.subtitle}</span>}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* سجلّ طلباتي */}
      <div style={{ fontWeight: 800, margin: "26px 2px 12px", display: "flex", alignItems: "center", gap: 8 }}>
        <Icon name="chart" size={18} />طلبات إضافة الرصيد
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={table}>
          <thead>
            <tr>
              <th style={th}>#</th>
              <th style={th}>الطريقة</th>
              <th style={th}>المبلغ المُرسل</th>
              <th style={th}>المُضاف للمحفظة</th>
              <th style={th}>الحالة</th>
              <th style={{ ...th, textAlign: "right", paddingInlineStart: 12 }}>ملاحظة الإدارة</th>
              <th style={th}>التاريخ</th>
            </tr>
          </thead>
          <tbody>
            {deposits.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: 24, textAlign: "center", color: "var(--muted)" }}>
                لا توجد طلبات بعد
              </td></tr>
            ) : deposits.map((d) => {
              const tone = STATUS_TONE[d.status];
              return (
                <tr key={d.id} style={{ background: tone?.bg }}>
                  <td style={{ ...td, color: "var(--muted)" }}>{d.id}</td>
                  <td style={{ ...td, fontWeight: 600 }}>{d.method_name || "—"}</td>
                  <td style={td}>{money(d.amount)} {symbolOf(d.currency)}</td>
                  <td style={{ ...td, fontWeight: 800 }}>{money(d.credit_amount)}</td>
                  <td style={{ ...td, fontWeight: 800, color: tone?.fg }}>{d.status_label}</td>
                  <td style={{ ...td, textAlign: "right", paddingInlineStart: 12, fontSize: 12.5 }}>{d.admin_note || "—"}</td>
                  <td style={{ ...td, fontSize: 12, color: "var(--muted)" }}>{d.created_at}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 14 }}>
        لا يُضاف الرصيد إلى محفظتك إلا بعد موافقة صاحب المتجر على طلبك.
      </p>
    </div>
  );
}

/* ═════════ نموذج طريقة واحدة ═════════ */
function MethodForm({
  method, walletCurrency, onBack, onSent,
}: { method: Method; walletCurrency: string; onBack: () => void; onSent: () => void }) {
  const [amount, setAmount] = useState("");
  const [vals, setVals] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const rate = Number(method.rate || 1);
  const commission = Number(method.commission_percent || 0);
  const credit = (Number(amount || 0) * rate * (100 - commission)) / 100;
  const sym = symbolOf(method.currency);

  function copyAccount() {
    navigator.clipboard?.writeText(method.account_box).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }).catch(() => {});
  }

  async function submit() {
    setBusy(true); setMsg(null);
    try {
      await api.post("/payments/store/deposits/create/", {
        method: method.id, amount, values: vals,
      });
      onSent();
    } catch (e: any) {
      setMsg({ ok: false, text: e?.response?.data?.detail || "تعذّر إرسال الطلب" });
    } finally { setBusy(false); }
  }

  return (
    <div style={{ maxWidth: 720, margin: "0 auto" }}>
      <button onClick={onBack} style={backBtn}>
        <Icon name="x" size={13} style={{ marginInlineEnd: 5 }} />رجوع إلى طرق الدفع
      </button>

      <div style={panel}>
        <h3 style={{ fontSize: 22, fontWeight: 800, textAlign: "center", margin: "0 0 16px" }}>
          {method.name}
        </h3>
        {method.subtitle && (
          <div style={{ textAlign: "center", color: "#9fb0b5", fontSize: 13, marginTop: -10, marginBottom: 16 }}>
            {method.subtitle}
          </div>
        )}

        {/* الشرح — سطر لكل بند كما كتبه صاحب المتجر */}
        {method.instructions && (
          <div style={instructions}>
            {method.instructions.split("\n").map((line, i) => (
              <div key={i} style={{ minHeight: line.trim() ? undefined : 8 }}>{line}</div>
            ))}
          </div>
        )}

        {/* صندوق الحساب — بضغطة يُنسخ */}
        {method.account_box && (
          <button onClick={copyAccount} style={accountBox} title="اضغط للنسخ">
            {method.account_box}
            <span style={copyHint}>{copied ? "✓ نُسخ" : "نسخ"}</span>
          </button>
        )}

        {method.warning && <div style={warnBox}>{method.warning}</div>}

        {/* الحقول التي بناها صاحب المتجر */}
        {method.fields_list.map((f) => (
          <div key={f.id} style={{ marginBottom: 12 }}>
            <div style={fieldLabel}>{f.label}{f.required && <span style={{ color: "#ff8a7a" }}> *</span>}</div>
            {f.kind === "textarea" ? (
              <textarea rows={5} value={vals[f.id] || ""} placeholder={f.placeholder}
                onChange={(e) => setVals((o) => ({ ...o, [f.id]: e.target.value }))}
                style={{ ...darkInp, height: "auto", resize: "vertical" }} />
            ) : f.kind === "select" ? (
              <select value={vals[f.id] || ""} onChange={(e) => setVals((o) => ({ ...o, [f.id]: e.target.value }))}
                style={darkInp}>
                <option value="">— اختر —</option>
                {f.options.split("|").map((o) => o.trim()).filter(Boolean).map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            ) : (
              <input type={f.kind === "number" ? "number" : "text"} value={vals[f.id] || ""}
                placeholder={f.placeholder || (f.kind === "image" ? "https://… رابط صورة الإشعار" : "")}
                onChange={(e) => setVals((o) => ({ ...o, [f.id]: e.target.value }))}
                style={{ ...darkInp, ...(f.kind === "image" ? { direction: "ltr", textAlign: "left" } : {}) }} />
            )}
          </div>
        ))}

        {/* المبلغ */}
        <div style={{ marginBottom: 12 }}>
          <div style={fieldLabel}>
            القيمة
            {Number(method.min_amount) > 0 && (
              <span style={{ color: "#8fa0a5", fontWeight: 400 }}> — الحد الأدنى {money(method.min_amount)} {sym}</span>
            )}
          </div>
          <div style={{ position: "relative" }}>
            <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)}
              style={{ ...darkInp, paddingInlineEnd: 44 }} placeholder="0" />
            <span style={inpSymbol}>{sym}</span>
          </div>
        </div>

        {/* المحصّلة */}
        <div style={resultBox}>
          <div style={{ fontSize: 12.5, color: "#7fd8a0" }}>القيمة التي سيتم إضافتها إلى رصيدك</div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <b style={{ fontSize: 20 }}>{money(credit)}</b>
            <span style={{ fontSize: 15, color: "#7fd8a0" }}>{symbolOf(walletCurrency)} {walletCurrency}</span>
          </div>
          <div style={{ fontSize: 11.5, color: "#6f8a78", marginTop: 4 }}>
            1 {sym} = {money(rate, 4)} {symbolOf(walletCurrency)}
            {commission > 0 && <> · العمولة {money(commission)}%</>}
          </div>
        </div>

        {msg && <div style={{ ...warnBox, background: "rgba(221,68,68,.14)", color: "#ffb3a7" }}>{msg.text}</div>}

        <button onClick={submit} disabled={busy || !amount} style={submitBtn}>
          {busy ? "جارٍ الإرسال..." : "طلب"}
        </button>
      </div>
    </div>
  );
}

/* ═════════ الأنماط ═════════ */
const cardsGrid: React.CSSProperties = {
  display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 16,
};
const methodCard: React.CSSProperties = {
  position: "relative", height: 140, borderRadius: 12, border: "1px solid rgba(0,0,0,.12)",
  cursor: "pointer", padding: 0, overflow: "hidden", display: "flex",
  alignItems: "flex-end", justifyContent: "center",
  boxShadow: "0 3px 10px rgba(0,0,0,.16)",
};
const cardLabel: React.CSSProperties = {
  width: "100%", padding: "10px 12px", color: "#fff", fontSize: 15, fontWeight: 800,
  textShadow: "0 1px 4px rgba(0,0,0,.9)", background: "linear-gradient(transparent, rgba(0,0,0,.75))",
  display: "flex", flexDirection: "column", gap: 2,
};
const cardSub: React.CSSProperties = { fontSize: 11, fontWeight: 500, opacity: 0.9 };
const empty: React.CSSProperties = {
  background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8,
  padding: 24, textAlign: "center", color: "var(--muted)",
};
const panel: React.CSSProperties = {
  background: "#0d1117", color: "#e7eef0", borderRadius: 14, padding: "22px 20px",
  border: "1px solid #1d2730", boxShadow: "0 6px 24px rgba(0,0,0,.25)",
};
const instructions: React.CSSProperties = {
  fontSize: 13.5, lineHeight: 2, color: "#c4d2d6", marginBottom: 16, whiteSpace: "pre-wrap",
};
const accountBox: React.CSSProperties = {
  width: "100%", background: "#000", color: "#e7eef0", border: "1px solid #202b33",
  borderRadius: 10, padding: "14px 16px", fontSize: 14, textAlign: "center",
  cursor: "pointer", marginBottom: 14, position: "relative", whiteSpace: "pre-wrap",
};
const copyHint: React.CSSProperties = {
  position: "absolute", insetInlineEnd: 10, top: "50%", transform: "translateY(-50%)",
  fontSize: 10.5, color: "#7fd8a0", border: "1px solid #24503a", borderRadius: 5, padding: "2px 7px",
};
const warnBox: React.CSSProperties = {
  background: "rgba(232,176,19,.12)", color: "#f0cd6a", borderRadius: 8,
  padding: "9px 12px", fontSize: 12.5, marginBottom: 14, lineHeight: 1.7,
};
const fieldLabel: React.CSSProperties = { fontSize: 13, color: "#a9b9be", marginBottom: 6, fontWeight: 600 };
const darkInp: React.CSSProperties = {
  width: "100%", height: 48, background: "#1a222a", border: "1px solid #263039",
  borderRadius: 12, color: "#e7eef0", padding: "0 16px", fontSize: 14,
};
const inpSymbol: React.CSSProperties = {
  position: "absolute", insetInlineEnd: 16, top: "50%", transform: "translateY(-50%)",
  color: "#8fa0a5", fontSize: 15, pointerEvents: "none",
};
const resultBox: React.CSSProperties = {
  background: "rgba(29,90,52,.35)", border: "1px solid #24503a", borderRadius: 12,
  padding: "12px 16px", marginBottom: 16,
};
const submitBtn: React.CSSProperties = {
  width: "100%", height: 50, borderRadius: 25, border: 0, cursor: "pointer",
  background: "#5ce68a", color: "#08301a", fontSize: 16, fontWeight: 800,
};
const backBtn: React.CSSProperties = {
  background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8,
  padding: "7px 14px", fontSize: 13, cursor: "pointer", marginBottom: 14,
  display: "inline-flex", alignItems: "center", color: "var(--text)",
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
  border: "1px solid var(--border)",
};
