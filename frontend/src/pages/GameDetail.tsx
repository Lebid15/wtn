import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, type GameDetail as GameDetailType, type Product, type Provider } from "../api";
import Icon from "../components/Icon";

export default function GameDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [game, setGame] = useState<GameDetailType | null>(null);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");
  const [newP, setNewP] = useState({ name: "", cost_price: "", recommended_price: "", kupur: "" });
  // نافذة تعديل الباقة: "edit" بيانات المنتج · "routing" المزوّدون + رقم الربط
  const [editing, setEditing] = useState<{ product: Product; mode: "edit" | "routing" } | null>(null);

  function load() {
    api.get(`/catalog/games/${id}/`).then((r) => setGame(r.data));
  }
  useEffect(() => { load(); }, [id]);
  useEffect(() => {
    api.get("/providers/", { params: { status: "active" } }).then((r) => setProviders(r.data));
  }, []);

  if (!game) return <div style={{ padding: 30 }}>جارٍ التحميل...</div>;

  function set<K extends keyof GameDetailType>(k: K, v: GameDetailType[K]) {
    setGame((g) => (g ? { ...g, [k]: v } : g));
  }

  async function saveGame() {
    setSaving(true);
    setSavedMsg("");
    try {
      await api.patch(`/catalog/games/${id}/`, {
        name: game!.name, dealer_note: game!.dealer_note, description: game!.description,
        status: game!.status, kurulu_sale: game!.kurulu_sale, toplu_sale: game!.toplu_sale,
        require_player_id: game!.require_player_id, sms_template: game!.sms_template,
      });
      setSavedMsg("تم الحفظ ✅");
    } finally {
      setSaving(false);
    }
  }

  async function addProduct(e: React.FormEvent) {
    e.preventDefault();
    if (!newP.name) return;
    await api.post("/catalog/products/", {
      game: game!.id, name: newP.name,
      cost_price: newP.cost_price || "0", recommended_price: newP.recommended_price || "0",
      kupur: newP.kupur,
    });
    setNewP({ name: "", cost_price: "", recommended_price: "", kupur: "" });
    load();
  }

  const money = (v: string) => Number(v).toLocaleString("en-US", { minimumFractionDigits: 2 });

  return (
    <div style={{ padding: 16 }}>
      {/* شريط العنوان */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
        <button className="btn" style={{ background: "#8a999e" }} onClick={() => nav("/oyunpin")}>
          ← رجوع
        </button>
        <h2 style={{ fontSize: 20, color: "var(--primary-dark)" }}>تفاصيل اللعبة: {game.name}</h2>
      </div>

      {/* ===== القسم 1: تعديل تفاصيل اللعبة ===== */}
      <div style={panel}>
        <div style={panelHead}>تعديل تفاصيل اللعبة</div>
        <div style={{ padding: 18 }}>
          <Row label="اسم اللعبة">
            <input style={inp} value={game.name} onChange={(e) => set("name", e.target.value)} />
          </Row>
          <Row label="ملاحظة للوكيل">
            <input style={inp} value={game.dealer_note} onChange={(e) => set("dealer_note", e.target.value)} />
          </Row>
          <Row label="وصف اللعبة">
            <textarea style={{ ...inp, height: 70, paddingTop: 6 }}
              value={game.description} onChange={(e) => set("description", e.target.value)} />
          </Row>
          <Row label="حالة اللعبة">
            <select value={game.status} onChange={(e) => set("status", e.target.value)}>
              <option value="active">نشط</option>
              <option value="passive">معطّل</option>
            </select>
          </Row>
          <Row label="البيع بالحزم">
            <Toggle on={game.kurulu_sale} onChange={(v) => set("kurulu_sale", v)} />
          </Row>
          <Row label="البيع بالكمية">
            <Toggle on={game.toplu_sale} onChange={(v) => set("toplu_sale", v)} />
          </Row>
          <Row label="إجبار معرّف اللاعب">
            <Toggle on={game.require_player_id} onChange={(v) => set("require_player_id", v)} />
          </Row>
          <Row label="قالب SMS">
            <textarea style={{ ...inp, height: 54, paddingTop: 6 }}
              value={game.sms_template} onChange={(e) => set("sms_template", e.target.value)}
              placeholder="نص SMS يُرسل بعد التنفيذ (اختياري)" />
          </Row>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8 }}>
            <button className="btn g" onClick={saveGame} disabled={saving}>
              {saving ? "جارٍ الحفظ..." : "حفظ التعديلات"}
            </button>
            {savedMsg && <span style={{ color: "var(--ok)", fontSize: 14 }}>{savedMsg}</span>}
          </div>
        </div>
      </div>

      {/* ===== القسم 2: عمليات المنتجات ===== */}
      <div style={{ ...panel, marginTop: 20 }}>
        <div style={panelHead}>عمليات المنتجات</div>
        <div style={{ padding: 18 }}>
          {/* نموذج إضافة منتج */}
          <form onSubmit={addProduct} style={{ display: "flex", gap: 10, alignItems: "end", flexWrap: "wrap", marginBottom: 16 }}>
            <Field label="اسم المنتج">
              <input style={{ width: 180 }} value={newP.name}
                onChange={(e) => setNewP({ ...newP, name: e.target.value })} />
            </Field>
            <Field label="التكلفة">
              <input style={{ width: 100 }} type="number" step="0.01" value={newP.cost_price}
                onChange={(e) => setNewP({ ...newP, cost_price: e.target.value })} />
            </Field>
            <Field label="السعر الموصى">
              <input style={{ width: 100 }} type="number" step="0.01" value={newP.recommended_price}
                onChange={(e) => setNewP({ ...newP, recommended_price: e.target.value })} />
            </Field>
            <Field label="Küpür">
              <input style={{ width: 90 }} value={newP.kupur}
                onChange={(e) => setNewP({ ...newP, kupur: e.target.value })} />
            </Field>
            <button className="btn g" style={{ height: 32 }}><Icon name="plus" size={14} style={{ marginInlineEnd: 4 }} />إضافة</button>
          </form>

          {/* جدول المنتجات */}
          <table style={table}>
            <thead>
              <tr>
                {["المنتج", "التكلفة", "الموصى", "الربح", "Küpür", "رقم الربط", "المزوّد",
                  "الحالة", "Parçalı", "التاريخ", "إجراء"].map((h) => (
                  <th key={h} style={th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {game.products.length === 0 ? (
                <tr><td colSpan={11} style={{ ...td, padding: 24 }}>لا توجد منتجات — أضف أول منتج بالأعلى</td></tr>
              ) : (
                game.products.map((p: Product, i) => (
                  <tr key={p.id} style={{ background: i % 2 ? "var(--row-alt)" : "#fff" }}>
                    <td style={{ ...td, textAlign: "right", paddingInlineStart: 12, fontWeight: 600 }}>{p.name}</td>
                    <td style={td}>{money(p.cost_price)}</td>
                    <td style={td}>{money(p.recommended_price)}</td>
                    <td style={{ ...td, color: "var(--ok)", fontWeight: 600 }}>{money(p.profit)}</td>
                    <td style={td}>{p.kupur || "—"}</td>
                    <td style={td}>
                      {p.provider_package_id
                        ? <code style={linkCode}>{p.provider_package_id}</code>
                        : <span style={{ color: "var(--debt)", fontSize: 12 }}>غير مربوط ⚠</span>}
                    </td>
                    <td style={{ ...td, fontSize: 13 }}>
                      {providers.find((v) => v.id === p.provider)?.name || "—"}
                    </td>
                    <td style={td}>{p.status_label}</td>
                    <td style={td}>{p.is_parcali ? "نعم" : "لا"}</td>
                    <td style={{ ...td, color: "var(--muted)", fontSize: 13 }}>{(p as any).created_at}</td>
                    <td style={td}>
                      <div style={{ display: "flex", gap: 4, justifyContent: "center" }}>
                        <button type="button" title="تعديل بيانات الباقة" style={iconBtn}
                          onClick={() => setEditing({ product: p, mode: "edit" })}>
                          <Icon name="edit" size={15} color="var(--primary)" />
                        </button>
                        <button type="button" title="التوجيه ورقم الربط" style={iconBtn}
                          onClick={() => setEditing({ product: p, mode: "routing" })}>
                          <Icon name="settings" size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <ProductModal
          product={editing.product}
          mode={editing.mode}
          providers={providers}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}
    </div>
  );
}

/** نافذة الباقة: تعديل البيانات · أو ضبط التوجيه ورقم الربط لدى المزوّد. */
function ProductModal({
  product, mode, providers, onClose, onSaved,
}: {
  product: Product;
  mode: "edit" | "routing";
  providers: Provider[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [f, setF] = useState({
    name: product.name,
    cost_price: product.cost_price,
    recommended_price: product.recommended_price,
    kupur: product.kupur,
    status: product.status,
    is_parcali: product.is_parcali,
    execution_type: product.execution_type,
    description: product.description,
    provider_package_id: product.provider_package_id,
    provider: product.provider,
    provider_alt1: product.provider_alt1,
    provider_alt2: product.provider_alt2,
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const upd = (k: keyof typeof f, v: any) => setF((s) => ({ ...s, [k]: v }));

  async function save() {
    setBusy(true);
    setErr("");
    // كل نافذة ترسل حقولها فقط — لئلا تدهس نافذةٌ حقولَ الأخرى
    const body: any = mode === "edit"
      ? {
          name: f.name, cost_price: f.cost_price || "0",
          recommended_price: f.recommended_price || "0", kupur: f.kupur,
          status: f.status, is_parcali: f.is_parcali,
          execution_type: f.execution_type, description: f.description,
        }
      : {
          provider_package_id: f.provider_package_id.trim(),
          provider: f.provider || null,
          provider_alt1: f.provider_alt1 || null,
          provider_alt2: f.provider_alt2 || null,
        };
    try {
      await api.patch(`/catalog/products/${product.id}/`, body);
      onSaved();
    } catch (e: any) {
      setErr(e?.response?.data?.detail || "تعذّر الحفظ — تحقّق من القيم");
      setBusy(false);
    }
  }

  return (
    <div style={overlay} onClick={onClose}>
      <div style={modal} onClick={(e) => e.stopPropagation()}>
        <div style={panelHead}>
          {mode === "edit" ? "تعديل الباقة" : "التوجيه ورقم الربط"} — {product.game_name} / {product.name}
        </div>
        <div style={{ padding: 18, display: "grid", gap: 12 }}>
          {mode === "edit" ? (
            <>
              <Field label="اسم الباقة">
                <input style={mInp} value={f.name} onChange={(e) => upd("name", e.target.value)} />
              </Field>
              <div style={{ display: "flex", gap: 10 }}>
                <Field label="التكلفة">
                  <input style={{ ...mInp, width: 120 }} type="number" step="0.01"
                    value={f.cost_price} onChange={(e) => upd("cost_price", e.target.value)} />
                </Field>
                <Field label="السعر الموصى">
                  <input style={{ ...mInp, width: 120 }} type="number" step="0.01"
                    value={f.recommended_price} onChange={(e) => upd("recommended_price", e.target.value)} />
                </Field>
                <Field label="Küpür">
                  <input style={{ ...mInp, width: 100 }} value={f.kupur}
                    onChange={(e) => upd("kupur", e.target.value)} />
                </Field>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <Field label="الحالة">
                  <select style={{ ...mInp, width: 180 }} value={f.status}
                    onChange={(e) => upd("status", e.target.value)}>
                    <option value="active">نشط</option>
                    <option value="passive">معطّل</option>
                    <option value="sale_paused">بيع موقوف مؤقتاً</option>
                  </select>
                </Field>
                <Field label="نوع التنفيذ">
                  <select style={{ ...mInp, width: 180 }} value={f.execution_type}
                    onChange={(e) => upd("execution_type", e.target.value)}>
                    <option value="auto">تلقائي</option>
                    <option value="manual">يدوي</option>
                  </select>
                </Field>
                <Field label="Parçalı">
                  <Toggle on={f.is_parcali} onChange={(v) => upd("is_parcali", v)} />
                </Field>
              </div>
              <Field label="الوصف">
                <input style={mInp} value={f.description}
                  onChange={(e) => upd("description", e.target.value)} />
              </Field>
            </>
          ) : (
            <>
              <Field label="رقم الربط لدى المزوّد (معرّف الباقة)">
                <input style={mInp} value={f.provider_package_id} dir="ltr"
                  placeholder="مثال: 1547"
                  onChange={(e) => upd("provider_package_id", e.target.value)} />
              </Field>
              <div style={hint}>
                هذا الرقم هو صلة الوصل: اسم الباقة عندك قد يختلف عن اسمها لدى المزوّد،
                لكن رقم الربط ثابت. يُرسَل في المعامل <code>oyun</code> لـ ZNET
                وكـ <code>package_id</code> لمتاجر البطاقات. بدونه لن يعرف المزوّد أي باقة تقصد.
              </div>
              <ProviderPick label="API القابلة للإرسال (الرئيسي)" providers={providers}
                value={f.provider} onChange={(v) => upd("provider", v)} />
              <ProviderPick label="API 1 (بديل أول)" providers={providers}
                value={f.provider_alt1} onChange={(v) => upd("provider_alt1", v)} />
              <ProviderPick label="API 2 (بديل ثانٍ)" providers={providers}
                value={f.provider_alt2} onChange={(v) => upd("provider_alt2", v)} />
              {f.execution_type !== "auto" && (
                <div style={{ ...hint, color: "var(--debt)" }}>
                  ⚠ تنفيذ هذه الباقة <b>يدوي</b> — لن تُرسَل آلياً للمزوّد مهما ضبطت التوجيه.
                  غيّره من زر التعديل ✏ إلى «تلقائي».
                </div>
              )}
            </>
          )}

          {err && <div style={{ color: "var(--debt)", fontSize: 13 }}>{err}</div>}
          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <button className="btn g" onClick={save} disabled={busy}>
              {busy ? "جارٍ الحفظ..." : "حفظ"}
            </button>
            <button className="btn" style={{ background: "#8a999e" }} onClick={onClose}>إلغاء</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProviderPick({
  label, providers, value, onChange,
}: {
  label: string;
  providers: Provider[];
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  return (
    <Field label={label}>
      <select style={mInp} value={value ?? ""}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}>
        <option value="">— بديل مغلق —</option>
        {providers.map((v) => (
          <option key={v.id} value={v.id}>{v.name} ({v.type_label})</option>
        ))}
      </select>
    </Field>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "start", gap: 14, marginBottom: 12 }}>
      <div style={{ width: 150, textAlign: "left", color: "var(--muted)", fontSize: 14, paddingTop: 7 }}>
        {label} :
      </div>
      <div style={{ flex: 1 }}>{children}</div>
    </div>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4 }}>{label}</div>
      {children}
    </div>
  );
}
function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!on)}
      style={{
        border: 0, borderRadius: 4, padding: "6px 16px", color: "#fff", fontSize: 13,
        background: on ? "var(--ok)" : "#8a999e",
      }}>
      {on ? "نشط" : "معطّل"}
    </button>
  );
}

const panel: React.CSSProperties = {
  background: "#fff",
  border: "1px solid var(--border)",
  borderRadius: 8,
  overflow: "hidden",
};
const panelHead: React.CSSProperties = {
  background: "var(--primary)",
  color: "#fff",
  padding: "10px 18px",
  fontSize: 15,
  fontWeight: 700,
};
const inp: React.CSSProperties = { width: "100%", maxWidth: 460 };
const iconBtn: React.CSSProperties = {
  background: "none", border: 0, padding: 2, cursor: "pointer",
  color: "var(--muted)", display: "inline-flex", alignItems: "center",
};
const linkCode: React.CSSProperties = {
  background: "var(--row-alt)", border: "1px solid var(--border)", borderRadius: 4,
  padding: "2px 7px", fontSize: 12.5, direction: "ltr", display: "inline-block",
};
const overlay: React.CSSProperties = {
  position: "fixed", inset: 0, background: "rgba(0,0,0,.45)",
  display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60,
};
const modal: React.CSSProperties = {
  background: "#fff", borderRadius: 8, width: 560, maxWidth: "94vw",
  maxHeight: "90vh", overflow: "auto", boxShadow: "0 10px 40px rgba(0,0,0,.3)",
};
const mInp: React.CSSProperties = { width: "100%" };
const hint: React.CSSProperties = {
  fontSize: 12.5, color: "var(--muted)", lineHeight: 1.7,
  background: "var(--row-alt)", border: "1px solid var(--border)",
  borderRadius: 6, padding: "8px 10px",
};
const table: React.CSSProperties = {
  width: "100%", borderCollapse: "collapse", background: "var(--surface)", fontSize: 13.5,
};
const th: React.CSSProperties = {
  background: "var(--th-bg)", color: "var(--th-ink)", padding: "11px 10px",
  textAlign: "center", fontWeight: 800, fontSize: 12.5, whiteSpace: "nowrap",
  border: "1px solid var(--border)", borderTop: 0,
};
const td: React.CSSProperties = {
  padding: 10, textAlign: "center", whiteSpace: "nowrap", verticalAlign: "middle",
  background: "var(--surface)", border: "1px solid var(--border)",
  borderBottom: "3px solid var(--row-sep)",
};
