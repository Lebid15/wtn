import { useEffect, useState } from "react";
import { api } from "../api";
import Icon from "./Icon";

export interface Card {
  id: number;
  title: string;
  body: string;
  icon: string;
  bg_color: string;
  bg_color2: string;
  text_color: string;
  link_url: string;
  link_label: string;
  sort_order: number;
  active: boolean;
  target_tenant?: number | null;
}

/** خلفية البطاقة: تدرّج إن وُجد لونٌ ثانٍ، وإلّا لونٌ واحد. */
export const cardBg = (c: Pick<Card, "bg_color" | "bg_color2">) =>
  c.bg_color2 ? `linear-gradient(135deg, ${c.bg_color} 0%, ${c.bg_color2} 100%)` : c.bg_color;

/* ══════════════ العرض: بطاقات أفقية في الصفحة الرئيسية ══════════════ */

export function CardStrip({ cards }: { cards: Card[] }) {
  if (!cards.length) return null;
  return (
    <div style={strip}>
      {cards.map((c) => <CardView key={c.id} card={c} />)}
    </div>
  );
}

export function CardView({ card, compact }: { card: Card; compact?: boolean }) {
  return (
    <div style={{
      ...cardBox,
      background: cardBg(card),
      color: card.text_color,
      minHeight: compact ? 0 : 132,
      padding: compact ? 14 : 20,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 8 }}>
        {card.icon && <Icon name={card.icon} size={compact ? 17 : 21} />}
        <b style={{ fontSize: compact ? 14 : 16.5, lineHeight: 1.5 }}>{card.title}</b>
      </div>
      {card.body && (
        <p style={{
          margin: 0, fontSize: compact ? 12.5 : 13.5, lineHeight: 1.85,
          opacity: 0.93, whiteSpace: "pre-wrap",
        }}>{card.body}</p>
      )}
      {card.link_url && (
        <a href={card.link_url} target="_blank" rel="noreferrer" style={{
          marginTop: "auto", paddingTop: 12, color: card.text_color,
          fontWeight: 800, fontSize: 13, textDecoration: "none",
          display: "inline-flex", alignItems: "center", gap: 6,
        }}>
          {card.link_label || "افتح"} <Icon name="link" size={13} />
        </a>
      )}
    </div>
  );
}

/* ══════════════ التحرير: من فوقك يكتب، وأنت ترى ══════════════ */

/** ألوان جاهزة تُغني عن التقاط لونٍ بلا ذوق — والمخصّص يبقى متاحاً. */
const PRESETS: { name: string; bg: string; bg2: string; fg: string }[] = [
  { name: "بحري", bg: "#0f766e", bg2: "#115e59", fg: "#ffffff" },
  { name: "أزرق", bg: "#1d4ed8", bg2: "#1e3a8a", fg: "#ffffff" },
  { name: "بنفسجي", bg: "#6d28d9", bg2: "#4c1d95", fg: "#ffffff" },
  { name: "أخضر", bg: "#15803d", bg2: "#14532d", fg: "#ffffff" },
  { name: "تنبيه", bg: "#b45309", bg2: "#7c2d12", fg: "#ffffff" },
  { name: "خطر", bg: "#b91c1c", bg2: "#7f1d1d", fg: "#ffffff" },
  { name: "فحمي", bg: "#1f2937", bg2: "#111827", fg: "#ffffff" },
  { name: "فاتح", bg: "#f1f5f9", bg2: "#e2e8f0", fg: "#0f172a" },
];

// من مجموعة Icon القائمة وحدها — اسمٌ خارجها يرسم فراغاً بلا خطأ ظاهر
const ICONS = ["bell", "warning", "check", "wallet", "chart", "card", "dollar",
  "users", "settings", "api", "games", "cart", "calendar", "flag", "store",
  "building", "whatsapp", "chat"];

const EMPTY: Omit<Card, "id"> = {
  title: "", body: "", icon: "bell",
  bg_color: PRESETS[0].bg, bg_color2: PRESETS[0].bg2, text_color: PRESETS[0].fg,
  link_url: "", link_label: "", sort_order: 0, active: true,
};

/**
 * محرّر البطاقات — واحدٌ للدورين.
 *
 * `audienceLabel` يقول لمن تُكتب، فالمحرّر لا يخمّن: الخادم يستنتج الجمهور من
 * دور الكاتب، والواجهة تكتفي بأن تقوله للمستخدم بوضوح.
 */
