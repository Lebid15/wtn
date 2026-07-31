"""
بذور طرق الدفع لقسم «إضافة رصيد» + سعر الصرف العام — متسامحة (idempotent)
فتُشغَّل في كل نشر بلا تكرار. تُنشئ الطريقة مرّة واحدة ثم تترك تعديلات المالك.
"""
from decimal import Decimal

from django.core.management.base import BaseCommand

from core.models import Tenant
from payments.models import PaymentMethod, PaymentMethodField

# سعر الصرف العام: كم ليرة تركية تساوي وحدةً من كل عملة
RATES = {"USD": "41.5000", "SYP": "0.0032", "EUR": "45.0000"}

METHODS = [
    {
        "name": "شركة تواصل دولار",
        "subtitle": "أوتوماتيكي 24 ساعة",
        "currency": "USD",
        "color": "#0f5132",
        "min_amount": Decimal("200"),
        "instructions": (
            "خدمة إيداع شركة تواصل دولار أوتوماتيكية على مدار 24 ساعة:\n\n"
            "تفاصيل الإيداع:\n"
            "- يرجى إرسال المبلغ إلى الحساب التالي: تواصل / اعتماد مباشر\n"
            "- الحد الأدنى للإيداع: 200 دولار أمريكي.\n"
            "- مدة الإيداع: يتم إضافة الرصيد خلال دقيقة إلى 5 دقائق.\n"
            "- العمولة: 0% (لا توجد عمولات)"
        ),
        "account_box": "( 286 ) رويـال كـاش",
        "fields": [],
    },
    {
        "name": "شام كاش",
        "subtitle": "قبول خلال لحظات",
        "currency": "USD",
        "color": "#1e3a8a",
        "instructions": (
            "شرح الإيداع عبر شام كاش:\n\n"
            "1 أدخل قيمة المبلغ الذي تريد شحنه ثم اضغط على «طلب»\n"
            "2 قم بالتحويل إلى المحفظة التالية\n"
            "3 بعد التحويل أدخل رقم العملية والمعلومات المطلوبة بشكل صحيح\n"
            "4 اضغط على «طلب» لإرسال العملية\n\n"
            "⚠ حسابات شام كاش تتغيّر باستمرار — تأكّد دائماً من رقم المحفظة الحالي قبل التحويل\n"
            "❌ أي عملية تحويل تتم إلى الحسابات الملغية أو القديمة نحن غير مسؤولين عنها"
        ),
        "account_box": "ab34f2e17665a43cdeba13180d75c983",
        "fields": [
            {"label": "رقم العملية", "kind": "text", "required": True,
             "placeholder": "رقم عملية التحويل كما وصلك"},
        ],
    },
    {
        "name": "حوالات مالية — مكتب",
        "subtitle": "من 5 إلى 30 دقيقة",
        "currency": "TRY",
        "color": "#7c2d12",
        "instructions": (
            "💰 تفاصيل الإيداع عبر المكتب\n\n"
            "📍 يرجى إرسال المبلغ إلى المكتب التالي:\n"
            "👤 اسم المستلم: جمعة الصطيف\n"
            "📌 الوجهة: سرمين - إدلب\n"
            "🏢 اسم المكتب: مكتب الوزاز\n\n"
            "⌛ مدة إضافة الرصيد: من 5 إلى 30 دقيقة كحد أقصى.\n"
            "🕙 أوقات تشيك الدفعات: من 10 صباحاً حتى 10 منتصف الليل\n"
            "💎 العمولة: 0%"
        ),
        "account_box": "اسم المستلم: جمعة الصطيف /// الوجه: سرمين ادلب . . // اسم المكتب: مكتب الوزاز",
        "warning": "يرجى إرسال طلب الإيداع مع رابط صورة الإشعار وانتظار الموافقة.",
        "fields": [
            {"label": "اسم المُرسِل", "kind": "text", "required": True},
            {"label": "رابط صورة الإشعار", "kind": "image", "required": False,
             "placeholder": "https://…"},
        ],
    },
    {
        "name": "التسليم باليد كاش",
        "subtitle": "استلام مباشر",
        "currency": "TRY",
        "color": "#374151",
        "warning": "يرجى رفع طلب كتابة اسم المُستلم منك المبلغ في قسم المُلاحظة",
        "instructions": "التسليم باليد كاش — سلّم المبلغ للمندوب ثم ارفع الطلب.",
        "fields": [
            {"label": "كتابة اسم المُستلم منك المبلغ", "kind": "text", "required": True},
            {"label": "المُلاحظة", "kind": "textarea", "required": False},
        ],
    },
]


class Command(BaseCommand):
    help = "بذور طرق الدفع وسعر الصرف العام (متسامحة)"

    def handle(self, *args, **options):
        created = 0
        for tenant in Tenant.objects.all():
            # سعر الصرف: يُضبط مرّة واحدة ولا يُدهس بعدها
            if not tenant.exchange_rates:
                tenant.base_currency = tenant.base_currency or "TRY"
                tenant.exchange_rates = dict(RATES)
                tenant.save(update_fields=["base_currency", "exchange_rates"])

            for order, spec in enumerate(METHODS):
                if PaymentMethod.objects.filter(tenant=tenant, name=spec["name"]).exists():
                    continue
                fields = spec.get("fields", [])
                method = PaymentMethod.objects.create(
                    tenant=tenant, sort_order=order,
                    name=spec["name"], subtitle=spec.get("subtitle", ""),
                    currency=spec["currency"], color=spec.get("color", ""),
                    instructions=spec.get("instructions", ""),
                    account_box=spec.get("account_box", ""),
                    warning=spec.get("warning", ""),
                    min_amount=spec.get("min_amount", Decimal("0")),
                )
                for i, f in enumerate(fields):
                    PaymentMethodField.objects.create(
                        method=method, sort_order=i,
                        label=f["label"], kind=f.get("kind", "text"),
                        required=f.get("required", False),
                        placeholder=f.get("placeholder", ""),
                        options=f.get("options", ""),
                    )
                created += 1

        self.stdout.write(self.style.SUCCESS(f"طرق دفع مُنشأة: {created}"))
