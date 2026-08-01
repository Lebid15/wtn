import { useEffect, useState } from "react";
import { api } from "../api";
import Icon from "../components/Icon";
import { downloadCsv } from "../csv";
import { money, symbolOf } from "../currency";

interface Txn {
  id: number; type: string; type_label: string;
  amount: string; balance_after: string; note: string; created_at: string;
}
interface Data {
  dealer: { id: number; name: string; balance: string; currency: string };
  results: Txn[];
}

// الحركات الرافعة للرصيد خضراء والخافضة حمراء — كما في لوحة الوكيل
const TYPE_COLOR: Record<string, string> = {
  topup: "var(--ok)", manual_credit: "var(--ok)", refund: "var(--ok)",
  order_debit: "var(--danger)", manual_debit: "var(--danger)", adjustment: "#3b82f6",
};

export default function StatementModal({
  dealerId, dealerName, onClose,
}: { dealerId: number; dealerName: string; onClose: () => void }) {
  const [data, setData] = useState<Data | null>(null);
  const [err, setErr] = useState("");
  const [kind, setKind] = useState("all");

  useEffect(() => {
    api.get(`/dealers/${dealerId}/transactions/`)
      .then((r) => setData(r.data))
      .catch((e) => setErr(e?.response?.data?.detail || "تعذّر جلب كشف الحساب"));
  }, [dealerId]);

  const rows = (data?.results || []).filter((t) =>
    kind === "all" ? true : kind === "in" ? Number(t.amount) > 0 : Number(t.amount) < 0);

  const totals = rows.reduce((a, t) => {
    const v = Number(t.amount);
    return v > 0 ? { ...a, in: a.in + v } : { ...a, out: a.out + v };
  }, { in: 0, out: 0 });

  const cur = symbolOf(data?.dealer.currency || "");

  function exportCsv() {
    downloadCsv(
      `كشف-حساب-${dealerName}`,
      ["التاريخ", "النوع", "المبلغ", "الرصيد بعدها", "ملاحظة"],
      rows.map((t) => [t.created_at, t.type_label, t.amount, t.balance_after, t.note]),
    );
  }

  return (
    <div style={ovl} onClick={onClose}>
      <div style={box} onClick={(e) => e.stopPropagation()}>
        <div style={head}>
          <span>كشف حساب — {dealerName}</span>
          <button type="button" onClick={onClose} style={xBtn}>✕</button>
        </div>

        {err ? (
          <div style={{ padding: 24, color: "var(--danger)" }}>{err}</div>
        ) : !data ? (
          <div style={{ padding: 24, color: "var(--muted)" }}>جارٍ التحميل...</div>
        ) : (
          <div style={{ padding: 16 }}>
            <div style={statRow}>
              <Stat label="الرصيد الحالي" value={`${money(data.dealer.balance)} ${cur}`}
                tone={Number(data.dealer.balance) < 0 ? "var(--danger)" : "var(--ok)"} />
              <Stat label="مجموع الوارد" value={`${money(totals.in)} ${cur}`} tone="var(--ok)" />
              <Stat label="مجموع الصادر" value={`${money(totals.out)} ${cur}`} tone="var(--danger)" />
              <Stat label="عدد الحركات" value={String(rows.length)} tone="var(--text)" />
            </div>

            <div style={{ display: "flex", gap: 8, alignItems: "center", margin: "14px 0 10px" }}>
              <div className="segment">
                {([["all", "الكل"], ["in", "وارد"], ["out", "صادر"]] as [string, string][]).map(([k, l]) => (
                  <button key={k} className={kind === k ? "active" : ""} onClick={() => setKind(k)}>{l}</button>
                ))}
              </div>
              <button className="btn" style={{ height: 32, marginInlineStart: "auto" }}
                onClick={exportCsv} disabled={rows.length === 0}>
                <Icon name="excel" size={14} style={{ marginInlineEnd: 5, verticalAlign: -2 }} />
                تصدير Excel
              </button>
              <button className="btn" style={{ height: 32, background: "#8a999e" }}
                onClick={() => window.print()}>
                <Icon name="print" size={14} style={{ marginInlineEnd: 5, verticalAlign: -2 }} />
                طباعة
              </button>
            </div>

            <div className="table-scroll" style={{ maxHeight: "48vh" }}>
              <table className="grid">
                <thead>
                  <tr>
                    <th>التاريخ</th>
                    <th>النوع</th>
                    <th>المبلغ</th>
                    <th>الرصيد بعدها</th>
                    <th className="cell-start">ملاحظة</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr><td colSpan={5} style={{ padding: 24, color: "var(--muted)" }}>لا توجد حركات</td></tr>
                  ) : rows.map((t) => (
                    <tr key={t.id}>
                      <td style={{ fontSize: 12, color: "var(--muted)", whiteSpace: "nowrap" }}>{t.created_at}</td>
                      <td style={{ color: TYPE_COLOR[t.type] || "var(--text)", fontWeight: 700 }}>{t.type_label}</td>
                      <td className="num" style={{
                        color: Number(t.amount) < 0 ? "var(--danger)" : "var(--ok)", fontWeight: 700,
                      }}>{money(t.amount)}</td>
                      <td className="num">{money(t.balance_after)}</td>
                      <td className="cell-start" style={{ color: "var(--muted)", fontSize: 12.5 }}>{t.note || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 10 }}>
              يعرض آخر 100 حركة. الأرقام بعملة دفتر المتجر ({data.dealer.currency}).
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div style={statCard}>
      <div style={{ fontSize: 11.5, color: "var(--muted)", fontWeight: 700 }}>{label}</div>
      <div style={{ fontSize: 17, fontWeight: 800, color: tone, marginTop: 4 }}>{value}</div>
    </div>
  );
}

const ovl: React.CSSProperties = {
  position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 80,
  display: "flex", alignItems: "center", justifyContent: "center",
};
const box: React.CSSProperties = {
  background: "var(--surface)", borderRadius: 10, width: 860, maxWidth: "95vw",
  maxHeight: "92vh", overflow: "auto", boxShadow: "0 10px 40px rgba(0,0,0,.3)",
};
const head: React.CSSProperties = {
  background: "var(--primary)", color: "#fff", padding: "11px 16px",
  fontSize: 15, fontWeight: 700, display: "flex", justifyContent: "space-between",
  alignItems: "center", position: "sticky", top: 0, zIndex: 1,
};
const xBtn: React.CSSProperties = {
  background: "none", border: 0, color: "#fff", cursor: "pointer", fontSize: 15,
};
const statRow: React.CSSProperties = {
  display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10,
};
const statCard: React.CSSProperties = {
  border: "1px solid var(--border)", borderRadius: 8, padding: "10px 12px",
  background: "var(--surface-2)",
};
