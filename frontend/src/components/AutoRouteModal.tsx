import { useEffect, useState } from "react";
import { api } from "../api";
import Icon from "../components/Icon";

interface Game { id: number; name: string }
interface Hop { id: number; name: string; price: string | null; loss: boolean }
interface PlanRow {
  id: number; name: string; game: string;
  was_manual: boolean;
  before: string[];
  after: Hop[];
  dropped: number;
  changed: boolean;
  note: string;
}

/**
 * توجيه تلقائي حسب السعر: الأرخص رئيسياً ثم الأغلى بديلاً.
 *
 * بخطوتين عمداً — **معاينة ثم تنفيذ**. التوجيه يقرّر أين يُنفَق مالُ كل طلب
 * لاحق، فرؤية ما سيتغيّر قبل وقوعه ليست ترفاً.
 */
export default function AutoRouteModal({ onClose, onDone }: {
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const [games, setGames] = useState<Game[]>([]);
  const [game, setGame] = useState<number | "">("");
  const [refresh, setRefresh] = useState(true);
  const [plan, setPlan] = useState<PlanRow[] | null>(null);
  const [onlyChanged, setOnlyChanged] = useState(true);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    api.get("/catalog/games/").then((r) => setGames(r.data));
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function preview() {
    setErr("");
    try {
      // الترتيب بأسعار قديمة يعطي سلسلةً خاطئة بثقة — فتُجلب الأحدث أوّلاً
      if (refresh) {
        setBusy("جارٍ جلب أحدث الأسعار من المزوّدين...");
        await api.post("/catalog/product-links/refresh-prices/");
      }
      setBusy("جارٍ حساب الترتيب...");
      const r = await api.post("/catalog/auto-route/", { game: game || null, apply: false });
      setPlan(r.data.plan);
    } catch (e: any) {
      setErr(e?.response?.data?.detail || "تعذّرت المعاينة");
    } finally {
      setBusy("");
    }
  }

  async function apply() {
    setErr("");
    setBusy("جارٍ التوجيه...");
    try {
      const r = await api.post("/catalog/auto-route/", { game: game || null, apply: true });
      onDone(`✅ وُجِّهت ${r.data.changed} باقة من ${r.data.total} حسب السعر`);
    } catch (e: any) {
      setErr(e?.response?.data?.detail || "تعذّر التوجيه");
      setBusy("");
    }
  }

  const changed = plan?.filter((r) => r.changed) ?? [];
  const rows = plan ? (onlyChanged ? changed : plan) : [];
  const manualCount = changed.filter((r) => r.was_manual).length;
  const lossCount = changed.filter((r) => r.after.some((h) => h.loss)).length;
  const orphanCount = plan?.filter((r) => r.note).length ?? 0;

  return (
    <div style={overlay} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div style={box}>
        <div style={head}>
          توجيه تلقائي حسب السعر
          <button type="button" style={xBtn} onClick={onClose}>✕</button>
        </div>

        <div style={{ padding: 16, overflowY: "auto", flex: 1 }}>
          {!plan ? (
            <>
              <label style={label}>اللعبة</label>
              <select value={game} onChange={(e) => setGame(e.target.value ? Number(e.target.value) : "")}
                style={input}>
                <option value="">كل الألعاب</option>
                {games.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>

              <label style={{ ...checkRow, marginTop: 14 }}>
                <input type="checkbox" checked={refresh} onChange={(e) => setRefresh(e.target.checked)} />
                <span>
                  اجلب أحدث الأسعار من المزوّدين أوّلاً
                  <div style={hint}>
                    الترتيب بأسعار قديمة يعطي سلسلةً خاطئة بثقة. أبطِله إن كنت
                    حدّثت الأسعار للتوّ.
                  </div>
                </span>
              </label>

              <div style={explain}>
                <b>كيف يُرتَّب؟</b> لكل باقة تُقارَن أسعار مزوّديها المربوطين، فيصير
                <b> الأرخص API 1</b>، والذي يليه <b>API 2</b>، ثم <b>API 3</b>.
                <div style={{ marginTop: 6 }}>
                  المزوّد <b style={{ color: "var(--danger)" }}>الخاسر</b> (سعره فوق سعر بيعك)
                  يوضع آخر السلسلة لا يُستبعَد — حماية الخسارة تمنعه وقت الإرسال،
                  وإن رفعت سعر بيعك صار صالحاً بلا إعادة توجيه.
                  والمزوّد <b>مجهول السعر</b> يأتي بعد الرابحين، لأنه لا يُرتَّب ولا
                  يصحّ إهماله.
                </div>
                <div style={{ marginTop: 6 }}>
                  الباقات <b>اليدوية</b> ستتحوّل إلى آلية وتُوجَّه — وستُعلَّم في المعاينة.
                </div>
              </div>
            </>
          ) : (
            <>
              <div style={summary}>
                <b>{changed.length}</b> باقة ستتغيّر من أصل <b>{plan.length}</b>.
                {manualCount > 0 && <> منها <b style={{ color: "var(--debt)" }}>{manualCount}</b> يدوية ستصير آلية.</>}
                {lossCount > 0 && <> و<b style={{ color: "var(--danger)" }}>{lossCount}</b> سلسلتها تضمّ مزوّداً خاسراً.</>}
                {orphanCount > 0 && <> و<b>{orphanCount}</b> بلا ربط بأي مزوّد.</>}
              </div>

              <label style={{ ...checkRow, marginBottom: 10 }}>
                <input type="checkbox" checked={onlyChanged} onChange={(e) => setOnlyChanged(e.target.checked)} />
                <span>أظهر ما سيتغيّر فقط</span>
              </label>

              {rows.length === 0 ? (
                <div style={{ padding: 20, color: "var(--muted)" }}>
                  لا شيء سيتغيّر — التوجيه الحالي هو الأرخص أصلاً.
                </div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                  <thead>
                    <tr>
                      <th style={th}>الباقة</th>
                      <th style={th}>الحالي</th>
                      <th style={th}>الجديد — الأرخص أولاً</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.id} style={{ borderBottom: "1px solid var(--border)",
                        opacity: r.changed ? 1 : 0.55 }}>
                        <td style={{ ...td, textAlign: "right", fontWeight: 600 }}>
                          {r.name}
                          <div style={{ fontSize: 11, fontWeight: 400, color: "var(--muted)" }}>
                            {r.game}
                            {r.was_manual && <b style={{ color: "var(--debt)" }}> · كانت يدوية</b>}
                          </div>
                        </td>
                        <td style={{ ...td, color: "var(--muted)" }}>
                          {r.before.length ? r.before.join(" ← ") : "—"}
                        </td>
                        <td style={td}>
                          {r.note ? (
                            <span style={{ color: "var(--danger)", fontSize: 11.5 }}>{r.note}</span>
                          ) : (
                            <div style={{ display: "flex", gap: 5, flexWrap: "wrap", justifyContent: "center" }}>
                              {r.after.map((h, i) => (
                                <span key={h.id} style={{ ...chip,
                                  background: h.loss ? "rgba(221,68,68,.12)" : "rgba(53,194,69,.12)",
                                  color: h.loss ? "var(--danger)" : "var(--ok)" }}>
                                  <b style={{ opacity: 0.7 }}>{i + 1}.</b> {h.name}
                                  <span dir="ltr" style={{ fontWeight: 700 }}>
                                    {h.price ?? "؟"}
                                  </span>
                                  {h.loss && " ⚠"}
                                </span>
                              ))}
                              {r.dropped > 0 && (
                                <span style={{ ...chip, background: "var(--row-alt)", color: "var(--muted)" }}>
                                  +{r.dropped} خارج السلسلة
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          )}
        </div>

        <div style={foot}>
          {busy && <span style={{ fontSize: 12.5, color: "var(--muted)" }}>{busy}</span>}
          {err && <span style={{ color: "var(--danger)", fontSize: 12.5 }}>{err}</span>}
          <button className="btn" style={{ marginInlineStart: "auto", background: "#8a999e" }}
            onClick={plan ? () => setPlan(null) : onClose}>
            {plan ? "رجوع" : "إلغاء"}
          </button>
          {!plan ? (
            <button className="btn g" disabled={!!busy} onClick={preview}>
              <Icon name="chart" size={14} style={{ marginInlineEnd: 5, verticalAlign: -2 }} />
              معاينة
            </button>
          ) : (
            <button className="btn g" disabled={!!busy || changed.length === 0} onClick={apply}>
              تطبيق على {changed.length} باقة
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const overlay: React.CSSProperties = {
  position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 80,
  display: "flex", alignItems: "center", justifyContent: "center",
};
const box: React.CSSProperties = {
  background: "var(--surface)", borderRadius: 10, width: 780, maxWidth: "95vw",
  maxHeight: "92vh", display: "flex", flexDirection: "column",
  boxShadow: "0 10px 40px rgba(0,0,0,.3)",
};
const head: React.CSSProperties = {
  background: "var(--primary)", color: "#fff", padding: "11px 16px",
  fontWeight: 700, display: "flex", alignItems: "center", flexShrink: 0,
};
const xBtn: React.CSSProperties = {
  marginInlineStart: "auto", background: "none", border: 0, color: "#fff",
  fontSize: 16, cursor: "pointer", lineHeight: 1,
};
const foot: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 8, padding: "11px 16px",
  borderTop: "1px solid var(--border)", background: "var(--row-alt)", flexShrink: 0,
};
const input: React.CSSProperties = {
  width: "100%", height: 34, padding: "0 10px", borderRadius: 6,
  border: "1px solid var(--border)", background: "var(--surface)",
  font: "inherit", fontSize: 13.5,
};
const label: React.CSSProperties = {
  display: "block", fontSize: 12.5, fontWeight: 700, marginBottom: 5,
};
const hint: React.CSSProperties = {
  fontSize: 11.5, color: "var(--muted)", marginTop: 3, lineHeight: 1.6, fontWeight: 400,
};
const checkRow: React.CSSProperties = {
  display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13,
  fontWeight: 600, cursor: "pointer",
};
const explain: React.CSSProperties = {
  background: "#f6f8f9", border: "1px solid #dbe3e5", borderRadius: 6,
  padding: "10px 13px", fontSize: 12.5, lineHeight: 1.8,
  color: "var(--muted)", marginTop: 14,
};
const summary: React.CSSProperties = {
  background: "rgba(53,194,69,.10)", borderRadius: 6, padding: "9px 13px",
  fontSize: 13, lineHeight: 1.8, marginBottom: 12,
};
const th: React.CSSProperties = {
  background: "var(--th-bg)", color: "var(--th-ink)", padding: "8px 10px",
  fontSize: 11.5, fontWeight: 800, textAlign: "center",
};
const td: React.CSSProperties = { padding: "8px 10px", textAlign: "center", verticalAlign: "middle" };
const chip: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 5, padding: "2px 8px",
  borderRadius: 20, fontSize: 11.5, whiteSpace: "nowrap",
};
