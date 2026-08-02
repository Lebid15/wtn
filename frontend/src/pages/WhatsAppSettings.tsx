import { useEffect, useRef, useState } from "react";
import { api } from "../api";
import Icon from "../components/Icon";

interface Placeholder { token: string; alt: string; desc: string }
interface Account {
  status: string; status_label: string; bot_running: boolean; qr: string;
  device_number: string; error: string; enabled: boolean;
  min_delay: number; max_delay: number; batch_size: number; batch_pause: number;
  balance_template: string; last_seen: string; placeholders: Placeholder[];
}
interface QueueRow {
  id: number; name: string; number: string; status: string; status_label: string;
  error: string; attempts: number; created_at: string; sent_at: string;
}

const STATUS_COLOR: Record<string, string> = {
  connected: "var(--ok)", qr: "var(--warn, #e0a800)",
  connecting: "var(--primary)", closed: "var(--danger)", idle: "var(--muted)",
};

export default function WhatsAppSettings() {
  const [a, setA] = useState<Account | null>(null);
  const [preview, setPreview] = useState("");
  const [queue, setQueue] = useState<QueueRow[]>([]);
  const [pending, setPending] = useState(0);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const areaRef = useRef<HTMLTextAreaElement>(null);

  /** استفتاء دائم: حالة الجلسة تتغيّر من جهة البوت لا من جهتنا. */
  useEffect(() => {
    let alive = true;
    const tick = () => {
      api.get("/whatsapp/queue/").then((r) => {
        if (!alive) return;
        setQueue(r.data.results);
        setPending(r.data.pending);
        setA((old) => (old ? { ...old, ...r.data.session, balance_template: old.balance_template } : r.data.session));
      }).catch(() => {});
    };
    api.get("/whatsapp/settings/").then((r) => { if (alive) setA(r.data); });
    tick();
    const id = setInterval(tick, 2500);
    return () => { alive = false; clearInterval(id); };
  }, []);

  /** معاينة القالب على وكيل حقيقي — بعد سكون الكتابة بنصف ثانية. */
  useEffect(() => {
    if (!a) return;
    const id = setTimeout(() => {
      api.post("/whatsapp/preview/", { balance_template: a.balance_template })
        .then((r) => setPreview(r.data.text || r.data.detail || ""))
        .catch(() => {});
    }, 450);
    return () => clearTimeout(id);
  }, [a?.balance_template]);

  if (!a) return <div style={{ padding: 30, color: "var(--muted)" }}>جارٍ التحميل...</div>;
  const set = (k: keyof Account, v: any) => setA((o) => (o ? { ...o, [k]: v } : o));

  async function call(path: string, body?: any) {
    setBusy(true); setMsg(null);
    try {
      const r = await api.post(`/whatsapp/${path}`, body || {});
      return r.data;
    } catch (e: any) {
      setMsg({ ok: false, text: e?.response?.data?.detail || "تعذّرت العملية" });
      return null;
    } finally { setBusy(false); }
  }

  async function save() {
    setBusy(true); setMsg(null);
    try {
      const r = await api.put("/whatsapp/settings/", {
        balance_template: a!.balance_template, enabled: a!.enabled,
        min_delay: a!.min_delay, max_delay: a!.max_delay,
        batch_size: a!.batch_size, batch_pause: a!.batch_pause,
      });
      setA(r.data);
      setMsg({ ok: true, text: "حُفظت الإعدادات" });
    } catch (e: any) {
      setMsg({ ok: false, text: e?.response?.data?.detail || "تعذّر الحفظ" });
    } finally { setBusy(false); }
  }

  /** يُدرج العنصر النائب عند مؤشّر الكتابة لا في آخر النص. */
  function insert(token: string) {
    const el = areaRef.current;
    const t = a!.balance_template;
    const at = el ? el.selectionStart : t.length;
    set("balance_template", t.slice(0, at) + token + t.slice(el ? el.selectionEnd : t.length));
    setTimeout(() => { el?.focus(); el?.setSelectionRange(at + token.length, at + token.length); }, 0);
  }

  const color = STATUS_COLOR[a.status] || "var(--muted)";

  return (
    <div style={{ padding: 16, maxWidth: 1120, margin: "0 auto" }}>
      <h2 style={{ fontSize: 20, color: "var(--primary-dark)", marginBottom: 14 }}>
        واتساب — ربط الرقم ورسالة الرصيد
      </h2>

      {!a.bot_running && (
        <div style={warn}>
          <b>برنامج واتساب لا يعمل الآن.</b> شغّله على الجهاز الذي يحمل الرقم
          (<code style={code}>npm start</code> داخل مجلّد <code style={code}>bot</code>)،
          ثم عُد إلى هذه الصفحة. ما تضغطه من إرسال يبقى محفوظاً في الطابور وينطلق
          حين يعمل — لا يضيع شيء.
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 320px", gap: 16, alignItems: "start" }}>
        {/* ═══ القالب ═══ */}
        <div style={panel}>
          <div style={panelHead}>نصّ الرسالة</div>
          <div style={{ padding: 18 }}>
            <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 8 }}>
              اضغط عنصراً ليُدرَج في مكان المؤشّر — يستبدله النظام بقيمة الوكيل عند الإرسال:
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
              {a.placeholders.map((p) => (
                <button key={p.token} type="button" title={p.desc} onClick={() => insert(p.token)}
                  style={chip}>{p.token}</button>
              ))}
            </div>
            <textarea ref={areaRef} value={a.balance_template} rows={8}
              onChange={(e) => set("balance_template", e.target.value)}
              style={{ width: "100%", borderRadius: 8, padding: 12, fontSize: 14, lineHeight: 1.9,
                border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)" }} />

            <div style={{ ...lbl, marginTop: 14 }}>المعاينة — كما ستصل الوكيل</div>
            <div style={bubble}>{preview || "—"}</div>

            <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 16 }}>
              <button className="btn g" onClick={save} disabled={busy}>
                {busy ? "جارٍ الحفظ..." : "حفظ"}
              </button>
              <label style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13 }}>
                <input type="checkbox" checked={a.enabled} onChange={(e) => set("enabled", e.target.checked)} />
                تفعيل الإرسال بواتساب
              </label>
            </div>
          </div>
        </div>

        {/* ═══ الجلسة ═══ */}
        <div style={panel}>
          <div style={panelHead}>حالة الربط</div>
          <div style={{ padding: 18, textAlign: "center" }}>
            <div style={{ fontSize: 15, fontWeight: 800, color, marginBottom: 4 }}>
              <span style={{ ...dot, background: color }} /> {a.status_label}
            </div>
            {a.device_number && (
              <div style={{ fontSize: 13, color: "var(--muted)", direction: "ltr" }}>{a.device_number}</div>
            )}
            {a.error && <div style={{ fontSize: 12, color: "var(--danger)", marginTop: 6 }}>{a.error}</div>}

            {a.qr ? (
              <div style={{ marginTop: 12 }}>
                <img src={a.qr} alt="رمز الربط" style={{ width: 240, maxWidth: "100%", borderRadius: 8, background: "#fff", padding: 8 }} />
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 8, lineHeight: 1.8 }}>
                  من هاتف الرقم: واتساب ← <b>الأجهزة المرتبطة</b> ← ربط جهاز،
                  ثم امسح الرمز. الرمز يتجدّد وحده كل بضع ثوانٍ.
                </div>
              </div>
            ) : (
              <div style={{ marginTop: 14, display: "grid", gap: 8 }}>
                {a.status !== "connected" ? (
                  <button className="btn g" disabled={busy || !a.bot_running}
                    onClick={async () => { const d = await call("connect/"); if (d) setA((o) => o ? { ...o, ...d, balance_template: o.balance_template } : d); }}>
                    <Icon name="link" size={14} style={{ marginInlineEnd: 6, verticalAlign: -2 }} />
                    ربط واتساب
                  </button>
                ) : (
                  <button className="btn r" disabled={busy}
                    onClick={async () => {
                      if (!confirm("قطع الجلسة يمسح مفاتيحها، وسيلزم مسح رمز QR من جديد. متابعة؟")) return;
                      await call("logout/");
                    }}>قطع الربط</button>
                )}
              </div>
            )}

            <div style={{ borderTop: "1px solid var(--border)", marginTop: 16, paddingTop: 14, textAlign: "start" }}>
              <div style={{ fontSize: 12.5, fontWeight: 800, color: "var(--primary-dark)", marginBottom: 10 }}>
                التهدئة — حاجزك ضدّ حظر الرقم
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <Num label="أقلّ تأخير (ث)" value={a.min_delay} onChange={(v) => set("min_delay", v)} />
                <Num label="أكثر تأخير (ث)" value={a.max_delay} onChange={(v) => set("max_delay", v)} />
                <Num label="رسائل الدفعة" value={a.batch_size} onChange={(v) => set("batch_size", v)} />
                <Num label="استراحة بينها (ث)" value={a.batch_pause} onChange={(v) => set("batch_pause", v)} />
              </div>
              <div style={hint}>
                البوت ينتظر مدّةً عشوائية بين كل رسالتين، ويستريح بعد كل دفعة.
                تقليل هذه الأرقام يرفع خطر حظر الرقم من واتساب.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ الطابور ═══ */}
      <div style={{ ...panel, marginTop: 16 }}>
        <div style={{ ...panelHead, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>طابور الإرسال {pending > 0 && <span style={{ opacity: .85, fontWeight: 400 }}>· {pending} بانتظار الإرسال</span>}</span>
          {pending > 0 && (
            <button className="btn r" style={{ height: 26, fontSize: 12 }} disabled={busy}
              onClick={async () => { if (confirm(`إلغاء ${pending} رسالة لم تُرسل بعد؟`)) await call("cancel-pending/"); }}>
              إلغاء المعلّق
            </button>
          )}
        </div>
        <div className="table-scroll">
          <table className="grid">
            <thead>
              <tr><th>الوكيل</th><th>الرقم</th><th>الحالة</th><th>الملاحظة</th><th>أُنشئت</th><th>أُرسلت</th></tr>
            </thead>
            <tbody>
              {queue.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: 26, color: "var(--muted)" }}>لم تُرسل رسائل بعد</td></tr>
              ) : queue.map((m) => (
                <tr key={m.id}>
                  <td className="cell-start" style={{ fontWeight: 700 }}>{m.name || "—"}</td>
                  <td className="num" style={{ direction: "ltr", fontSize: 12.5 }}>{m.number}</td>
                  <td>
                    <span className={`pill ${m.status === "sent" ? "on" : m.status === "failed" ? "off" : ""}`}>
                      {m.status_label}
                    </span>
                  </td>
                  <td style={{ fontSize: 12, color: "var(--danger)" }}>{m.error || ""}</td>
                  <td style={{ fontSize: 12, color: "var(--muted)" }}>{m.created_at}</td>
                  <td style={{ fontSize: 12, color: "var(--muted)" }}>{m.sent_at || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {msg && (
        <div style={{
          marginTop: 14, fontSize: 13, padding: "9px 13px", borderRadius: 7,
          background: msg.ok ? "rgba(53,194,69,.10)" : "rgba(221,68,68,.10)",
          color: msg.ok ? "var(--ok)" : "var(--danger)",
        }}>{msg.text}</div>
      )}
    </div>
  );
}

function Num({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <div style={lbl}>{label}</div>
      <input type="number" min={0} value={value} onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: "100%", height: 34, borderRadius: 7 }} />
    </div>
  );
}

