import { useEffect, useMemo, useRef, useState } from "react";

export interface PickerProduct { id: number; name: string; game_name: string }

/**
 * قائمة منسدلة ببحث لاختيار الباقات — أو «كل الباقات».
 *
 * الاختيار الفارغ يعني **الكل** عمداً: هو حال الفتح الأولى، وهو ما يريده
 * المالك في أغلب الاستعمال، فلا يُجبَر على تحديد مئة باقة ليقصد كلّها.
 */
export default function ProductPicker({
  products, value, onChange, placeholder = "كل الباقات", meta,
}: {
  products: PickerProduct[];
  value: number[];
  onChange: (ids: number[]) => void;
  placeholder?: string;
  /** سطر جانبي لكل باقة — رقم ربطها وسعرها لدى المزوّد مثلاً. */
  meta?: (id: number) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // الباقات مجمّعة تحت ألعابها، مصفّاةً بالبحث
  const groups = useMemo(() => {
    const t = term.trim().toLowerCase();
    const rows = t
      ? products.filter((p) =>
          p.name.toLowerCase().includes(t) || (p.game_name || "").toLowerCase().includes(t))
      : products;
    const map = new Map<string, PickerProduct[]>();
    for (const p of rows) {
      const g = p.game_name || "—";
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(p);
    }
    return [...map.entries()];
  }, [products, term]);

  const shownIds = useMemo(() => groups.flatMap(([, rows]) => rows.map((r) => r.id)), [groups]);
  const selected = new Set(value);

  function toggle(id: number) {
    onChange(selected.has(id) ? value.filter((v) => v !== id) : [...value, id]);
  }
  function toggleGame(rows: PickerProduct[]) {
    const all = rows.every((r) => selected.has(r.id));
    const ids = rows.map((r) => r.id);
    onChange(all ? value.filter((v) => !ids.includes(v)) : [...new Set([...value, ...ids])]);
  }

  const label = value.length === 0
    ? placeholder
    : value.length === 1
      ? products.find((p) => p.id === value[0])?.name || "باقة واحدة"
      : `${value.length} باقة مختارة`;

  return (
    <div ref={box} style={{ position: "relative" }}>
      <button type="button" style={field} onClick={() => setOpen((o) => !o)}>
        <span style={{ color: value.length ? "inherit" : "var(--muted)" }}>{label}</span>
        <span style={{ marginInlineStart: "auto", opacity: 0.6 }}>▾</span>
      </button>

      {open && (
        <div style={panel}>
          <div style={{ padding: 8, borderBottom: "1px solid var(--border)" }}>
            <input autoFocus placeholder="ابحث عن باقة أو لعبة..." value={term}
              onChange={(e) => setTerm(e.target.value)} style={{ width: "100%" }} />
          </div>

          <div style={{ display: "flex", gap: 8, padding: "7px 9px", borderBottom: "1px solid var(--border)" }}>
            <button type="button" style={mini} onClick={() => onChange([])}>كل الباقات</button>
            <button type="button" style={mini} onClick={() => onChange([...new Set([...value, ...shownIds])])}>
              اختر الظاهر ({shownIds.length})
            </button>
          </div>

          <div style={{ maxHeight: 260, overflowY: "auto" }}>
            {groups.length === 0 && (
              <div style={{ padding: 14, color: "var(--muted)", fontSize: 13 }}>لا نتائج</div>
            )}
            {groups.map(([game, rows]) => (
              <div key={game}>
                <div style={gameRow} onClick={() => toggleGame(rows)}>
                  {game}
                  <span style={{ marginInlineStart: "auto", fontSize: 11, opacity: 0.7 }}>
                    {rows.length}
                  </span>
                </div>
                {rows.map((p) => (
                  <label key={p.id} style={itemRow}>
                    <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggle(p.id)} />
                    <span>{p.name}</span>
                    {meta && <span style={metaCell}>{meta(p.id)}</span>}
                  </label>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const field: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 6, width: "100%", height: 34,
  padding: "0 10px", borderRadius: 6, border: "1px solid var(--border)",
  background: "var(--surface)", cursor: "pointer", font: "inherit", fontSize: 13.5,
  textAlign: "start",
};
const panel: React.CSSProperties = {
  position: "absolute", insetInlineStart: 0, top: "calc(100% + 4px)", zIndex: 20,
  width: "100%", minWidth: 260, background: "var(--surface)",
  border: "1px solid var(--border)", borderRadius: 8,
  boxShadow: "0 8px 24px rgba(0,0,0,.18)",
};
const mini: React.CSSProperties = {
  font: "inherit", fontSize: 11.5, padding: "3px 9px", borderRadius: 5,
  border: "1px solid var(--border)", background: "var(--row-alt)", cursor: "pointer",
};
const gameRow: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 6, background: "var(--row-alt)",
  padding: "5px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer",
};
const itemRow: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 8, padding: "5px 14px",
  fontSize: 13, cursor: "pointer",
};
const metaCell: React.CSSProperties = {
  marginInlineStart: "auto", display: "flex", alignItems: "center", gap: 8,
  fontSize: 11.5, whiteSpace: "nowrap",
};
