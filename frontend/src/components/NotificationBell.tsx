import { useEffect, useRef, useState } from "react";
import { api } from "../api";
import Icon from "./Icon";

interface Item {
  kind: "message" | "card";
  id: number;
  ticket?: number;
  title: string;
  body: string;
  who: string;
  at: string;
}

/**
 * جرس الهيدر: ما لم يُقرأ من الرسائل وما لم يُفتح من البطاقات، في مكانٍ واحد.
 *
 * كان عدّاد الرسائل شارةً على تبويب «الدعم» وحده — تُرى إن نظر الوكيل إلى
 * الشريط، ولا تُرى وهو في صفحةٍ أخرى. والبطاقات لم يكن لها تنبيهٌ أصلاً:
 * تظهر صامتةً في الرئيسية، فمن لا يمرّ بها لا يعرف أن صاحب متجره كتب شيئاً.
 *
 * والفتحُ لا يمسح الرسائل: قراءتها تقع عند فتح المحادثة نفسها، فمسحُها هنا
 * يُخفي ما لم يُقرأ. أمّا البطاقات فالفتح **هو** رؤيتها.
 */
export default function NotificationBell({ onOpenItem }: {
  onOpenItem?: (item: Item) => void;
}) {
  const [data, setData] = useState<{ total: number; messages: number; cards: number; items: Item[] } | null>(null);
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  function load() {
    api.get("/notifications/").then((r) => setData(r.data)).catch(() => {});
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 15000);
    return () => clearInterval(id);
  }, []);

  // النقر خارج اللوحة يغلقها — بدونه تبقى معلّقة فوق ما يريد قراءته
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next && data?.cards) {
      // فتحُ اللوحة هو رؤيةُ البطاقات — نعلّمها ثم نعيد التحميل
      await api.post("/my-cards/seen/", {}).catch(() => {});
      load();
    }
  }

  const total = data?.total || 0;

  return (
    <div ref={box} style={{ position: "relative" }}>
      <button onClick={toggle} style={bellBtn} title="الإشعارات" aria-label="الإشعارات">
        <Icon name="bell" size={17} />
        {total > 0 && <span style={dot}>{total > 9 ? "9+" : total}</span>}
      </button>

      {open && (
        <div style={panel}>
          <div style={panelHead}>
            الإشعارات
            {total > 0 && (
              <span style={{ fontWeight: 400, fontSize: 12, opacity: 0.85 }}>
                {data?.messages ? `${data.messages} رسالة` : ""}
                {data?.messages && data?.cards ? " · " : ""}
                {data?.cards ? `${data.cards} إعلان` : ""}
              </span>
            )}
          </div>

          {!data?.items.length ? (
            <div style={{ padding: 22, color: "var(--muted)", fontSize: 14, textAlign: "center" }}>
              لا جديد.
            </div>
          ) : (
            <div style={{ maxHeight: 340, overflowY: "auto" }}>
              {data.items.map((it) => (
                <div key={`${it.kind}-${it.id}`} style={row}
                  onClick={() => { setOpen(false); onOpenItem?.(it); }}>
                  <span style={{ ...pill, background: it.kind === "message" ? "#0f766e" : "#b45309" }}>
                    <Icon name={it.kind === "message" ? "chat" : "bell"} size={12} />
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13.5 }}>{it.title}</div>
                    <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2,
                                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {it.who ? `${it.who} · ` : ""}{it.body}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{it.at}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const bellBtn: React.CSSProperties = {
  position: "relative", background: "rgba(255,255,255,.14)", border: 0, color: "#fff",
  width: 34, height: 34, borderRadius: 8, cursor: "pointer",
  display: "flex", alignItems: "center", justifyContent: "center",
};
const dot: React.CSSProperties = {
  position: "absolute", top: -5, insetInlineEnd: -5, background: "var(--danger)",
  color: "#fff", fontSize: 10, fontWeight: 700, borderRadius: 9, padding: "1px 5px",
  lineHeight: 1.5, minWidth: 16,
};
const panel: React.CSSProperties = {
  position: "absolute", top: 42, insetInlineEnd: 0, width: 320, background: "#fff",
  color: "var(--text)", borderRadius: 10, overflow: "hidden", zIndex: 900,
  boxShadow: "0 14px 44px rgba(0,0,0,.28)",
};
const panelHead: React.CSSProperties = {
  background: "var(--primary)", color: "#fff", padding: "10px 14px", fontWeight: 700,
  fontSize: 14, display: "flex", justifyContent: "space-between", alignItems: "center",
};
const row: React.CSSProperties = {
  display: "flex", gap: 10, alignItems: "flex-start", padding: "11px 14px",
  borderBottom: "1px solid var(--border)", cursor: "pointer",
};
const pill: React.CSSProperties = {
  width: 22, height: 22, borderRadius: "50%", color: "#fff", flexShrink: 0,
  display: "flex", alignItems: "center", justifyContent: "center", marginTop: 2,
};
