import { useEffect, useMemo, useState } from "react";
import { api, type Dealer } from "../api";
import WalletModal from "../components/WalletModal";
import DealerCreateModal from "../components/DealerCreateModal";
import DealerSettingsModal from "../components/DealerSettingsModal";
import StatementModal from "../components/StatementModal";
import { downloadCsv } from "../csv";
import Icon from "../components/Icon";
import { symbolOf, useBaseSymbol } from "../currency";

type Filter = "all" | "active" | "neg" | "off";

export default function Dealers() {
  const cur = useBaseSymbol();
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ dealer: Dealer; action: "topup" | "deduct" } | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [settingsFor, setSettingsFor] = useState<number | null>(null);
  const [statementFor, setStatementFor] = useState<Dealer | null>(null);

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

  const money = (v: string | number) =>
    Number(v).toLocaleString("en-US", { minimumFractionDigits: 2 });

  // الرصيد واحد موقّع: سالب = مديونية
  const shown = useMemo(() => dealers.filter((d) => {
    const bal = Number(d.balance);
    if (filter === "active") return d.active;
    if (filter === "off") return !d.active;
    if (filter === "neg") return bal < 0;
    return true;
  }), [dealers, filter]);

  const stats = useMemo(() => ({
    total: dealers.length,
    active: dealers.filter((d) => d.active).length,
    net: dealers.reduce((s, d) => s + Number(d.balance), 0),
    negative: dealers.filter((d) => Number(d.balance) < 0).length,
  }), [dealers]);

  const balCls = (v: number) => (v < 0 ? "bal-neg" : v > 0 ? "bal-pos" : "bal-zero");

  /** يصدّر ما هو ظاهر بعد البحث والفلترة — لا القائمة كاملةً. */
  function exportExcel() {
    downloadCsv(
      "قائمة-الوكلاء",
      ["رقم الوكيل", "الاسم", "الرصيد", "العملة", "الحد الائتماني",
       "الحالة", "المجموعة", "عدد الدكاكين"],
      shown.map((d) => [
        d.login_id, d.name, d.balance, d.currency, d.credit_limit,
        d.active ? "نشط" : "موقوف", d.group || "", d.children_count,
      ]),
    );
  }

  return (
    <div style={{ maxWidth: 1320, margin: "0 auto", padding: "22px 20px 40px" }}>
      {/* شريط المؤشّرات */}
      <div className="summary">
        <div className="stat">
          <div className="label"><Icon name="users" size={15} style={{ color: "var(--primary)" }} /> إجمالي الوكلاء</div>
          <div className="value num">{stats.total}</div><span className="spark" />
        </div>
        <div className="stat">
          <div className="label"><Icon name="check" size={15} style={{ color: "var(--primary)" }} /> نشطون</div>
          <div className="value num">{stats.active} <small style={{ fontSize: 13, color: "var(--faint)" }}>/ {stats.total}</small></div>
          <span className="spark" />
        </div>
        <div className="stat">
          <div className="label"><Icon name="wallet" size={15} style={{ color: "var(--primary)" }} /> صافي أرصدة الوكلاء</div>
          <div className={`value num ${balCls(stats.net)}`}>{money(stats.net)} <small style={{ fontSize: 13, color: "var(--faint)" }}>{cur}</small></div>
          <span className="spark" />
        </div>
        <div className="stat">
          <div className="label"><Icon name="warning" size={15} style={{ color: "var(--primary)" }} /> وكلاء برصيد سالب</div>
          <div className="value num" style={{ color: "var(--debt)" }}>{stats.negative}</div><span className="spark" />
        </div>
      </div>

      {/* شريط الأدوات */}
      <div className="toolbar">
        <div style={{ position: "relative", flex: 1, minWidth: 220 }}>
          <input placeholder="ابحث باسم الوكيل أو رقمه…" value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load(q)}
            style={{ width: "100%", height: 40, paddingInlineStart: 36, borderRadius: 10 }} />
          <span style={{ position: "absolute", insetInlineStart: 11, top: 11, color: "var(--faint)" }}>
            <Icon name="search" size={17} />
          </span>
        </div>
        <div className="segment">
          {([["all", "الكل"], ["active", "نشط"], ["neg", "رصيد سالب"], ["off", "موقوف"]] as [Filter, string][]).map(([k, label]) => (
            <button key={k} className={filter === k ? "active" : ""} onClick={() => setFilter(k)}>{label}</button>
          ))}
        </div>
        <span style={{ marginInlineStart: "auto", color: "var(--muted)", fontSize: 13 }}>
          العدد: <b style={{ color: "var(--text)" }}>{shown.length}</b>
        </span>
        <button className="btn" onClick={exportExcel} disabled={shown.length === 0}
          title="تصدير الوكلاء الظاهرين بعد البحث والفلترة">
          <Icon name="excel" size={15} style={ib} />تصدير Excel
        </button>
        <button className="btn g" onClick={() => setCreateOpen(true)}>
          <Icon name="plus" size={15} style={ib} />إضافة وكيل
        </button>
      </div>

      {/* الجدول — النمط المعتمد */}
      <div className="card">
        <div className="card-title"><Icon name="users" size={16} style={{ color: "var(--primary)" }} /> قائمة الوكلاء</div>
        <div className="table-scroll">
          <table className="grid">
            <thead>
              <tr>
                <th><input type="checkbox" title="تحديد الكل" /></th>
                <th>الرقم</th>
                <th className="cell-start">اسم الوكيل</th>
                <th>الرصيد</th>
                <th>الحد الائتماني</th>
                <th>الحالة</th>
                <th>المجموعة</th>
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ padding: 30, color: "var(--muted)" }}>جارٍ التحميل...</td></tr>
              ) : shown.length === 0 ? (
                <tr><td colSpan={8} style={{ padding: 30, color: "var(--muted)" }}>لا يوجد وكلاء مطابقون</td></tr>
              ) : shown.map((d) => {
                const bal = Number(d.balance);
                return (
                  <tr key={d.id}>
                    <td><input type="checkbox" /></td>
                    <td className="num" style={{ color: "var(--faint)", fontSize: 12.5 }}>{d.login_id}</td>
                    <td className="cell-start">
                      <div style={{ fontWeight: 700 }}>
                        {d.name}
                        {d.children_count > 0 && <span style={{ color: "var(--primary)", fontSize: 11, fontWeight: 700 }}> ({d.children_count})</span>}
                      </div>
                    </td>
                    <td>
                      <span className={`num ${balCls(bal)}`} style={{ fontSize: 14.5 }}>{money(bal)}</span>
                      <span style={{ fontSize: 11, color: "var(--faint)", marginInlineStart: 3 }}>{symbolOf(d.currency)}</span>
                    </td>
                    <td className="num" style={{ color: "var(--muted)" }}>{money(d.credit_limit)}</td>
                    <td>
                      <span className={`pill ${d.active ? "on" : "off"}`}>{d.active ? "نشط" : "موقوف"}</span>
                      <div className="chips">
                        <span className={`chip ${d.shopping ? "on" : ""}`}>مشتريات</span>
                        <span className={`chip ${d.oyun ? "on" : ""}`}>ألعاب</span>
                      </div>
                    </td>
                    <td className="num" style={{ fontWeight: 700, color: "var(--muted)" }}>{d.group || "—"}</td>
                    <td>
                      <div style={{ display: "flex", gap: 4, justifyContent: "center" }}>
                        <IconBtn name="plus" color="var(--ok)" title="شحن رصيد" onClick={() => setModal({ dealer: d, action: "topup" })} />
                        <IconBtn name="minus" color="var(--danger)" title="خصم رصيد" onClick={() => setModal({ dealer: d, action: "deduct" })} />
                        <IconBtn name="chart" color="var(--primary)" title="كشف حساب"
                          onClick={() => setStatementFor(d)} />
                        <IconBtn name="settings" color="var(--primary-dark)" title="إعدادات الوكيل"
                          onClick={() => setSettingsFor(d.id)} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <WalletModal dealer={modal.dealer} action={modal.action}
          onClose={() => setModal(null)}
          onDone={(balance) => updateBalance(modal.dealer.id, balance)} />
      )}

      {createOpen && (
        <DealerCreateModal
          onClose={() => setCreateOpen(false)}
          onDone={() => { setCreateOpen(false); load(q); }} />
      )}

      {settingsFor !== null && (
        <DealerSettingsModal dealerId={settingsFor}
          onClose={() => setSettingsFor(null)}
          onSaved={() => load(q)} />
      )}

      {statementFor && (
        <StatementModal dealerId={statementFor.id} dealerName={statementFor.name}
          onClose={() => setStatementFor(null)} />
      )}
    </div>
  );
}

function IconBtn({ name, color, title, onClick }:
  { name: string; color: string; title: string; onClick?: () => void }) {
  return (
    <button onClick={onClick} title={title} style={{
      border: "1px solid var(--border)", background: "var(--surface)", color,
      width: 30, height: 30, borderRadius: 8, display: "flex",
      alignItems: "center", justifyContent: "center", cursor: "pointer",
    }}>
      <Icon name={name} size={15} />
    </button>
  );
}

const ib: React.CSSProperties = { marginInlineEnd: 5, verticalAlign: -2 };
