import { useEffect, useState } from "react";
import { api, type Dealer } from "../api";

export default function Dealers() {
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  function load(search = "") {
    setLoading(true);
    api
      .get("/dealers/", { params: { q: search } })
      .then((r) => setDealers(r.data.results))
      .finally(() => setLoading(false));
  }
  useEffect(() => load(), []);

  const money = (v: string) => Number(v).toLocaleString("en-US", { minimumFractionDigits: 2 });

  return (
    <div>
      {/* شريط الأدوات */}
      <div style={toolbar}>
        <input
          placeholder="بحث عن وكيل..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load(q)}
          style={{ width: 240 }}
        />
        <button className="btn" onClick={() => load(q)}>بحث</button>
        <button className="btn g">➕ إضافة وكيل</button>
        <button className="btn">📊 تصدير Excel</button>
        <button className="btn r" onClick={() => { setQ(""); load(""); }}>إزالة الفلتر</button>
        <span style={{ marginInlineStart: "auto", color: "var(--muted)", fontSize: 14 }}>
          العدد: {dealers.length}
        </span>
      </div>

      {/* الجدول */}
      <table style={table}>
        <thead>
          <tr>
            {["الرقم", "اسم الوكيل", "الرصيد (±)", "الحد الائتماني", "شحن / خصم",
              "ألعاب", "الحالة", "المجموعة", "إجراء"].map((h) => (
              <th key={h} style={th}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={9} style={{ ...td, padding: 30 }}>جارٍ التحميل...</td></tr>
          ) : dealers.length === 0 ? (
            <tr><td colSpan={9} style={{ ...td, padding: 30 }}>لا يوجد وكلاء</td></tr>
          ) : (
            dealers.map((d, i) => {
              const neg = Number(d.balance) < 0;
              return (
                <tr key={d.id} style={{ background: i % 2 ? "var(--row-alt)" : "#fff" }}>
                  <td style={td}>{d.login_id}</td>
                  <td style={{ ...td, textAlign: "right", paddingInlineStart: 12 }}>
                    <a style={{ color: "var(--primary-dark)", fontWeight: 600 }}>{d.name}</a>
                    {d.children_count > 0 && (
                      <span style={{ color: "var(--muted)" }}> ({d.children_count})</span>
                    )}
                  </td>
                  <td style={{ ...td, color: neg ? "var(--danger)" : "var(--text)", fontWeight: 600 }}>
                    {money(d.balance)}
                  </td>
                  <td style={{ ...td, color: "var(--muted)" }}>{money(d.credit_limit)}</td>
                  <td style={td}>
                    <span style={{ color: "var(--ok)", fontWeight: 700 }}>＋</span>{" "}
                    <span style={{ color: "var(--danger)", fontWeight: 700 }}>－</span>
                  </td>
                  <td style={td}><Dot on={d.oyun} /></td>
                  <td style={td}>
                    <span style={{ ...badge, ...(d.status === "active" ? badgeOk : badgeOff) }}>
                      {d.status === "active" ? "نشط" : "معطّل"}
                    </span>
                  </td>
                  <td style={td}>{d.group || "—"}</td>
                  <td style={td}>⚙ ✏</td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

function Dot({ on }: { on: boolean }) {
  return (
    <span style={{
      display: "inline-block", width: 11, height: 11, borderRadius: "50%",
      background: on ? "var(--ok)" : "var(--danger)",
    }} />
  );
}

const toolbar: React.CSSProperties = {
  display: "flex",
  gap: 10,
  alignItems: "center",
  padding: "12px 16px",
  background: "#f2f5f6",
  flexWrap: "wrap",
};
const table: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  background: "#fff",
  fontSize: 15,
};
const th: React.CSSProperties = {
  background: "var(--th-bg)",
  color: "#fff",
  padding: "10px 6px",
  textAlign: "center",
  fontWeight: 600,
};
const td: React.CSSProperties = {
  padding: "9px 6px",
  textAlign: "center",
  borderBottom: "1px solid #edf1f2",
};
const badge: React.CSSProperties = { fontSize: 12, padding: "2px 10px", borderRadius: 10 };
const badgeOk: React.CSSProperties = { background: "#e4f3ea", color: "var(--ok)" };
const badgeOff: React.CSSProperties = { background: "#f7e6e4", color: "var(--danger)" };
