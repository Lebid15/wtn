import { useEffect, useState } from "react";
import { api } from "../api";

interface Props {
  onClose: () => void;
  onDone: () => void;
}

const COUNTRIES = [
  { code: "SY", label: "سوريا 🇸🇾" },
  { code: "TR", label: "تركيا 🇹🇷" },
  { code: "SA", label: "السعودية 🇸🇦" },
  { code: "IQ", label: "العراق 🇮🇶" },
];

/** نموذج إنشاء وكيل جديد (Bayi Ekle) لصاحب المتجر. */
export default function DealerCreateModal({ onClose, onDone }: Props) {
  const [loginId, setLoginId] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [creditLimit, setCreditLimit] = useState("0");
  const [country, setCountry] = useState("SY");
  const [group, setGroup] = useState("");
  const [role, setRole] = useState("bayi");
  const [parent, setParent] = useState("");
  const [bigAgents, setBigAgents] = useState<{ id: number; name: string }[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // الوكلاء الكبار المتاحون ليتبعهم الوكيل الجديد
  useEffect(() => {
    api.get("/dealers/").then((r) => setBigAgents(
      (r.data.results || []).filter((d: any) => d.is_big).map((d: any) => ({ id: d.id, name: d.name })),
    )).catch(() => setBigAgents([]));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await api.post("/dealers/", {
        login_id: loginId.trim(),
        name: name.trim(),
        password,
        credit_limit: creditLimit || "0",
        country,
        group: group.trim(),
        role,
        parent: role === "bayi" && parent ? Number(parent) : null,
      });
      onDone();
    } catch (e: any) {
      setError(e?.response?.data?.detail || "فشل إنشاء الوكيل");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={overlay} onClick={onClose}>
      <form style={modal} onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <div style={header}>إضافة وكيل جديد</div>
        <div style={{ padding: 20 }}>
          <label style={lbl}>اسم الوكيل *</label>
          <input
            style={inp}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="اسم الوكيل"
            autoFocus
          />

          <label style={lbl}>رقم الدخول *</label>
          <input
            style={inp}
            value={loginId}
            onChange={(e) => setLoginId(e.target.value)}
            placeholder="مثال: 5550000123"
          />

          <label style={lbl}>كلمة السر *</label>
          <input
            style={inp}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="كلمة السر"
          />

          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={lbl}>الحد الائتماني</label>
              <input
                style={inp}
                type="number"
                step="0.01"
                value={creditLimit}
                onChange={(e) => setCreditLimit(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={lbl}>الدولة</label>
              <select style={inp} value={country} onChange={(e) => setCountry(e.target.value)}>
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={lbl}>نوع الوكيل</label>
              <select style={inp} value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="bayi">وكيل</option>
                <option value="ana_bayi">★ وكيل كبير</option>
              </select>
            </div>
            {role === "bayi" && (
              <div style={{ flex: 1 }}>
                <label style={lbl}>يتبع الوكيل الكبير</label>
                <select style={inp} value={parent} onChange={(e) => setParent(e.target.value)}>
                  <option value="">— مستقلّ —</option>
                  {bigAgents.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <label style={lbl}>المجموعة (اختياري)</label>
          <input
            style={inp}
            value={group}
            onChange={(e) => setGroup(e.target.value)}
            placeholder="مجموعة الوكيل"
          />

          {error && <div style={errBox}>{error}</div>}

          <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
            <button className="btn g" style={{ flex: 1, height: 40 }} disabled={busy}>
              {busy ? "جارٍ..." : "حفظ"}
            </button>
            <button
              type="button"
              className="btn"
              style={{ height: 40, background: "#8a999e" }}
              onClick={onClose}
            >
              إلغاء
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

const overlay: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,.45)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
};
const modal: React.CSSProperties = {
  width: 440,
  background: "#fff",
  borderRadius: 8,
  overflow: "hidden",
  boxShadow: "0 16px 50px rgba(0,0,0,.35)",
};
const header: React.CSSProperties = {
  color: "#fff",
  background: "var(--ok)",
  padding: "14px 20px",
  fontSize: 16,
  fontWeight: 700,
};
const lbl: React.CSSProperties = {
  display: "block",
  fontSize: 13,
  color: "var(--muted)",
  margin: "14px 2px 5px",
};
const inp: React.CSSProperties = { width: "100%", height: 38 };
const errBox: React.CSSProperties = {
  background: "#fdecea",
  border: "1px solid #f5c6c2",
  color: "var(--danger)",
  fontSize: 13,
  padding: "9px 12px",
  borderRadius: 5,
  marginTop: 14,
};
