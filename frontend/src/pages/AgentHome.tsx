import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import Icon from "../components/Icon";
import { symbolOf } from "../currency";

/**
 * رئيسية الوكيل الكبير.
 *
 * لا يشحن ألعاباً من هنا — يدير دكاكينه. فالأرقام الأربعة هي ما يقرّر عليه:
 * رصيده، عدد دكاكينه، طلباتهم الناجحة، وربحه منها (فرق سعرَيه، لا ربح المتجر).
 */
export default function AgentHome() {
  const [s, setS] = useState<any>(null);
  const [dealers, setDealers] = useState<any[]>([]);

  useEffect(() => {
    api.get("/agent/summary/").then((r) => setS(r.data));
    api.get("/agent/dealers/").then((r) => setDealers(r.data.results || []));
  }, []);

  const money = (v: string | number) =>
    Number(v).toLocaleString("en-US", { minimumFractionDigits: 2 });
  const balCls = (v: number) => (v < 0 ? "bal-neg" : v > 0 ? "bal-pos" : "bal-zero");

  if (!s) return <div style={{ padding: 30 }}>جارٍ التحميل...</div>;
  const cur = symbolOf(s.currency || "");
  const debtors = dealers.filter((d) => Number(d.balance) < 0);

  return (
    <div style={{ maxWidth: 1320, margin: "0 auto", padding: "22px 20px 40px" }}>
      <div className="summary">
        <Stat icon="wallet" label="رصيدي" value={`${money(s.balance)} ${cur}`}
          cls={balCls(Number(s.balance))} />
        <Stat icon="users" label="دكاكيني" value={s.dealers} />
        <Stat icon="chart" label="طلبات ناجحة" value={s.orders} />
        <Stat icon="dollar" label="أرباحي منها" value={`${money(s.profit)} ${cur}`} cls="bal-pos" />
      </div>

      <div className="card" style={{ marginTop: 18 }}>
        <div className="card-title" style={{ justifyContent: "space-between" }}>
          <span>
            <Icon name="users" size={16} style={{ color: "var(--primary)", marginInlineEnd: 6 }} />
            دكاكيني
          </span>
          <Link to="/bigagent/dealers" style={{ fontSize: 13, color: "var(--primary)" }}>
            إدارة الدكاكين ←
          </Link>
        </div>
        <div className="table-scroll">
          <table className="grid">
            <thead>
              <tr><th>الرقم</th><th className="cell-start">الاسم</th><th>الرصيد</th><th>الحالة</th></tr>
            </thead>
            <tbody>
              {dealers.length === 0 ? (
                <tr><td colSpan={4} style={{ padding: 26, color: "var(--muted)" }}>
                  لا دكاكين بعد — أضف أوّل دكان من «الوكلاء ← قائمة الوكلاء».
                </td></tr>
              ) : dealers.slice(0, 8).map((d) => (
                <tr key={d.id}>
                  <td className="num" style={{ color: "var(--faint)", fontSize: 12.5 }}>{d.login_id}</td>
                  <td className="cell-start" style={{ fontWeight: 700 }}>{d.name}</td>
                  <td className={`num ${balCls(Number(d.balance))}`}>{money(d.balance)} {cur}</td>
                  <td>
                    <span style={{
                      display: "inline-block", width: 14, height: 14, borderRadius: "50%",
                      border: "2px solid rgba(0,0,0,.12)",
                      background: d.status === "active" ? "var(--ok)" : "var(--danger)",
                    }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {debtors.length > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="card-title">
            <Icon name="warning" size={16} style={{ color: "var(--danger)" }} />
            {" "}دكاكين برصيد سالب ({debtors.length})
          </div>
          <div style={{ padding: "12px 16px", fontSize: 13.5, lineHeight: 2 }}>
            {debtors.map((d) => (
              <span key={d.id} style={{ marginInlineEnd: 16 }}>
                {d.name} <b className="num bal-neg">{money(d.balance)} {cur}</b>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ icon, label, value, cls }:
  { icon: string; label: string; value: any; cls?: string }) {
  return (
    <div className="stat">
      <div className="label">
        <Icon name={icon} size={15} style={{ color: "var(--primary)" }} /> {label}
      </div>
      <div className={`value num ${cls || ""}`}>{value}</div>
      <span className="spark" />
    </div>
  );
}
