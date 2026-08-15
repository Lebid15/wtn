import { useEffect, useState } from "react";
import { api } from "../api";
import Icon from "./Icon";

interface TokenRow {
  token: string;
  created_at: string;
  last_used_at: string;
  calls: number;
}

/**
 * صفحة «API» في لوحة الوكيل — توثيقٌ يقرؤه مبرمج الجهة الخارجية.
 *
 * الأمثلة مكتوبة **بتوكن صاحب الصفحة نفسه** لا بـ `YOUR_TOKEN`: هذا الفرق
 * الصغير هو ما يجعلها تُنسخ وتعمل من أول مرّة بدل أن تُقرأ ثم تُترك.
 */
export default function ApiDocs() {
  const [row, setRow] = useState<TokenRow | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    api.get("/store/api-token/")
      .then((r) => setRow(r.data))
      .catch((e) => setMsg({ ok: false, text: e?.response?.data?.detail || "تعذّر جلب التوكن" }));
  }, []);

  async function regenerate() {
    setBusy(true); setMsg(null);
    try {
      const r = await api.post("/store/api-token/");
      setRow(r.data);
      setShow(true);
      setMsg({ ok: true, text: r.data.detail });
    } catch (e: any) {
      setMsg({ ok: false, text: e?.response?.data?.detail || "تعذّر التوليد" });
    } finally { setBusy(false); setConfirming(false); }
  }

  const base = window.location.origin;
  const token = row?.token || "";
  const masked = token ? `${token.slice(0, 6)}${"•".repeat(26)}${token.slice(-4)}` : "";

  const copy = (text: string, what: string) => {
    navigator.clipboard?.writeText(text);
    setMsg({ ok: true, text: `نُسخ ${what}` });
  };

  if (!row) {
    return <div style={{ padding: 20, color: "var(--muted)" }}>{msg?.text || "جارٍ التحميل..."}</div>;
  }

  return (
    <div style={{ display: "grid", gap: 18 }}>
      {msg && (
        <div style={{
          ...box, borderColor: msg.ok ? "#b6e0c4" : "#f0c2b6",
          background: msg.ok ? "#e7f6ec" : "#fdece7",
          color: msg.ok ? "var(--ok)" : "var(--danger)", fontWeight: 700,
        }}>{msg.text}</div>
      )}

      {/* ——— التوكن ——— */}
      <div style={box}>
        <div style={h}><Icon name="api" size={18} />مفتاح الربط (API Token)</div>
        <p style={p}>
          هذا مفتاحك أنت. من يملكه يشتري من محفظتك بلا كلمة سر — فلا تضعه في صفحة
          موقع ولا تطبيق جوّال، مكانه خادم الجهة التي تربط معك.
        </p>

        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <code style={tokenBox}>{show ? token : masked}</code>
          <button className="btn" style={sm} onClick={() => setShow((s) => !s)}>
            <Icon name="eye" size={14} style={{ marginInlineEnd: 5 }} />{show ? "إخفاء" : "إظهار"}
          </button>
          <button className="btn g" style={sm} onClick={() => copy(token, "التوكن")}>
            <Icon name="link" size={14} style={{ marginInlineEnd: 5 }} />نسخ
          </button>
        </div>

        <div style={{ display: "flex", gap: 22, flexWrap: "wrap", marginTop: 14, fontSize: 13 }}>
          <span style={{ color: "var(--muted)" }}>أُنشئ: <b style={dir}>{row.created_at}</b></span>
          <span style={{ color: "var(--muted)" }}>
            آخر استعمال: <b style={dir}>{row.last_used_at || "لم يُستعمل بعد"}</b>
          </span>
          <span style={{ color: "var(--muted)" }}>عدد النداءات: <b style={dir}>{row.calls}</b></span>
        </div>

        <div style={{ borderTop: "1px solid var(--border)", marginTop: 16, paddingTop: 14 }}>
          {confirming ? (
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <b style={{ color: "var(--danger)", fontSize: 13 }}>
                سيتوقّف كل ربط قائم فوراً حتى تعطيهم المفتاح الجديد. متأكّد؟
              </b>
              <button className="btn" style={{ ...sm, background: "var(--danger)", color: "#fff" }}
                disabled={busy} onClick={regenerate}>نعم، ولّد مفتاحاً جديداً</button>
              <button className="btn" style={sm} onClick={() => setConfirming(false)}>تراجع</button>
            </div>
          ) : (
            <button className="btn" style={sm} onClick={() => setConfirming(true)}>
              <Icon name="refresh" size={14} style={{ marginInlineEnd: 5 }} />توليد مفتاح جديد (عند التسريب)
            </button>
          )}
        </div>
      </div>

      {/* ——— البداية السريعة ——— */}
      <div style={box}>
        <div style={h}><Icon name="link" size={18} />البداية — انسخ وجرّب</div>
        <p style={p}>
          المصادقة بترويسة <code style={ic}>api-token</code> وحدها. لا اسم مستخدم ولا
          كلمة سر. كل الردود JSON.
        </p>
        <Field label="عنوان الخدمة (base URL)" value={base} onCopy={copy} />
        <Snippet
          label="جرّبه الآن — يعيد رصيدك"
          code={`curl -H "api-token: ${token}" \\\n  ${base}/client/api/profile`}
          onCopy={copy}
        />
        <div style={note}>
          <b>ملاحظة لمن يربط من متجر يعمل ببرمجية ZDK</b> (بركات · أب‑ستور وغيرهما):
          مساراتنا وأسماء حقولنا وترويستنا هي نفسها حرفاً. بدّل عنوان الخدمة
          والتوكن في إعداداتك — ولا تُعدّل كودك.
        </div>
      </div>

      {/* ——— العناوين الأربعة ——— */}
      <div style={box}>
        <div style={h}><Icon name="excel" size={18} />العناوين الأربعة</div>

        <Endpoint
          n="١" title="الرصيد" method="GET" path="/client/api/profile"
          desc="رصيدك الحالي وحدّك الائتماني وما تستطيع إنفاقه فعلاً."
          res={`{ "status": "OK",
  "data": { "balance": "500.00", "credit_limit": "0.00",
            "available": "500.00", "currency": "USD",
            "name": "…", "login_id": "…" } }`}
        />

        <Endpoint
          n="٢" title="قائمة المنتجات" method="GET" path="/client/api/products"
          desc="المنتجات المتاحة لك بأسعار شرائك أنت. المعاملات الاختيارية: products_id=1,2 لمنتجات بعينها · base=1 لردّ مختصر."
          res={`{ "status": "OK",
  "data": [ { "id": 12, "name": "60 UC", "price": "8.00",
              "available": true, "category_name": "PUBG Mobile",
              "params": ["playerId"], "product_type": "package",
              "qty_values": null, "currency": "USD" } ] }`}
        />

        <Endpoint
          n="٣" title="إرسال طلب" method="GET"
          path="/client/api/newOrder/{productId}/params"
          desc="المعاملات: qty=1 (مطلوب) · order_uuid=UUIDv4 (مطلوب) · playerId (إن كان المنتج يطلبه، انظر params في القائمة)."
          res={`{ "status": "accept",
  "data": { "order_id": "26073180840", "order_uuid": "…",
            "status": "accept", "price": "8.00",
            "product_id": 12, "product_name": "60 UC",
            "data": { "playerId": "5121…" },
            "pin": "…", "replay_api": ["…"] } }`}
        />

        <Endpoint
          n="٤" title="استعلام الحالة" method="GET" path="/client/api/check"
          desc="orders=رقم أو أرقام مفصولة بفواصل (حتى 50). أضف uuid=1 لتستعلم بمعرّفاتك أنت بدل أرقامنا — وهو ما تحتاجه إن ضاع منك الردّ."
          res={`{ "status": "OK",
  "data": [ { "order_id": "26073180840", "status": "accept",
              "price": "8.00", "pin": "…", "replay_api": ["…"] } ] }`}
        />
      </div>

      {/* ——— منع التكرار: الأهمّ ——— */}
      <div style={{ ...box, borderInlineStartWidth: 4, borderInlineStartColor: "var(--danger)" }}>
        <div style={h}><Icon name="warning" size={18} />اقرأ هذا قبل أن تكتب سطراً — منع الشحن المزدوج</div>
        <p style={p}>
          الشبكة تنقطع أحياناً <b>بعد</b> أن نشحن و<b>قبل</b> أن يصلك ردّنا. فتعيد
          المحاولة، فيُشحن اللاعب مرّتين ويُخصم رصيدك مرّتين.
        </p>
        <p style={p}>
          لذلك <code style={ic}>order_uuid</code> مطلوب في كل طلب: ولّد <b>UUIDv4
          واحداً لكل طلبٍ عندك</b>، واحفظه، وأعِد إرساله <b>نفسه</b> عند إعادة
          المحاولة. نحن نضمن أن نفس المعرّف لا يُنشئ طلبين أبداً — يعيد لك الطلب
          الأوّل بحالته الحالية ومعه <code style={ic}>duplicate: true</code>.
        </p>
        <p style={{ ...p, fontWeight: 700 }}>
          الخطأ الشائع: توليد UUID جديد عند كل محاولة. عندها يفقد المعرّف معناه
          ويشتري زبونك مرّتين.
        </p>
        <Snippet
          label="مثال كامل — طلب بمعرّف ثابت"
          code={`UUID=$(uuidgen)   # ولّده مرّة واحدة واحفظه\n\ncurl -H "api-token: ${token}" \\\n  "${base}/client/api/newOrder/12/params?qty=1&order_uuid=$UUID&playerId=5121234567"\n\n# انقطع الاتصال؟ أعد نفس الأمر بنفس \\$UUID — لن يُشحن مرّتين.`}
          onCopy={copy}
        />
      </div>

      {/* ——— الحالات ——— */}
      <div style={box}>
        <div style={h}><Icon name="check" size={18} />الحالات الثلاث</div>
        <table style={tbl}>
          <thead><tr><th style={th}>status</th><th style={th}>المعنى</th><th style={th}>ماذا تفعل</th></tr></thead>
          <tbody>
            <tr>
              <td style={td}><code style={ic}>accept</code></td>
              <td style={td}>نُفّذ الطلب</td>
              <td style={td}>خُذ <code style={ic}>pin</code> إن وُجد. بعض الباقات تُشحن على معرّف اللاعب مباشرةً فلا كود لها — وهذا نجاح صحيح.</td>
            </tr>
            <tr>
              <td style={td}><code style={ic}>wait</code></td>
              <td style={td}>قيد التنفيذ</td>
              <td style={td}>استعلم بـ <code style={ic}>check</code> كل بضع ثوانٍ. <b>لا تُعِد إرسال الطلب</b> — لم يُرفض.</td>
            </tr>
            <tr>
              <td style={td}><code style={ic}>reject</code></td>
              <td style={td}>رُفض</td>
              <td style={td}>المبلغ رُدَّ إلى محفظتك تلقائياً. راجع <code style={ic}>replay_api</code> للسبب.</td>
            </tr>
          </tbody>
        </table>
        <div style={note}>
          الطلب الذي يفشل لدى كل مزوّدينا يبقى <code style={ic}>wait</code> لا
          <code style={ic}> reject</code>، لأنه ينتظر تدخّلاً يدوياً من المتجر وقد
          يُنفَّذ بعد قليل. لا تُعِد إرساله.
        </div>
      </div>

      {/* ——— الأخطاء ——— */}
      <div style={box}>
        <div style={h}><Icon name="warning" size={18} />الأخطاء</div>
        <p style={p}>
          كل خطأ بنفس الشكل: <code style={ic}>{`{"status":"error","code":120,"message":"…"}`}</code>
        </p>
        <table style={tbl}>
          <thead><tr><th style={th}>code</th><th style={th}>المعنى</th></tr></thead>
          <tbody>
            {[
              ["120", "الترويسة api-token غائبة"],
              ["121", "التوكن غير صحيح أو أُبطل بتوليد جديد"],
              ["122", "الحساب موقوف — راجع المتجر"],
              ["100", "الرصيد لا يكفي (بعد احتساب حدّك الائتماني)"],
              ["105", "المنتج غير موجود"],
              ["106", "المنتج غير متاح للبيع الآن"],
              ["107", "order_uuid ناقص أو ليس UUID صالحاً"],
              ["108", "هذا المنتج يطلب playerId ولم تُرسله"],
              ["109", "الكمّيات غير مدعومة — أرسل qty=1"],
              ["110", "رُفض الطلب — الرسالة تشرح السبب"],
            ].map(([c, m]) => (
              <tr key={c}><td style={td}><code style={ic}>{c}</code></td><td style={td}>{m}</td></tr>
            ))}
          </tbody>
        </table>
        <div style={note}>
          حدّ النداءات ٢٤٠ في الدقيقة. تجاوزُه يردّ <code style={ic}>429</code> —
          انتظر ثوانيَ ثم أعد المحاولة.
        </div>
      </div>

      <div style={{ ...box, background: "var(--surface-2)" }}>
        <div style={h}><Icon name="wallet" size={18} />ملاحظتان على المال</div>
        <p style={p}>
          كل الأرقام بعملة العرض المضبوطة لحسابك — تجدها في حقل
          <code style={ic}> currency</code> في كل ردّ. لا تفترضها، اقرأها.
        </p>
        <p style={{ ...p, marginBottom: 0 }}>
          الخصم يقع <b>لحظة إنشاء الطلب</b> لا لحظة نجاحه. والرفض يُعيد المبلغ
          تلقائياً. فالطلب <code style={ic}>wait</code> مالُه محجوز فعلاً.
        </p>
      </div>
    </div>
  );
}

