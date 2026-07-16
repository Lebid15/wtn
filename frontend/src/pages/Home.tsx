import Icon from "../components/Icon";

export default function Home() {
  return (
    <div style={{ maxWidth: 1340, margin: "0 auto", padding: "40px 16px" }}>
      <div style={{
        background: "var(--surface)", border: "1px solid var(--border)",
        borderRadius: 12, padding: "48px 32px", textAlign: "center",
      }}>
        <div style={{ color: "var(--primary)", marginBottom: 14 }}>
          <Icon name="home" size={44} />
        </div>
        <h1 style={{ fontSize: 26, color: "var(--primary-dark)", marginBottom: 10 }}>
          هنا الصفحة الرئيسية
        </h1>
        <p style={{ color: "var(--muted)", fontSize: 15, lineHeight: 1.9 }}>
          هذه هي لوحة البداية لصاحب المتجر. سنضيف هنا لاحقاً ملخّص المبيعات
          والأرباح وأحدث الطلبات والتنبيهات.
        </p>
      </div>
    </div>
  );
}
