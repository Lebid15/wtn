import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, type GameDetail as GameDetailType, type Product } from "../api";
import Icon from "../components/Icon";

export default function GameDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [game, setGame] = useState<GameDetailType | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");
  const [newP, setNewP] = useState({ name: "", cost_price: "", recommended_price: "", kupur: "" });

  function load() {
    api.get(`/catalog/games/${id}/`).then((r) => setGame(r.data));
  }
  useEffect(() => { load(); }, [id]);

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
                {["المنتج", "التكلفة", "الموصى", "الربح", "Küpür", "الحالة", "Parçalı", "التاريخ", "إجراء"].map((h) => (
                  <th key={h} style={th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {game.products.length === 0 ? (
                <tr><td colSpan={9} style={{ ...td, padding: 24 }}>لا توجد منتجات — أضف أول منتج بالأعلى</td></tr>
              ) : (
                game.products.map((p: Product, i) => (
                  <tr key={p.id} style={{ background: i % 2 ? "var(--row-alt)" : "#fff" }}>
                    <td style={{ ...td, textAlign: "right", paddingInlineStart: 12, fontWeight: 600 }}>{p.name}</td>
                    <td style={td}>{money(p.cost_price)}</td>
                    <td style={td}>{money(p.recommended_price)}</td>
                    <td style={{ ...td, color: "var(--ok)", fontWeight: 600 }}>{money(p.profit)}</td>
                    <td style={td}>{p.kupur || "—"}</td>
                    <td style={td}>{p.status_label}</td>
                    <td style={td}>{p.is_parcali ? "نعم" : "لا"}</td>
                    <td style={{ ...td, color: "var(--muted)", fontSize: 13 }}>{(p as any).created_at}</td>
                    <td style={td}>
                      <div style={{ display: "flex", gap: 4, justifyContent: "center", color: "var(--muted)" }}>
                        <Icon name="edit" size={15} color="var(--primary)" /><Icon name="settings" size={15} />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
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
const table: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  background: "#fff",
  fontSize: 14,
};
const th: React.CSSProperties = {
  background: "var(--th-bg)",
  color: "#fff",
  padding: "9px 6px",
  textAlign: "center",
  fontWeight: 600,
};
const td: React.CSSProperties = {
  padding: "8px 6px",
  textAlign: "center",
  borderBottom: "1px solid #edf1f2",
};