export default function CardsEditor({ audienceLabel, hint }: {
  audienceLabel: string; hint: string;
}) {
  const [cards, setCards] = useState<Card[] | null>(null);
  const [edit, setEdit] = useState<Partial<Card> | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = () => api.get("/cards/").then((r) => setCards(r.data.results)).catch(
    (e) => setMsg({ ok: false, text: e?.response?.data?.detail || "تعذّر الجلب" }));
  useEffect(() => { load(); }, []);

  async function save() {
    if (!edit) return;
    if (!(edit.title || "").trim()) { setMsg({ ok: false, text: "العنوان مطلوب" }); return; }
    setBusy(true); setMsg(null);
    try {
      if (edit.id) await api.patch(`/cards/${edit.id}/`, edit);
      else await api.post("/cards/", edit);
      setEdit(null); await load();
      setMsg({ ok: true, text: "حُفظت البطاقة" });
    } catch (e: any) {
      setMsg({ ok: false, text: e?.response?.data?.detail || "تعذّر الحفظ" });
    } finally { setBusy(false); }
  }

  async function remove(c: Card) {
    if (!window.confirm(`حذف بطاقة «${c.title}»؟`)) return;
    await api.delete(`/cards/${c.id}/`);
    await load();
    setMsg({ ok: true, text: "حُذفت البطاقة" });
  }

  async function toggle(c: Card) {
    await api.patch(`/cards/${c.id}/`, { active: !c.active });
    await load();
  }

  async function move(c: Card, dir: -1 | 1) {
    if (!cards) return;
    const i = cards.findIndex((x) => x.id === c.id);
    const j = i + dir;
    if (j < 0 || j >= cards.length) return;
    // نتبادل الترتيبَين لا نعيد ترقيم الكلّ — نداءان بدل عشرة
    await Promise.all([
      api.patch(`/cards/${c.id}/`, { sort_order: cards[j].sort_order }),
      api.patch(`/cards/${cards[j].id}/`, { sort_order: c.sort_order }),
    ]);
    await load();
  }

  const set = (k: keyof Card, v: any) => setEdit((o) => ({ ...(o || EMPTY), [k]: v }));

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 15, color: "var(--primary-dark)" }}>
            بطاقات {audienceLabel}
          </div>
          <div style={{ color: "var(--muted)", fontSize: 12.5, marginTop: 4, lineHeight: 1.8 }}>{hint}</div>
        </div>
        <button className="btn g" onClick={() => setEdit({ ...EMPTY })}>
          <Icon name="plus" size={15} style={{ marginInlineEnd: 6 }} />بطاقة جديدة
        </button>
      </div>

      {msg && (
        <div style={{
          padding: "10px 13px", borderRadius: 8, fontWeight: 700, fontSize: 13,
          background: msg.ok ? "#e7f6ec" : "#fdece7",
          color: msg.ok ? "var(--ok)" : "var(--danger)",
        }}>{msg.text}</div>
      )}

      {edit && (
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: 18 }}>
          <div style={{ fontWeight: 800, marginBottom: 14, color: "var(--primary-dark)" }}>
            {edit.id ? "تعديل البطاقة" : "بطاقة جديدة"}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "minmax(260px, 1fr) minmax(240px, 320px)", gap: 20 }}>
            <div>
              <label style={lbl}>العنوان *</label>
              <input style={inp} value={edit.title || ""} onChange={(e) => set("title", e.target.value)} />

              <label style={lbl}>النصّ</label>
              <textarea style={{ ...inp, height: 96, resize: "vertical", lineHeight: 1.9 }}
                value={edit.body || ""} onChange={(e) => set("body", e.target.value)} />

              <label style={lbl}>الأيقونة</label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {ICONS.map((n) => (
                  <button key={n} type="button" onClick={() => set("icon", n)}
                    title={n}
                    style={{
                      width: 36, height: 34, borderRadius: 7, cursor: "pointer",
                      border: `1px solid ${edit.icon === n ? "var(--primary)" : "var(--border)"}`,
                      background: edit.icon === n ? "var(--primary)" : "var(--surface-2)",
                      color: edit.icon === n ? "#fff" : "var(--text)",
                    }}><Icon name={n} size={16} /></button>
                ))}
              </div>

              <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
                <div style={{ flex: 2 }}>
                  <label style={lbl}>رابط (اختياري)</label>
                  <input style={inp} dir="ltr" placeholder="https://..."
                    value={edit.link_url || ""} onChange={(e) => set("link_url", e.target.value)} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={lbl}>نصّ الزرّ</label>
                  <input style={inp} placeholder="افتح"
                    value={edit.link_label || ""} onChange={(e) => set("link_label", e.target.value)} />
                </div>
              </div>

              <label style={lbl}>الألوان الجاهزة</label>
              <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                {PRESETS.map((p) => (
                  <button key={p.name} type="button" title={p.name}
                    onClick={() => setEdit((o) => ({
                      ...(o || EMPTY), bg_color: p.bg, bg_color2: p.bg2, text_color: p.fg,
                    }))}
                    style={{
                      width: 42, height: 30, borderRadius: 7, cursor: "pointer",
                      border: edit.bg_color === p.bg ? "2px solid var(--text)" : "1px solid var(--border)",
                      background: `linear-gradient(135deg, ${p.bg}, ${p.bg2})`,
                    }} />
                ))}
              </div>

              <div style={{ display: "flex", gap: 14, marginTop: 12, flexWrap: "wrap" }}>
                <ColorPick label="الخلفية" value={edit.bg_color || "#0f766e"} onChange={(v) => set("bg_color", v)} />
                <ColorPick label="تدرّج" value={edit.bg_color2 || ""} onChange={(v) => set("bg_color2", v)} clearable />
                <ColorPick label="الخطّ" value={edit.text_color || "#ffffff"} onChange={(v) => set("text_color", v)} />
              </div>
            </div>

            {/* المعاينة — تتغيّر مع كل حرف، فلا يُحفظ لونٌ لم يُرَ */}
            <div>
              <label style={lbl}>المعاينة</label>
              <CardView card={{ ...EMPTY, ...edit, id: 0 } as Card} />
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
            <button className="btn g" disabled={busy} onClick={save}>
              {busy ? "جارٍ..." : "حفظ"}
            </button>
            <button className="btn" onClick={() => setEdit(null)}>إلغاء</button>
          </div>
        </div>
      )}

      {cards === null ? (
        <div style={{ color: "var(--muted)" }}>جارٍ التحميل...</div>
      ) : cards.length === 0 ? (
        <div style={{
          border: "1px dashed var(--border)", borderRadius: 10, padding: 28,
          textAlign: "center", color: "var(--muted)", fontSize: 13.5, lineHeight: 1.9,
        }}>
          لا بطاقات بعد. أنشئ واحدة فتظهر في الصفحة الرئيسية لـ{audienceLabel}.
        </div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {cards.map((c, i) => (
            <div key={c.id} style={{
              display: "flex", gap: 14, alignItems: "stretch",
              background: "var(--surface)", border: "1px solid var(--border)",
              borderRadius: 10, padding: 12, opacity: c.active ? 1 : 0.55,
            }}>
              <div style={{ width: 250, flexShrink: 0 }}>
                <CardView card={c} compact />
              </div>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 8 }}>
                <div style={{ fontSize: 12.5, color: "var(--muted)" }}>
                  الترتيب {i + 1} · {c.active ? "ظاهرة" : "مخفيّة"}
                </div>
                <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                  <button className="btn" style={sm} onClick={() => setEdit(c)}>
                    <Icon name="edit" size={13} style={{ marginInlineEnd: 5 }} />تعديل
                  </button>
                  <button className="btn" style={sm} onClick={() => toggle(c)}>
                    <Icon name="eye" size={13} style={{ marginInlineEnd: 5 }} />
                    {c.active ? "إخفاء" : "إظهار"}
                  </button>
                  <button className="btn" style={sm} disabled={i === 0} onClick={() => move(c, -1)}>↑</button>
                  <button className="btn" style={sm} disabled={i === cards.length - 1} onClick={() => move(c, 1)}>↓</button>
                  <button className="btn" style={{ ...sm, color: "var(--danger)" }} onClick={() => remove(c)}>
                    <Icon name="trash" size={13} style={{ marginInlineEnd: 5 }} />حذف
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ColorPick({ label, value, onChange, clearable }: {
  label: string; value: string; onChange: (v: string) => void; clearable?: boolean;
}) {
  return (
    <div>
      <div style={{ fontSize: 11.5, color: "var(--muted)", marginBottom: 5, fontWeight: 700 }}>{label}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <input type="color" value={value || "#ffffff"} onChange={(e) => onChange(e.target.value)}
          style={{ width: 40, height: 32, padding: 0, border: "1px solid var(--border)", borderRadius: 6, cursor: "pointer" }} />
        <input dir="ltr" value={value} onChange={(e) => onChange(e.target.value)}
          placeholder={clearable ? "بلا تدرّج" : ""}
          style={{ ...inp, width: 96, margin: 0, fontFamily: "monospace", fontSize: 12 }} />
        {clearable && value && (
          <button type="button" className="btn" style={{ ...sm, height: 30 }} onClick={() => onChange("")}>✕</button>
        )}
      </div>
    </div>
  );
}

const strip: React.CSSProperties = {
  display: "grid", gap: 14, marginBottom: 20,
  gridTemplateColumns: "repeat(auto-fit, minmax(270px, 1fr))",
};
const cardBox: React.CSSProperties = {
  borderRadius: 12, display: "flex", flexDirection: "column",
  boxShadow: "0 1px 3px rgba(0,0,0,.12)", overflow: "hidden",
};
const lbl: React.CSSProperties = {
  display: "block", fontSize: 12, fontWeight: 700,
  color: "var(--muted)", margin: "12px 2px 5px",
};
const inp: React.CSSProperties = {
  width: "100%", height: 38, padding: "0 11px", borderRadius: 8,
  border: "1px solid var(--border)", background: "var(--surface)",
  color: "var(--text)", fontSize: 13.5, fontFamily: "inherit",
};
const sm: React.CSSProperties = { height: 32, padding: "0 11px", fontSize: 12.5 };
