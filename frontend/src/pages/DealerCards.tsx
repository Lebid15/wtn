import CardsEditor from "../components/HomeCards";

/** بطاقات يكتبها صاحب المتجر لوكلائه — تظهر في رئيسية لوحة كل وكيل. */
export default function DealerCards() {
  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 16px" }}>
      <CardsEditor
        audienceLabel="الوكلاء"
        hint="تظهر في الصفحة الرئيسية لكل وكلائك فور دخولهم — إعلان أسعار جديدة، تنبيه، أو ترحيب."
      />
    </div>
  );
}