/* ————————————————— أجزاء العرض ————————————————— */

function Field({ label, value, onCopy }: {
  label: string; value: string; onCopy: (v: string, w: string) => void;
}) {
  return (
    <div style={{ margin: "10px 0" }}>
      <div style={lbl}>{label}</div>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <code style={{ ...tokenBox, flex: 1 }}>{value}</code>
        <button className="btn" style={sm} onClick={() => onCopy(value, label)}>نسخ</button>
      </div>
    </div>
  );
}

function Snippet({ label, code, onCopy }: {
  label: string; code: string; onCopy: (v: string, w: string) => void;
}) {
  return (
    <div style={{ margin: "12px 0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={lbl}>{label}</div>
        <button className="btn" style={{ ...sm, height: 26 }} onClick={() => onCopy(code, "الأمر")}>نسخ</button>
      </div>
      <pre style={pre}>{code}</pre>
    </div>
  );
}

function Endpoint({ n, title, method, path, desc, res }: {
  n: string; title: string; method: string; path: string; desc: string; res: string;
}) {
  return (
    <div style={{ borderTop: "1px solid var(--border)", paddingTop: 14, marginTop: 14 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <b style={{ fontSize: 14 }}>{n}. {title}</b>
        <span style={badge}>{method}</span>
        <code style={{ ...ic, fontSize: 13 }}>{path}</code>
      </div>
      <p style={{ ...p, margin: "8px 0" }}>{desc}</p>
      <pre style={pre}>{res}</pre>
    </div>
  );
}

/* ————————————————— الأنماط ————————————————— */

const box: React.CSSProperties = {
  background: "var(--surface)", border: "1px solid var(--border)",
  borderRadius: 10, padding: 18,
};
const h: React.CSSProperties = {
  fontWeight: 800, fontSize: 15, color: "var(--primary-dark)",
  display: "flex", alignItems: "center", gap: 8, marginBottom: 12,
};
const p: React.CSSProperties = {
  fontSize: 13.5, lineHeight: 1.9, color: "var(--text)", margin: "0 0 10px",
};
const lbl: React.CSSProperties = {
  fontSize: 12, fontWeight: 700, color: "var(--muted)", marginBottom: 5,
};
const dir: React.CSSProperties = { direction: "ltr", display: "inline-block", fontFamily: "monospace" };
const tokenBox: React.CSSProperties = {
  direction: "ltr", fontFamily: "monospace", fontSize: 13,
  background: "var(--surface-2)", border: "1px solid var(--border)",
  borderRadius: 7, padding: "9px 11px", overflowX: "auto", whiteSpace: "nowrap",
  flex: "1 1 340px", minWidth: 0,
};
const pre: React.CSSProperties = {
  direction: "ltr", textAlign: "left", fontFamily: "monospace", fontSize: 12.5,
  background: "#1f2a30", color: "#dfe9ee", borderRadius: 8, padding: "12px 14px",
  overflowX: "auto", margin: "6px 0 0", lineHeight: 1.7,
};
const ic: React.CSSProperties = {
  direction: "ltr", display: "inline-block", fontFamily: "monospace",
  background: "var(--surface-2)", borderRadius: 5, padding: "1px 6px", fontSize: 12.5,
};
const sm: React.CSSProperties = { height: 32, padding: "0 12px", fontSize: 13 };
const badge: React.CSSProperties = {
  background: "var(--primary)", color: "#fff", borderRadius: 5,
  padding: "2px 8px", fontSize: 11, fontWeight: 800, direction: "ltr",
};
const note: React.CSSProperties = {
  background: "var(--surface-2)", borderRadius: 8, padding: "10px 12px",
  fontSize: 12.5, lineHeight: 1.9, color: "var(--muted)", marginTop: 12,
};
const tbl: React.CSSProperties = { width: "100%", borderCollapse: "collapse", fontSize: 13 };
const th: React.CSSProperties = {
  textAlign: "start", padding: "8px 10px", borderBottom: "2px solid var(--border)",
  color: "var(--muted)", fontSize: 12,
};
const td: React.CSSProperties = {
  padding: "9px 10px", borderBottom: "1px solid var(--border)", lineHeight: 1.8,
};
