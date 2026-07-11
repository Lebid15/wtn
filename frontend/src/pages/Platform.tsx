import { useEffect, useState } from "react";
import { api } from "../api";
import { useAuth } from "../auth";
import Tickets from "../components/Tickets";

interface Tenant {
  id: number; name: string; subdomain: string; status: string;
  theme: string; dealers: number; created_at: string;
  sub_plan: string; sub_plan_label: string; sub_monthly_price: string;
  sub_yearly_price: string; sub_expires_at: string | null;
  sub_active: boolean; sub_days_left: number | null;
}
interface Stats { tenants: number; active: number; dealers: number }
interface LibGame {
  id: number; uuid: string; name: string; image_url: string; description: string;
  require_player_id: boolean; product_count: number;
}
interface LibProduct {
  id: number; game: number; name: string; suggested_cost: string;
  suggested_price: string; kupur: string;
}

type Tab = "tenants" | "library" | "invoices" | "messages";

export default function Platform() {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState<Tab>("tenants");

  return (
    <div style={{ minHeight: "100vh", background: "#0f172a", color: "#e2e8f0" }}>
      <div style={header}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 24 }}>🏢</span>
          <b style={{ fontSize: 18 }}>لوحة المنصّة</b>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <span style={{ fontSize: 13, opacity: 0.8 }}>{user?.name}</span>
          <button onClick={logout} style={logoutBtn}>خروج</button>
        </div>
      </div>

      <div style={subnav}>
        <button onClick={() => setTab("tenants")} style={{ ...tabBtn, ...(tab === "tenants" ? tabActive : {}) }}>🏢 المستأجرون</button>
        <button onClick={() => setTab("library")} style={{ ...tabBtn, ...(tab === "library" ? tabActive : {}) }}>🌐 المنتجات العالمية</button>
        <button onClick={() => setTab("invoices")} style={{ ...tabBtn, ...(tab === "invoices" ? tabActive : {}) }}>🧾 الفواتير</button>
        <button onClick={() => setTab("messages")} style={{ ...tabBtn, ...(tab === "messages" ? tabActive : {}) }}>💬 الرسائل</button>
      </div>

      <div style={{ maxWidth: 1150, margin: "0 auto", padding: 24 }}>
        {tab === "tenants" && <TenantsTab />}
        {tab === "library" && <LibraryTab />}
        {tab === "invoices" && <BillingTab />}
        {tab === "messages" && (
          <div style={{ background: "#fff", borderRadius: 12, padding: 20 }}>
            <Tickets canCreate={false} title="رسائل المتاجر" />
          </div>
        )}
      </div>
    </div>
  );
}

