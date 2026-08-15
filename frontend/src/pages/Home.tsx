import { useEffect, useState } from "react";
import { api } from "../api";
import Icon from "../components/Icon";
import { CardStrip, type Card } from "../components/HomeCards";

/**
 * الصفحة الرئيسية لصاحب المتجر.
 *
 * محتواها **بطاقاتٌ يكتبها مالك المنصّة** (الإعدادات ← بطاقات المتاجر): إعلان
 * ميزة، تنبيه صيانة، رسالة خاصّة بمتجر بعينه. كانت هذه الصفحة صندوقاً مكتوباً
 * فيه «سنضيف هنا لاحقاً…» — وهي أوّل ما يراه صاحب المتجر بعد كل دخول.
 */
export default function Home() {
  const [cards, setCards] = useState<Card[] | null>(null);

  useEffect(() => {
    api.get("/my-cards/").then((r) => setCards(r.data.results)).catch(() => setCards([]));
  }, []);

  return (
    <div style={{ maxWidth: 1340, margin: "0 auto", padding: "28px 16px" }}>
      {cards && cards.length > 0 && <CardStrip cards={cards} />}

      {cards !== null && cards.length === 0 && (
        <div style={{
          background: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: 12, padding: "48px 32px", textAlign: "center",
        }}>
          <div style={{ color: "var(--primary)", marginBottom: 14 }}>
            <Icon name="home" size={44} />
          </div>
          <h1 style={{ fontSize: 24, color: "var(--primary-dark)", marginBottom: 10 }}>
            أهلاً بك في لوحة متجرك
          </h1>
          <p style={{ color: "var(--muted)", fontSize: 14.5, lineHeight: 1.9 }}>
            ابدأ من <b>الألعاب</b> لضبط باقاتك وأسعارها، و<b>الوكلاء</b> لإدارة
            حساباتهم وأرصدتهم، و<b>التقارير</b> لمتابعة أرباحك.
          </p>
        </div>
      )}
    </div>
  );
}
