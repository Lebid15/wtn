import { useEffect, useState } from "react";
import { api } from "../api";
import Icon from "../components/Icon";

interface Account {
  id: number; method: string; method_label: string; title: string;
  account_no: string; balance: string; status: string; status_label: string;
  notification_enabled: boolean;
}

const METHOD_ICON: Record<string, string> = {
  sham_cash: "💵", mtn_cash: "📱", syriatel_cash: "📲", bank: "🏦", cash: "💰",
};

export default function Accounts() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    api.get("/payments/accounts/").then((r) => setAccounts(r.data)).finally(() => setLoading(false));
  }
  useEffect(() => load(), []);

  const money = (v: string) => Number(v).toLocaleString("en-US", { minimumFractionDigits: 2 });
  const total = accounts.reduce((s, a) => s + Number(a.balance), 0);

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
        <h2 style={{ fontSize: 20, color: "var(--primary-dark)" }}>حساباتي (البنوك والمحافظ)</h2>
        <button className="btn g"><Icon name="plus" size={15} style={{ marginInlineEnd: 5 }} />إضافة حساب</button>
        <button className="btn"><Icon name="refresh" size={15} style={{ marginInlineEnd: 5 }} />تحديث الأرصدة</button>
      </div>

      <table style={table}>
        <thead>
          <tr>
            {["الحساب", "الوسيلة", "رقم الحساب", "الرصيد", "الحالة", "إشعار", "ترتيب", "إجراء"]
              .map((h) => <th key={h} style={th}>{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={8} style={{ ...td, padding: 24 }}>جارٍ التحميل...</td></tr>
          ) : accounts.map((a, i) => (
            <tr key={a.id} style={{ background: i % 2 ? "var(--row-alt)" : "#fff" }}>
              <td style={{ ...td, textAlign: "right", paddingInlineStart: 12, fontWeight: 600 }}>
                <span style={{ marginInlineEnd: 6 }}>{METHOD_ICON[a.method]}</span>{a.title}
              </td>
              <td style={td}>{a.method_label}</td>
              <td style={{ ...td, color: "var(--muted)", direction: "ltr" }}>{a.account_no || "—"}</td>
              <td style={{ ...td, fontWeight: 600 }}>{money(a.balance)}</td>
              <td style={td}><Dot on={a.status === "active"} /></td>
              <td style={td}><Dot on={a.notification_enabled} /></td>
              <td style={{ ...td, color: "var(--muted)" }}>▲ ▼</td>
              <td style={td}>
                <div style={{ display: "flex", gap: 4, justifyContent: "center", color: "var(--muted)" }}>
                  <Icon name="edit" size={15} color="var(--primary)" /><Icon name="trash" size={15} color="var(--danger)" />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr style={{ background: "#eef4f5", fontWeight: 700 }}>
            <td style={td} colSpan={3}>إجمالي الأرصدة</td>
            <td style={td}>{money(String(total))}</td>
            <td style={td} colSpan={4}></td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function Dot({ on }: { on: boolean }) {
  return <span style={{ display: "inline-block", width: 11, height: 11, borderRadius: "50%",
    background: on ? "var(--ok)" : "var(--danger)" }} />;
}

const table: React.CSSProperties = {
  width: "100%", borderCollapse: "collapse", background: "#fff", fontSize: 14,
};
const th: React.CSSProperties = {
  background: "var(--th-bg)", color: "#fff", padding: "10px 6px", textAlign: "center", fontWeight: 600,
};
const td: React.CSSProperties = {
  padding: "9px 6px", textAlign: "center", borderBottom: "1px solid #edf1f2",
};
