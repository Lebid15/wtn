import { useEffect, useState } from "react";
import { api } from "../api";
import { useAuth } from "../auth";

interface Tenant {
  id: number; name: string; subdomain: string; status: string;
  theme: string; dealers: number; created_at: string;
}
interface Stats { tenants: number; active: number; dealers: number }

export default function Platform() {
  const { user, logout } = useAuth();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [showCreate, setShowCreate] = useState(false);

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
    <div style={{ minHeight: "100vh", background: "#0f172a", color: "#e2e8f0" }}>
      {/* هيدر المنصّة (داكن) */}
      <div style={header}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 24 }}>🏢</span>
          <b style={{ fontSize: 18 }}>لوحة المنصّة — إدارة المستأجرين</b>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <span style={{ fontSize: 13, opacity: 0.8 }}>{user?.name}</span>
          <button onClick={logout} style={logoutBtn}>خروج</button>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: 24 }}>
        {/* بطاقات الإحصائيات */}
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
              <tr>
                {["#", "الاسم", "النطاق الفرعي", "الثيم", "الوكلاء", "التاريخ", "الحالة", "إجراء"]
                  .map((h) => <th key={h} style={th}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {tenants.map((t) => (
                <tr key={t.id} style={{ borderTop: "1px solid #1e293b" }}>
                  <td style={td}>{t.id}</td>
                  <td style={{ ...td, fontWeight: 700 }}>{t.name}</td>
                  <td style={{ ...td, direction: "ltr", color: "#7dd3fc" }}>{t.subdomain}.example.com</td>
                  <td style={td}>{t.theme}</td>
                  <td style={td}>{t.dealers}</td>
                  <td style={{ ...td, color: "#94a3b8" }}>{t.created_at}</td>
                  <td style={td}>
                    <span style={{ color: t.status === "active" ? "#4ade80" : "#f87171", fontWeight: 700 }}>
                      ● {t.status === "active" ? "نشط" : "موقوف"}
                    </span>
                  </td>
                  <td style={td}>
                    <button style={t.status === "active" ? suspendBtn : activateBtn} onClick={() => toggle(t)}>
                      {t.status === "active" ? "تعليق" : "تفعيل"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showCreate && <CreateTenant onClose={() => setShowCreate(false)} onDone={() => { setShowCreate(false); load(); }} />}
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

const header: React.CSSProperties = {
  display: "flex", alignItems: "center", justifyContent: "space-between",
  background: "#1e293b", padding: "14px 24px", borderBottom: "1px solid #334155",
};
const logoutBtn: React.CSSProperties = {
  background: "transparent", border: "1px solid #475569", color: "#e2e8f0", padding: "6px 12px", borderRadius: 5,
};
const table: React.CSSProperties = { width: "100%", borderCollapse: "collapse", background: "#0f172a", fontSize: 14 };
const th: React.CSSProperties = { background: "#1e293b", color: "#94a3b8", padding: "12px 8px", textAlign: "center", fontWeight: 600 };
const td: React.CSSProperties = { padding: "12px 8px", textAlign: "center" };
const addBtn: React.CSSProperties = { background: "#2563eb", color: "#fff", border: 0, padding: "8px 16px", borderRadius: 6, fontWeight: 600 };
const suspendBtn: React.CSSProperties = { background: "#7f1d1d", color: "#fecaca", border: 0, padding: "5px 12px", borderRadius: 5 };
const activateBtn: React.CSSProperties = { background: "#14532d", color: "#bbf7d0", border: 0, padding: "5px 12px", borderRadius: 5 };
const overlay: React.CSSProperties = { position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 };
const modal: React.CSSProperties = { width: 420, background: "#fff", color: "#0f172a", borderRadius: 10, overflow: "hidden" };
const inp: React.CSSProperties = { width: "100%", height: 38 };
const errBox: React.CSSProperties = { background: "#fdecea", border: "1px solid #f5c6c2", color: "#b0463a", fontSize: 13, padding: "9px 12px", borderRadius: 5, marginTop: 10 };
