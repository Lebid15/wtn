import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../auth";

interface SProduct { id: number; name: string; price: string; require_player_id: boolean }
interface SGame { id: number; name: string; image_url: string; require_player_id: boolean; products: SProduct[] }

export default function Store() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [games, setGames] = useState<SGame[]>([]);
  const [active, setActive] = useState<SGame | null>(null);
  const [buy, setBuy] = useState<SProduct | null>(null);

  useEffect(() => {
    api.get("/store/catalog/").then((r) => setGames(r.data.games));
  }, []);

  const money = (v: string) => Number(v).toLocaleString("en-US", { minimumFractionDigits: 2 });

  return (
    <div style={{ minHeight: "100vh", background: "#eef1f2" }}>
      {/* هيدر المتجر */}
      <div style={header}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 26 }}>🎮</span>
          <b style={{ fontSize: 18 }}>{user?.tenant?.name || "متجر الشحن"}</b>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={walletChip}>
            💰 {user?.wallet ? money(user.wallet.balance) : "0.00"} {user?.wallet?.currency}
          </span>
          <button onClick={() => nav("/oyunpin/orders")} style={linkBtn}>طلباتي</button>
          <button onClick={logout} style={linkBtn}>خروج</button>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: 20 }}>
        {!active ? (
          <>
            <h2 style={{ marginBottom: 16, color: "var(--primary-dark)" }}>اختر لعبة للشحن</h2>
            <div style={grid}>
              {games.map((g) => (
                <div key={g.id} style={gameCard} onClick={() => setActive(g)}>
                  <div style={gameThumb}>{g.image_url ? <img src={g.image_url} style={{ width: "100%", borderRadius: 10 }} /> : "🎮"}</div>
                  <div style={{ fontWeight: 700, marginTop: 10 }}>{g.name}</div>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 3 }}>{g.products.length} باقة</div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <button onClick={() => setActive(null)} style={backBtn}>← كل الألعاب</button>
            <h2 style={{ margin: "10px 0 16px", color: "var(--primary-dark)" }}>باقات {active.name}</h2>
            <div style={grid}>
              {active.products.map((p) => (
                <div key={p.id} style={pkgCard}>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{p.name}</div>
                  <div style={{ color: "var(--primary-dark)", fontSize: 20, fontWeight: 800, margin: "10px 0" }}>
                    {money(p.price)} <span style={{ fontSize: 13, color: "var(--muted)" }}>ل.ت</span>
                  </div>
                  <button className="btn g" style={{ width: "100%", height: 38 }} onClick={() => setBuy(p)}>
                    شراء الآن
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {buy && active && (
        <BuyModal product={buy} requirePlayer={active.require_player_id}
          onClose={() => setBuy(null)} />
      )}
    </div>
  );
}

function BuyModal({ product, requirePlayer, onClose }:
  { product: SProduct; requirePlayer: boolean; onClose: () => void }) {
  const [playerId, setPlayerId] = useState("");
  const [phone, setPhone] = useState("");
  const [done, setDone] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr("");
    try {
      const r = await api.post("/store/buy/", {
        product: product.id, player_id: playerId, customer_phone: phone,
      });
      setDone(r.data.receipt_no);
    } catch (e: any) {
      setErr(e?.response?.data?.detail || "فشل الشراء");
    } finally { setBusy(false); }
  }

  return (
    <div style={overlay} onClick={onClose}>
      <form style={modal} onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <div style={{ background: "var(--primary)", color: "#fff", padding: "14px 18px", fontWeight: 700 }}>
          شراء: {product.name}
        </div>
        <div style={{ padding: 20 }}>
          {done ? (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 42 }}>✅</div>
              <p style={{ margin: "10px 0", fontSize: 16 }}>تم إنشاء الطلب بنجاح!</p>
              <p style={{ color: "var(--muted)" }}>رقم الطلب: <b>{done}</b></p>
              <button type="button" className="btn" style={{ marginTop: 14 }} onClick={onClose}>إغلاق</button>
            </div>
          ) : (
            <>
              <div style={{ fontSize: 14, color: "var(--muted)", marginBottom: 14 }}>
                السعر: <b style={{ color: "var(--primary-dark)" }}>{Number(product.price).toLocaleString("en-US", { minimumFractionDigits: 2 })} ل.ت</b>
              </div>
              {requirePlayer && (
                <>
                  <label style={lbl}>معرّف اللاعب (ID)</label>
                  <input style={inp} value={playerId} onChange={(e) => setPlayerId(e.target.value)} required autoFocus />
                </>
              )}
              <label style={lbl}>رقم الهاتف (اختياري)</label>
              <input style={inp} value={phone} onChange={(e) => setPhone(e.target.value)} />
              {err && <div style={errBox}>{err}</div>}
              <button className="btn g" style={{ width: "100%", height: 42, marginTop: 16 }} disabled={busy}>
                {busy ? "جارٍ..." : "تأكيد الشراء"}
              </button>
            </>
          )}
        </div>
      </form>
    </div>
  );
}

const header: React.CSSProperties = {
  display: "flex", alignItems: "center", justifyContent: "space-between",
  background: "var(--primary)", color: "#fff", padding: "12px 24px",
};
const walletChip: React.CSSProperties = {
  background: "rgba(255,255,255,.18)", padding: "6px 14px", borderRadius: 20, fontWeight: 700,
};
const linkBtn: React.CSSProperties = {
  background: "transparent", border: "1px solid rgba(255,255,255,.4)", color: "#fff",
  padding: "6px 12px", borderRadius: 5, fontSize: 13,
};
const grid: React.CSSProperties = {
  display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 16,
};
const gameCard: React.CSSProperties = {
  background: "#fff", borderRadius: 12, padding: 16, textAlign: "center",
  cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,.06)",
};
const gameThumb: React.CSSProperties = {
  height: 120, display: "flex", alignItems: "center", justifyContent: "center",
  fontSize: 54, background: "#f2f5f6", borderRadius: 10,
};
const pkgCard: React.CSSProperties = {
  background: "#fff", borderRadius: 12, padding: 18, textAlign: "center",
  boxShadow: "0 2px 8px rgba(0,0,0,.06)",
};
const backBtn: React.CSSProperties = {
  background: "#fff", border: "1px solid var(--border)", padding: "7px 14px", borderRadius: 6,
};
const overlay: React.CSSProperties = {
  position: "fixed", inset: 0, background: "rgba(0,0,0,.45)",
  display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
};
const modal: React.CSSProperties = {
  width: 400, background: "#fff", borderRadius: 10, overflow: "hidden",
};
const lbl: React.CSSProperties = { display: "block", fontSize: 13, color: "var(--muted)", margin: "12px 2px 5px" };
const inp: React.CSSProperties = { width: "100%", height: 40 };
const errBox: React.CSSProperties = {
  background: "#fdecea", border: "1px solid #f5c6c2", color: "var(--danger)",
  fontSize: 13, padding: "9px 12px", borderRadius: 5, marginTop: 12,
};