/* ===== المستأجرون ===== */
function TenantsTab() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [subFor, setSubFor] = useState<Tenant | null>(null);

  function load() {
    api.get("/platform/tenants/").then((r) => { setTenants(r.data.results); setStats(r.data.stats); });
  }
  useEffect(() => load(), []);

  async function toggle(t: Tenant) {
    const action = t.status === "active" ? "suspend" : "activate";
    await api.post(`/platform/tenants/${t.id}/${action}/`, {});
    load();
  }

  return (
    <>
      {stats && (
        <div style={{ display: "flex", gap: 16, marginBottom: 24 }}>
          <StatCard label="المستأجرون" value={stats.tenants} icon="🏢" />
          <StatCard label="النشطون" value={stats.active} icon="✅" />
          <StatCard label="إجمالي الوكلاء" value={stats.dealers} icon="👥" />
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
        <h2 style={{ fontSize: 18 }}>المستأجرون</h2>
        <button style={addBtn} onClick={() => setShowCreate(true)}>➕ إضافة مستأجر (بيع نسخة)</button>
      </div>
      <div style={{ overflow: "hidden", borderRadius: 10, border: "1px solid #1e293b" }}>
        <table style={table}>
          <thead>
            <tr>{["#", "الاسم", "النطاق الفرعي", "الوكلاء", "الاشتراك", "الحالة", "إجراء"].map((h) => <th key={h} style={th}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {tenants.map((t) => (
              <tr key={t.id} style={{ borderTop: "1px solid #1e293b" }}>
                <td style={td}>{t.id}</td>
                <td style={{ ...td, fontWeight: 700 }}>{t.name}</td>
                <td style={{ ...td, direction: "ltr", color: "#7dd3fc" }}>{t.subdomain}.example.com</td>
                <td style={td}>{t.dealers}</td>
                <td style={td}>
                  {t.sub_active ? (
                    <span style={{ color: "#4ade80", fontSize: 13 }}>
                      {t.sub_plan_label} · {t.sub_days_left}ي
                    </span>
                  ) : (
                    <span style={{ color: "#64748b", fontSize: 13 }}>بلا اشتراك</span>
                  )}
                </td>
                <td style={td}>
                  <span style={{ color: t.status === "active" ? "#4ade80" : "#f87171", fontWeight: 700 }}>
                    ● {t.status === "active" ? "نشط" : "موقوف"}
                  </span>
                </td>
                <td style={{ ...td, whiteSpace: "nowrap" }}>
                  <button style={subBtn} onClick={() => setSubFor(t)}>الاشتراك</button>
                  <button style={t.status === "active" ? suspendBtn : activateBtn} onClick={() => toggle(t)}>
                    {t.status === "active" ? "تعليق" : "تفعيل"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showCreate && <CreateTenant onClose={() => setShowCreate(false)} onDone={() => { setShowCreate(false); load(); }} />}
      {subFor && <SubscriptionModal tenant={subFor} onClose={() => setSubFor(null)} onDone={() => { setSubFor(null); load(); }} />}
    </>
  );
}

/* ===== المنتجات العالمية (المكتبة) ===== */
function LibraryTab() {
  const [games, setGames] = useState<LibGame[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [manage, setManage] = useState<LibGame | null>(null);

  function load() { api.get("/platform/library/games/").then((r) => setGames(r.data.results || r.data)); }
  useEffect(() => load(), []);

  async function del(g: LibGame) {
    if (!confirm(`حذف "${g.name}" من المكتبة العالمية؟ (لا يؤثّر على من استوردها)`)) return;
    await api.delete(`/platform/library/games/${g.id}/`);
    load();
  }

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
        <h2 style={{ fontSize: 18 }}>المنتجات العالمية</h2>
        <button style={addBtn} onClick={() => setShowAdd(true)}>➕ إضافة منتج عالمي</button>
      </div>
      <p style={{ color: "#94a3b8", fontSize: 13, marginBottom: 16 }}>
        منتجات جاهزة مع باقاتها؛ يستوردها أصحاب المتاجر بضغطة، ويعدّلون نسختهم بحرّية دون التأثير هنا.
      </p>
      <div style={{ overflow: "hidden", borderRadius: 10, border: "1px solid #1e293b" }}>
        <table style={table}>
          <thead>
            <tr>{["#", "المنتج", "الصورة", "الباقات", "معرّف لاعب", "إجراء"].map((h) => <th key={h} style={th}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {games.length === 0 ? (
              <tr><td colSpan={6} style={{ ...td, color: "#64748b", padding: 24 }}>لا منتجات عالمية بعد — أضف أول منتج.</td></tr>
            ) : games.map((g) => (
              <tr key={g.id} style={{ borderTop: "1px solid #1e293b" }}>
                <td style={td}>{g.id}</td>
                <td style={{ ...td, fontWeight: 700, textAlign: "right", paddingInlineStart: 14 }}>{g.name}</td>
                <td style={td}>{g.image_url ? <img src={g.image_url} style={{ width: 34, height: 34, borderRadius: 6, objectFit: "cover" }} /> : "—"}</td>
                <td style={td}><b style={{ color: "#7dd3fc" }}>{g.product_count}</b></td>
                <td style={td}>{g.require_player_id ? "✅" : "—"}</td>
                <td style={td}>
                  <button style={pkgBtn} onClick={() => setManage(g)}>الباقات</button>
                  <button style={suspendBtn} onClick={() => del(g)}>حذف</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showAdd && <AddLibGame onClose={() => setShowAdd(false)} onDone={() => { setShowAdd(false); load(); }} />}
      {manage && <ManagePackages game={manage} onClose={() => { setManage(null); load(); }} />}
    </>
  );
}

function AddLibGame({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [f, setF] = useState({ name: "", image_url: "", description: "", require_player_id: false });
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr("");
    try { await api.post("/platform/library/games/", f); onDone(); }
    catch (e: any) { setErr(e?.response?.data?.detail || "فشل الإضافة"); }
    finally { setBusy(false); }
  }
  return (
    <div style={overlay} onClick={onClose}>
      <form style={modal} onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <div style={{ background: "#0f172a", padding: "14px 18px", fontWeight: 700, fontSize: 16 }}>إضافة منتج عالمي</div>
        <div style={{ padding: 20, color: "#0f172a" }}>
          <F label="اسم المنتج"><input style={inp} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required autoFocus /></F>
          <F label="رابط الصورة (اختياري)"><input style={inp} value={f.image_url} onChange={(e) => setF({ ...f, image_url: e.target.value })} placeholder="https://..." /></F>
          <F label="الوصف (اختياري)"><input style={inp} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></F>
          <label style={{ display: "flex", alignItems: "center", gap: 8, margin: "8px 0", color: "#0f172a", fontSize: 14 }}>
            <input type="checkbox" checked={f.require_player_id} onChange={(e) => setF({ ...f, require_player_id: e.target.checked })} />
            يتطلّب معرّف لاعب (ID)
          </label>
          {err && <div style={errBox}>{err}</div>}
          <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
            <button className="btn g" style={{ flex: 1, height: 40 }} disabled={busy}>{busy ? "جارٍ..." : "حفظ"}</button>
            <button type="button" className="btn" style={{ height: 40, background: "#8a999e" }} onClick={onClose}>إلغاء</button>
          </div>
        </div>
      </form>
    </div>
  );
}

function ManagePackages({ game, onClose }: { game: LibGame; onClose: () => void }) {
  const [rows, setRows] = useState<LibProduct[]>([]);
  const [f, setF] = useState({ name: "", suggested_cost: "", suggested_price: "", kupur: "" });
  const [busy, setBusy] = useState(false);

  function load() { api.get(`/platform/library/products/?game=${game.id}`).then((r) => setRows(r.data.results || r.data)); }
  useEffect(() => load(), []);

  async function add(e: React.FormEvent) {
    e.preventDefault(); setBusy(true);
    try {
      await api.post("/platform/library/products/", {
        game: game.id, name: f.name,
        suggested_cost: f.suggested_cost || "0", suggested_price: f.suggested_price || "0", kupur: f.kupur,
      });
      setF({ name: "", suggested_cost: "", suggested_price: "", kupur: "" });
      load();
    } finally { setBusy(false); }
  }
  async function del(id: number) { await api.delete(`/platform/library/products/${id}/`); load(); }

  return (
    <div style={overlay} onClick={onClose}>
      <div style={{ ...modal, width: 620, color: "#0f172a" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ background: "#0f172a", color: "#e2e8f0", padding: "14px 18px", fontWeight: 700, fontSize: 16, display: "flex", justifyContent: "space-between" }}>
          <span>باقات: {game.name}</span>
          <button onClick={onClose} style={{ background: "transparent", border: 0, color: "#94a3b8", fontSize: 18, cursor: "pointer" }}>✕</button>
        </div>
        <div style={{ padding: 18 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr>{["الباقة", "التكلفة", "السعر المقترح", "الكوبور", ""].map((h) => <th key={h} style={{ ...th, background: "#e2e8f0", color: "#475569" }}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: 16, textAlign: "center", color: "#94a3b8" }}>لا باقات — أضف أدناه.</td></tr>
              ) : rows.map((p) => (
                <tr key={p.id} style={{ borderTop: "1px solid #eef1f2" }}>
                  <td style={{ padding: "8px", fontWeight: 700 }}>{p.name}</td>
                  <td style={{ padding: "8px", textAlign: "center" }}>{p.suggested_cost}</td>
                  <td style={{ padding: "8px", textAlign: "center" }}>{p.suggested_price}</td>
                  <td style={{ padding: "8px", textAlign: "center" }}>{p.kupur || "—"}</td>
                  <td style={{ padding: "8px", textAlign: "center" }}><button style={suspendBtn} onClick={() => del(p.id)}>حذف</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          <form onSubmit={add} style={{ display: "flex", gap: 8, marginTop: 14, alignItems: "end", flexWrap: "wrap" }}>
            <Field label="الباقة"><input style={{ ...inp, width: 140 }} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required /></Field>
            <Field label="التكلفة"><input style={{ ...inp, width: 90 }} type="number" step="0.01" value={f.suggested_cost} onChange={(e) => setF({ ...f, suggested_cost: e.target.value })} /></Field>
            <Field label="السعر"><input style={{ ...inp, width: 90 }} type="number" step="0.01" value={f.suggested_price} onChange={(e) => setF({ ...f, suggested_price: e.target.value })} /></Field>
            <Field label="الكوبور"><input style={{ ...inp, width: 90 }} value={f.kupur} onChange={(e) => setF({ ...f, kupur: e.target.value })} /></Field>
            <button className="btn g" style={{ height: 38 }} disabled={busy}>{busy ? "..." : "➕ إضافة"}</button>
          </form>
        </div>
      </div>
    </div>
  );
}

/* ===== الفواتير ===== */
function BillingTab() {
  const [rows, setRows] = useState<any[]>([]);
  const [totals, setTotals] = useState<any>(null);
  const [filter, setFilter] = useState("all");

  function load() {
    const params: any = {};
    if (filter !== "all") params.status = filter;
    api.get("/platform/invoices/", { params }).then((r) => { setRows(r.data.results); setTotals(r.data.totals); });
  }
  useEffect(load, [filter]);

  async function mark(inv: any) {
    const action = inv.status === "paid" ? "unpaid" : "paid";
    await api.post(`/platform/invoices/${inv.id}/${action}/`, {});
    load();
  }

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
        <h2 style={{ fontSize: 18 }}>فواتير الاشتراكات</h2>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} style={{ height: 34 }}>
          <option value="all">الكل</option>
          <option value="unpaid">غير مدفوعة</option>
          <option value="paid">مدفوعة</option>
        </select>
        {totals && (
          <span style={{ marginInlineStart: "auto", color: "#94a3b8", fontSize: 14 }}>
            {totals.count} فاتورة · غير مدفوعة: {totals.unpaid} · الإجمالي: {totals.total_amount}
          </span>
        )}
      </div>
      <div style={{ overflow: "hidden", borderRadius: 10, border: "1px solid #1e293b" }}>
        <table style={table}>
          <thead>
            <tr>{["#", "المتجر", "الخطة", "المبلغ", "الفترة", "الحالة", "إجراء"].map((h) => <th key={h} style={th}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={7} style={{ ...td, color: "#64748b", padding: 24 }}>لا فواتير — تُنشأ عند تفعيل اشتراك.</td></tr>
            ) : rows.map((i) => (
              <tr key={i.id} style={{ borderTop: "1px solid #1e293b" }}>
                <td style={td}>{i.id}</td>
                <td style={{ ...td, fontWeight: 700 }}>{i.tenant_name}</td>
                <td style={td}>{i.plan_label}</td>
                <td style={{ ...td, color: "#7dd3fc", fontWeight: 700 }}>{i.amount}</td>
                <td style={{ ...td, color: "#94a3b8", fontSize: 12, direction: "ltr" }}>{i.period_start} → {i.period_end}</td>
                <td style={td}>
                  <span style={{ color: i.status === "paid" ? "#4ade80" : "#f87171", fontWeight: 700 }}>
                    ● {i.status_label}
                  </span>
                </td>
                <td style={td}>
                  <button style={i.status === "paid" ? suspendBtn : activateBtn} onClick={() => mark(i)}>
                    {i.status === "paid" ? "إلغاء الدفع" : "تعليم مدفوعة"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function SubscriptionModal({ tenant, onClose, onDone }: { tenant: Tenant; onClose: () => void; onDone: () => void }) {
  const [monthly, setMonthly] = useState(tenant.sub_monthly_price);
  const [yearly, setYearly] = useState(tenant.sub_yearly_price);
  const [t, setT] = useState(tenant);
  const [busy, setBusy] = useState("");

  async function call(body: any, tag: string) {
    setBusy(tag);
    try { const r = await api.post(`/platform/tenants/${tenant.id}/subscription/`, body); setT(r.data); }
    finally { setBusy(""); }
  }

  return (
    <div style={overlay} onClick={onClose}>
      <div style={{ ...modal, width: 460, color: "#0f172a" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ background: "#0f172a", color: "#e2e8f0", padding: "14px 18px", fontWeight: 700, fontSize: 16 }}>
          اشتراك: {tenant.name}
        </div>
        <div style={{ padding: 20 }}>
          <div style={{ background: t.sub_active ? "#e7f6ec" : "#f1f5f9", borderRadius: 8, padding: "12px 14px", marginBottom: 16, fontSize: 14 }}>
            {t.sub_active
              ? <>الخطة الحالية: <b>{t.sub_plan_label}</b> · تنتهي في <b>{t.sub_expires_at}</b> (متبقٍّ {t.sub_days_left} يوم)</>
              : <span style={{ color: "#64748b" }}>لا يوجد اشتراك فعّال حالياً</span>}
          </div>

          <div style={{ fontWeight: 700, marginBottom: 8 }}>أسعار هذا المتجر</div>
          <div style={{ display: "flex", gap: 12, marginBottom: 6 }}>
            <F label="السعر الشهري"><input style={inp} type="number" step="0.01" value={monthly} onChange={(e) => setMonthly(e.target.value)} /></F>
            <F label="السعر السنوي"><input style={inp} type="number" step="0.01" value={yearly} onChange={(e) => setYearly(e.target.value)} /></F>
          </div>
          <button className="btn" style={{ background: "#475569", color: "#fff", height: 36, width: "100%" }}
            disabled={busy === "prices"}
            onClick={() => call({ op: "prices", monthly_price: monthly, yearly_price: yearly }, "prices")}>
            {busy === "prices" ? "..." : "حفظ الأسعار"}
          </button>

          <div style={{ fontWeight: 700, margin: "18px 0 8px" }}>تفعيل / تجديد</div>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn g" style={{ flex: 1, height: 40 }} disabled={busy === "monthly"}
              onClick={() => call({ op: "activate", plan: "monthly" }, "monthly")}>
              شهري (+30 يوم)
            </button>
            <button className="btn g" style={{ flex: 1, height: 40 }} disabled={busy === "yearly"}
              onClick={() => call({ op: "activate", plan: "yearly" }, "yearly")}>
              سنوي (+365 يوم)
            </button>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
            <button className="btn" style={{ flex: 1, height: 38, background: "#7f1d1d", color: "#fecaca" }} disabled={busy === "cancel"}
              onClick={() => call({ op: "cancel" }, "cancel")}>إلغاء الاشتراك</button>
            <button className="btn" style={{ flex: 1, height: 38, background: "#8a999e" }} onClick={onDone}>تم</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: number; icon: string }) {
  return (
    <div style={{ flex: 1, background: "#1e293b", borderRadius: 12, padding: "18px 20px" }}>
      <div style={{ fontSize: 26 }}>{icon}</div>
      <div style={{ fontSize: 30, fontWeight: 800, marginTop: 6 }}>{value}</div>
      <div style={{ color: "#94a3b8", fontSize: 14 }}>{label}</div>
    </div>
  );
}

function CreateTenant({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [f, setF] = useState({ name: "", subdomain: "", admin_login_id: "", admin_password: "", admin_name: "", theme: "teal" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr("");
    try { await api.post("/platform/tenants/", f); onDone(); }
    catch (e: any) { setErr(e?.response?.data?.detail || "فشل الإنشاء"); }
    finally { setBusy(false); }
  }
  const set = (k: string, v: string) => setF({ ...f, [k]: v });

  return (
    <div style={overlay} onClick={onClose}>
      <form style={modal} onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <div style={{ background: "#0f172a", padding: "14px 18px", fontWeight: 700, fontSize: 16 }}>
          إضافة مستأجر جديد (بيع نسخة)
        </div>
        <div style={{ padding: 20, color: "#0f172a" }}>
          <F label="اسم المتجر"><input style={inp} value={f.name} onChange={(e) => set("name", e.target.value)} required /></F>
          <F label="النطاق الفرعي"><input style={inp} value={f.subdomain} onChange={(e) => set("subdomain", e.target.value)} placeholder="barakat" required /></F>
          <F label="اسم مدير المتجر"><input style={inp} value={f.admin_name} onChange={(e) => set("admin_name", e.target.value)} /></F>
          <F label="رقم دخول المدير"><input style={inp} value={f.admin_login_id} onChange={(e) => set("admin_login_id", e.target.value)} required /></F>
          <F label="كلمة مرور المدير"><input style={inp} type="text" value={f.admin_password} onChange={(e) => set("admin_password", e.target.value)} required /></F>
          <F label="الثيم">
            <select value={f.theme} onChange={(e) => set("theme", e.target.value)}>
              <option value="teal">أخضر مزرق</option><option value="blue">أزرق</option><option value="orange">برتقالي</option>
            </select>
          </F>
          {err && <div style={errBox}>{err}</div>}
          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <button className="btn g" style={{ flex: 1, height: 40 }} disabled={busy}>{busy ? "جارٍ..." : "إنشاء المستأجر"}</button>
            <button type="button" className="btn" style={{ height: 40, background: "#8a999e" }} onClick={onClose}>إلغاء</button>
          </div>
        </div>
      </form>
    </div>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return <div style={{ marginBottom: 10 }}><div style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>{label}</div>{children}</div>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><div style={{ fontSize: 11, color: "#64748b", marginBottom: 3 }}>{label}</div>{children}</div>;
}

const header: React.CSSProperties = {
  display: "flex", alignItems: "center", justifyContent: "space-between",
  background: "#1e293b", padding: "14px 24px", borderBottom: "1px solid #334155",
};
const subnav: React.CSSProperties = { display: "flex", gap: 4, background: "#131c31", padding: "0 24px", borderBottom: "1px solid #1e293b" };
const tabBtn: React.CSSProperties = { background: "transparent", border: 0, color: "#94a3b8", padding: "12px 18px", fontSize: 14, cursor: "pointer", borderBottom: "3px solid transparent" };
const tabActive: React.CSSProperties = { color: "#e2e8f0", borderBottom: "3px solid #2563eb", fontWeight: 700 };
const logoutBtn: React.CSSProperties = {
  background: "transparent", border: "1px solid #475569", color: "#e2e8f0", padding: "6px 12px", borderRadius: 5,
};
const table: React.CSSProperties = { width: "100%", borderCollapse: "collapse", background: "#0f172a", fontSize: 14 };
const th: React.CSSProperties = { background: "#1e293b", color: "#94a3b8", padding: "12px 8px", textAlign: "center", fontWeight: 600 };
const td: React.CSSProperties = { padding: "12px 8px", textAlign: "center" };
const addBtn: React.CSSProperties = { background: "#2563eb", color: "#fff", border: 0, padding: "8px 16px", borderRadius: 6, fontWeight: 600, cursor: "pointer" };
const pkgBtn: React.CSSProperties = { background: "#1d4ed8", color: "#dbeafe", border: 0, padding: "5px 12px", borderRadius: 5, marginInlineEnd: 6, cursor: "pointer" };
const subBtn: React.CSSProperties = { background: "#7c3aed", color: "#ede9fe", border: 0, padding: "5px 12px", borderRadius: 5, marginInlineEnd: 6, cursor: "pointer" };
const suspendBtn: React.CSSProperties = { background: "#7f1d1d", color: "#fecaca", border: 0, padding: "5px 12px", borderRadius: 5, cursor: "pointer" };
const activateBtn: React.CSSProperties = { background: "#14532d", color: "#bbf7d0", border: 0, padding: "5px 12px", borderRadius: 5, cursor: "pointer" };
const overlay: React.CSSProperties = { position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 };
const modal: React.CSSProperties = { width: 420, background: "#fff", color: "#0f172a", borderRadius: 10, overflow: "hidden" };
const inp: React.CSSProperties = { width: "100%", height: 38 };
const errBox: React.CSSProperties = { background: "#fdecea", border: "1px solid #f5c6c2", color: "#b0463a", fontSize: 13, padding: "9px 12px", borderRadius: 5, marginTop: 10 };
