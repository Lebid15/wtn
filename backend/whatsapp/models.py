"""
نماذج واتساب: حساب المتجر (جلسة + قالب) · مفاتيح الاعتماد · طابور الإرسال.

**المبدأ المعماري:** Django لا يتّصل بواتساب إطلاقاً. هو يكتب ما يجب إرساله
في طابور (`OutboundMessage`)، وبرنامج البوت (Node + Baileys) — الذي يعيش على
جهاز يعمل دائماً — هو من **يسأل** الموقع عن المطلوب ثم يرسل ويعيد النتيجة.

ولماذا يسأل البوت بدل أن يُنادى؟ لأن الموقع على استضافة مجانية تنام، والبوت
قد يكون على جهاز المالك بلا عنوان عام. فالسحب يجعل الطرفين يعملان بلا أن
يحتاج أحدهما أن يكون قابلاً للنداء من الآخر — وينتقل البوت لاحقاً إلى سيرفر
مدفوع بتغيير عنوان واحد، بلا لمس أي سطر هنا.

**مفاتيح الجلسة تُحفظ في القاعدة لا على القرص** — لسببين:
1. قرص الاستضافة مؤقّت يُمسح مع كل نشر (نفس سبب حفظ صور الهوية data URL).
2. فينتقل البوت من جهاز إلى سيرفر بلا إعادة مسح رمز QR — الجلسة تتبع القاعدة
   لا الجهاز.
وهي مشفّرة **قبل أن تصل إلى Django**: مفتاح التشفير على جهاز البوت وحده،
فالقاعدة تخزّن نصّاً معمّى لا تفهمه ولا تستطيع استعماله.
"""
from django.db import models

from core.models import Tenant, User


class WhatsAppAccount(models.Model):
    """حساب واتساب المتجر — صفّ واحد لكل متجر: حالة الجلسة + قالب الرسالة."""

    class Status(models.TextChoices):
        IDLE = "idle", "غير مربوط"
        QR = "qr", "بانتظار مسح الرمز"
        CONNECTING = "connecting", "جارٍ الاتصال"
        CONNECTED = "connected", "متّصل"
        CLOSED = "closed", "منقطع"

    class Want(models.TextChoices):
        """أمر معلّق ينتظر البوت أن يلتقطه في نبضته التالية."""
        NONE = "none", "لا شيء"
        START = "start", "ابدأ الجلسة"
        LOGOUT = "logout", "اقطع الجلسة"

    tenant = models.OneToOneField(Tenant, on_delete=models.CASCADE, related_name="whatsapp")

    # ── الجلسة ──
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.IDLE)
    want = models.CharField(max_length=8, choices=Want.choices, default=Want.NONE)
    qr = models.TextField(blank=True, default="")          # data URL مؤقّت — يُمسح فور الاتصال
    device_number = models.CharField(max_length=32, blank=True, default="")  # الرقم المرتبط
    error = models.CharField(max_length=255, blank=True, default="")
    last_seen = models.DateTimeField(null=True, blank=True)  # آخر نبضة من البوت

    # ── الإرسال ──
    enabled = models.BooleanField(default=True)
    # التهدئة: تأخير عشوائي بين رسالة وأخرى — أهمّ حاجز ضد حظر الرقم
    min_delay = models.PositiveIntegerField(default=4)    # ثوانٍ
    max_delay = models.PositiveIntegerField(default=10)   # ثوانٍ
    batch_size = models.PositiveIntegerField(default=25)  # رسائل الدفعة قبل استراحة
    batch_pause = models.PositiveIntegerField(default=300)  # ثوانٍ استراحة بين الدفعات

    # ── القالب ──
    balance_template = models.TextField(
        blank=True,
        default=(
            "مرحباً {الاسم} 👋\n"
            "دَينك الحالي {الدين} {العملة}.\n"
            "نرجو التسديد، وشكراً لتعاملك معنا.\n"
            "{المتجر}"
        ),
    )

    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "whatsapp_accounts"

    def __str__(self):
        return f"واتساب {self.tenant.name} [{self.get_status_display()}]"


class WhatsAppAuthKey(models.Model):
    """
    مفتاح واحد من مفاتيح جلسة Baileys — يقابل ملفاً واحداً في
    `useMultiFileAuthState`. القيمة **مشفّرة على جهاز البوت** قبل وصولها.
    """

    account = models.ForeignKey(WhatsAppAccount, on_delete=models.CASCADE, related_name="auth_keys")
    key = models.CharField(max_length=200)   # اسم الملف: creds · pre-key-3 · session-…
    value = models.TextField()               # نصّ معمّى (AES-256-GCM)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "whatsapp_auth_keys"
        unique_together = [("account", "key")]

    def __str__(self):
        return f"{self.account_id}/{self.key}"


class OutboundMessage(models.Model):
    """رسالة في طابور الإرسال. الطابور نفسه هو العامل الخلفي — لا Celery."""

    class Status(models.TextChoices):
        PENDING = "pending", "بانتظار الإرسال"
        SENDING = "sending", "جارٍ الإرسال"
        SENT = "sent", "أُرسلت"
        FAILED = "failed", "فشلت"
        CANCELED = "canceled", "أُلغيت"

    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name="wa_messages")
    to_user = models.ForeignKey(
        User, null=True, blank=True, on_delete=models.SET_NULL, related_name="wa_messages"
    )
    to_number = models.CharField(max_length=32)  # مطبَّع: أرقام فقط مع رمز الدولة
    text = models.TextField()
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING)
    attempts = models.PositiveSmallIntegerField(default=0)
    error = models.CharField(max_length=255, blank=True, default="")
    batch = models.CharField(max_length=40, blank=True, default="")  # معرّف دفعة الإرسال الجماعي
    created_by = models.ForeignKey(
        User, null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    sent_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "whatsapp_outbound"
        ordering = ["id"]
        indexes = [models.Index(fields=["tenant", "status"])]

    def __str__(self):
        return f"{self.to_number} [{self.get_status_display()}]"