const panel: React.CSSProperties = {
  background: "var(--surface)", border: "1px solid var(--border)",
  borderRadius: 10, overflow: "hidden",
};
const panelHead: React.CSSProperties = {
  background: "var(--primary)", color: "#fff", padding: "10px 18px",
  fontSize: 14.5, fontWeight: 700,
};
const lbl: React.CSSProperties = {
  fontSize: 12, color: "var(--muted)", fontWeight: 700, marginBottom: 5,
};
const chip: React.CSSProperties = {
  border: "1px solid var(--border)", background: "var(--surface-2)",
  color: "var(--primary-dark)", borderRadius: 20, padding: "4px 12px",
  fontSize: 12, cursor: "pointer", fontWeight: 700,
};
const bubble: React.CSSProperties = {
  whiteSpace: "pre-wrap", background: "#dcf8c6", color: "#0b1f14",
  border: "1px solid #bfe6a8", borderRadius: "12px 12px 12px 3px",
  padding: "12px 14px", fontSize: 14, lineHeight: 1.9, minHeight: 60,
};
const hint: React.CSSProperties = {
  background: "var(--surface-2)", border: "1px solid var(--border)",
  color: "var(--muted)", fontSize: 11.5, padding: "8px 11px",
  borderRadius: 6, lineHeight: 1.8, marginTop: 10,
};
const warn: React.CSSProperties = {
  background: "rgba(224,168,0,.12)", border: "1px solid rgba(224,168,0,.45)",
  color: "var(--text)", fontSize: 13, padding: "11px 14px", borderRadius: 8,
  marginBottom: 14, lineHeight: 1.9,
};
const code: React.CSSProperties = {
  background: "var(--surface-2)", border: "1px solid var(--border)",
  borderRadius: 4, padding: "1px 6px", fontSize: 12, direction: "ltr",
  display: "inline-block",
};
const dot: React.CSSProperties = {
  display: "inline-block", width: 9, height: 9, borderRadius: "50%",
  marginInlineEnd: 6, verticalAlign: 1,
};
