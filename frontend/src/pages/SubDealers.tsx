import { useEffect, useState } from "react";
import { api } from "../api";
import Icon from "../components/Icon";
import { symbolOf } from "../currency";

interface Row {
  id: number;
  dealer_no: number | null;
  login_id: string;
  name: string;
  balance: string;
  credit_limit: string;
  currency: string;
  active: boolean;
  whatsapp: string;
}
interface Group {
  agent: Row;
  dealers: Row[];
  dealers_count: number;
  dealers_balance: string;
}

/**
 * «وكلاء تحت وكيل» — الشجرة لا القائمة.
 *
 * الوكيل الكبير يشتري من المتجر ويبيع لدكاكينه، فحسابه لا يُقرأ وحده: جدول لكل
 * كبير، رصيده في ترويسته، ودكاكينه تحته بأرصدتها ومجموعها. من رأى الدكان معزولاً
 * عن شجرته لم يعرف من يسدّد عنه.
 */
export default function SubDealers() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [orphans, setOrphans] = useState<Row[]>([]);
  const [base, setBase] = useState("USD");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    api.get("/dealers/hierarchy/")
      .then((r) => {
        setGroups(r.data.results || []);
        setOrphans(r.data.orphans || []);
        setBase(r.data.base_currency || "USD");
      })
      .catch((e) => setErr(e?.response?.data?.detail || "تعذّر الجلب"))
      .finally(() => setLoading(false));
  }, []);

  const money = (v: string | number) =>
    Number(v).toLocaleString("en-US", { minimumFractionDigits: 2 });
  const balCls = (v: number) => (v < 0 ? "bal-neg" : v > 0 ? "bal-pos" : "bal-zero");

  if (loading) return <div style={{ padding: 30 }}>جارٍ التحميل...</div>;

  return (
    <div style={{ maxWidth: 1320, margin: "0 auto", padding: "22px 20px 40px" }}>
      <h2 style={{ fontSize: 20, color: "var(--primary-dark)", marginBottom: 6 }}>
        <Icon name="tree" size={18} style={{ marginInlineEnd: 8, verticalAlign: -3 }} />
        وكلاء تحت وكيل
      </h2>
      <div style={{ color: "var(--muted)", fontSize: 13, marginBottom: 16 }}>
        جدول لكل وكيل كبير، وتحته الدكاكين التابعة له. الأرصدة بعملة الدفتر ({base}).
      </div>

      {err && <div style={errBox}>{err}</div>}

      {groups.length === 0 && orphans.length === 0 && (
        <div className="card" style={{ padding: 30, color: "var(--muted)" }}>
          لا يوجد وكلاء كبار بعد — الوكيل الكبير هو من تتبعه دكاكين.
        </div>
      )}

      {groups.map((g) => (
        <div className="card" key={g.agent.id} style={{ marginBottom: 18 }}>
          <div className="card-title" style={{ justifyContent: "space-between" }}>
            <span>
              <Icon name="users" size={16} style={{ color: "var(--primary)", marginInlineEnd: 6 }} />
              {g.agent.name}
              <span style={{ color: "var(--faint)", fontWeight: 400, fontSize: 12.5 }}>
                {" "}· رقم {g.agent.dealer_no ?? "—"} · {g.dealers_count} دكاناً
              </span>
              {!g.agent.active && <span style={offTag}>معطّل</span>}
            </span>
            <span style={{ fontSize: 13, color: "var(--muted)" }}>
              رصيد الوكيل الكبير:{" "}
              <b className={`num ${balCls(Number(g.agent.balance))}`}>
                {money(g.agent.balance)} {symbolOf(g.agent.currency)}
              </b>
              <span style={{ marginInlineStart: 14 }}>
                مجموع دكاكينه:{" "}
                <b className={`num ${balCls(Number(g.dealers_balance))}`}>
                  {money(g.dealers_balance)} {symbolOf(g.agent.currency)}
                </b>
              </span>
            </span>
          </div>

          <div className="table-scroll">
            <table className="grid">
              <thead>
                <tr>
                  <th>الرقم</th>
                  <th className="cell-start">اسم الدكان</th>
                  <th>الرصيد</th>
                  <th>الحد الائتماني</th>
                  <th>الحالة</th>
                </tr>
              </thead>
              <tbody>
                {g.dealers.length === 0 ? (
                  <tr><td colSpan={5} style={{ padding: 22, color: "var(--muted)" }}>
                    لا دكاكين تحت هذا الوكيل بعد
                  </td></tr>
                ) : g.dealers.map((d) => (
                  <tr key={d.id}>
                    <td className="num" style={{ color: "var(--faint)", fontSize: 12.5 }}
                      title={`رقم الدخول: ${d.login_id}`}>{d.dealer_no ?? "—"}</td>
                    <td className="cell-start" style={{ fontWeight: 700 }}>{d.name}</td>
                    <td>
                      <span className={`num ${balCls(Number(d.balance))}`} style={{ fontSize: 14.5 }}>
                        {money(d.balance)}
                      </span>
                      <span style={{ fontSize: 11, color: "var(--faint)", marginInlineStart: 3 }}>
                        {symbolOf(d.currency)}
                      </span>
                    </td>
                    <td className="num" style={{ color: "var(--muted)" }}>{money(d.credit_limit)}</td>
                    <td>
                      <span title={d.active ? "نشط" : "معطّل"} style={{
                        display: "inline-block", width: 14, height: 14, borderRadius: "50%",
                        border: "2px solid rgba(0,0,0,.12)",
                        background: d.active ? "var(--ok)" : "var(--danger)",
                      }} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {orphans.length > 0 && (
        <div className="card">
          <div className="card-title">
            <Icon name="warning" size={16} style={{ color: "var(--danger)" }} />
            {" "}دكاكين تتبع وكيلاً لم يعد كبيراً
          </div>
          <div className="table-scroll">
            <table className="grid">
              <thead>
                <tr><th>الرقم</th><th className="cell-start">الاسم</th><th>الرصيد</th></tr>
              </thead>
              <tbody>
                {orphans.map((d) => (
                  <tr key={d.id}>
                    <td className="num" style={{ color: "var(--faint)" }}>{d.dealer_no ?? "—"}</td>
                    <td className="cell-start" style={{ fontWeight: 700 }}>{d.name}</td>
                    <td className={`num ${balCls(Number(d.balance))}`}>{money(d.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

const errBox: React.CSSProperties = {
  background: "#fdecea", border: "1px solid #f5c6c2", color: "var(--danger)",
  fontSize: 13, padding: "10px 14px", borderRadius: 6, marginBottom: 14,
};
const offTag: React.CSSProperties = {
  marginInlineStart: 8, fontSize: 11, fontWeight: 700, color: "var(--danger)",
  border: "1px solid var(--danger)", borderRadius: 4, padding: "1px 6px",
};
