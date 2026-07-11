import { useEffect, useState } from "react";
import { api, type Dealer } from "../api";
import WalletModal from "../components/WalletModal";
import Icon from "../components/Icon";

const FLAG: Record<string, string> = { SY: "🇸🇾", TR: "🇹🇷", SA: "🇸🇦", IQ: "🇮🇶" };

export default function Dealers() {
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ dealer: Dealer; action: "topup" | "deduct" } | null>(null);

  function load(search = "") {
    setLoading(true);
    api.get("/dealers/", { params: { q: search } })
      .then((r) => setDealers(r.data.results))
      .finally(() => setLoading(false));
  }
  useEffect(() => load(), []);

  function updateBalance(dealerId: number, balance: string) {
    setDealers((ds) => ds.map((d) => (d.id === dealerId ? { ...d, balance } : d)));
    setModal(null);
  }

  const money = (v: string) => Number(v).toLocaleString("en-US", { minimumFractionDigits: 2 });

  return (
    <div>
      {/* شريط الأدوات */}
      <div style={toolbar}>
        <div style={{ position: "relative" }}>
          <input placeholder="بحث عن وكيل..." value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load(q)}
            style={{ width: 240, paddingInlineStart: 32 }} />
          <span style={{ position: "absolute", insetInlineStart: 9, top: 8, color: "var(--muted)" }}>
            <Icon name="search" size={16} />
          </span>
        </div>
        <button className="btn" onClick={() => load(q)}>بحث</button>
        <button className="btn g"><Icon name="plus" size={15} style={ib} />إضافة وكيل</button>
        <button className="btn"><Icon name="excel" size={15} style={ib} />تصدير Excel</button>
        <button className="btn r" onClick={() => { setQ(""); load(""); }}>إزالة الفلتر</button>
        <span style={{ marginInlineStart: "auto", color: "var(--muted)", fontSize: 14 }}>
          العدد: {dealers.length}
        </span>
      </div>

      {/* الجدول — أعمدة مطابقة للمرجع (Bayi Listesi) */}
      <div style={{ overflowX: "auto" }}>
        <table style={table}>
          <thead>
            <tr>
              <th style={th}>الرقم</th>
              <th style={{ ...th, textAlign: "right", paddingInlineStart: 12 }}>اسم الوكيل</th>
              <th style={th}>الرصيد المتاح</th>
              <th style={th}>الدين</th>
              <th style={th}>الحد الائتماني</th>
              <th style={th}>العمليات المالية</th>
              <th style={th} title="مشتريات">مشتريات</th>
              <th style={th} title="ألعاب">ألعاب</th>
              <th style={th} title="نشط">نشط</th>
              <th style={th}>المجموعة</th>
              <th style={th}>الدولة</th>
              <th style={th}>إجراء</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={12} style={{ ...td, padding: 30 }}>جارٍ التحميل...</td></tr>
            ) : dealers.length === 0 ? (
              <tr><td colSpan={12} style={{ ...td, padding: 30 }}>لا يوجد وكلاء</td></tr>
            ) : dealers.map((d, i) => {
              const bal = Number(d.balance);
              const available = bal > 0 ? bal : 0;
              const debt = bal < 0 ? -bal : 0;
              return (
                <tr key={d.id} style={{ background: i % 2 ? "var(--row-alt)" : "#fff" }}>
                  <td style={{ ...td, color: "var(--muted)" }}>{d.login_id}</td>
                  <td style={{ ...td, textAlign: "right", paddingInlineStart: 12 }}>
                    <a style={{ color: "var(--primary-dark)", fontWeight: 600 }}>{d.name}</a>
                    {d.children_count > 0 && <span style={{ color: "var(--muted)" }}> ({d.children_count})</span>}
                  </td>
                  <td style={{ ...td, fontWeight: 600 }}>{money(String(available))}</td>
                  <td style={{ ...td, color: debt > 0 ? "var(--danger)" : "var(--muted)", fontWeight: debt > 0 ? 700 : 400 }}>
                    {money(String(debt))}
                  </td>
                  <td style={{ ...td, color: "var(--muted)" }}>{money(d.credit_limit)}</td>
                  {/* العمليات المالية: شحن · خصم · كشف · حركات */}
                  <td style={td}>
                    <div style={{ display: "flex", gap: 4, justifyContent: "center" }}>
                      <IconBtn name="plus" color="var(--ok)" title="شحن رصيد" onClick={() => setModal({ dealer: d, action: "topup" })} />
                      <IconBtn name="minus" color="var(--danger)" title="خصم رصيد" onClick={() => setModal({ dealer: d, action: "deduct" })} />
                      <IconBtn name="chart" color="var(--primary)" title="كشف حساب" />
                      <IconBtn name="calendar" color="var(--muted)" title="حركات بتاريخ" />
                    </div>
                  </td>
                  <td style={td}><Dot on={d.shopping} /></td>
                  <td style={td}><Dot on={d.oyun} /></td>
                  <td style={td}><Dot on={d.active} /></td>
                  <td style={td}>{d.group || "—"}</td>
                  <td style={{ ...td, fontSize: 18 }}>{FLAG[d.country] || "🏳️"}</td>
                  <td style={td}>
                    <div style={{ display: "flex", gap: 4, justifyContent: "center" }}>
                      <IconBtn name="edit" color="var(--primary)" title="تعديل" />
                      <IconBtn name="settings" color="var(--muted)" title="إعدادات" />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {modal && (
        <WalletModal dealer={modal.dealer} action={modal.action}
          onClose={() => setModal(null)}
          onDone={(balance) => updateBalance(modal.dealer.id, balance)} />
      )}
    </div>
  );
}

function IconBtn({ name, color, title, onClick }:
  { name: string; color: string; title: string; onClick?: () => void }) {
  return (
    <button onClick={onClick} title={title} style={{
      border: "1px solid #dde4e6", background: "#fff", color,
      width: 28, height: 28, borderRadius: 5, display: "flex",
      alignItems: "center", justifyContent: "center", cursor: "pointer",
    }}><Icon name={name} size={15} /></button>
  );
}

function Dot({ on }: { on: boolean }) {
  return <span style={{ display: "inline-block", width: 11, height: 11, borderRadius: "50%",
    background: on ? "var(--ok)" : "var(--danger)" }} />;
}

const ib: React.CSSProperties = { marginInlineEnd: 5 };
const toolbar: React.CSSProperties = {
  display: "flex", gap: 10, alignItems: "center", padding: "12px 16px",
  background: "#f2f5f6", flexWrap: "wrap",
};
const table: React.CSSProperties = { width: "100%", borderCollapse: "collapse", background: "#fff", fontSize: 14 };
const th: React.CSSProperties = {
  background: "var(--th-bg)", color: "#fff", padding: "10px 6px",
  textAlign: "center", fontWeight: 600, whiteSpace: "nowrap",
};
const td: React.CSSProperties = { padding: "8px 6px", textAlign: "center", borderBottom: "1px solid #edf1f2" };
