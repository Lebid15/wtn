"""DRF serializers للقلب."""
from rest_framework import serializers

from .text import clean_login_id
from .models import UI_SCALE_MAX, UI_SCALE_MIN, Tenant, User, Wallet


class TenantSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tenant
        fields = ["id", "name", "subdomain", "status", "theme", "font", "theme_color",
                  "logo_url", "base_currency", "ui_scale"]


# منصّات التواصل المعروضة في صفحة الدخول، بترتيب عرضها.
# مغلقةٌ عمداً: المفتاح يختار أيقونةً ونمطَ رابط، فمفتاحٌ حرّ يعطي زرّاً بلا وجه.
SOCIAL_KEYS = (
    "whatsapp", "telegram", "facebook", "instagram",
    "x", "tiktok", "youtube", "snapchat", "website",
)

# مخططات مقبولة في رابط التواصل. `javascript:` و`data:` مرفوضان: الرابط
# يُعرض لكل زائر بلا توكن، فوسمُ `<a href>` بمخطط تنفيذيّ ثغرةٌ مفتوحة.
_SAFE_SCHEMES = ("http://", "https://")

MAX_LOGO_CHARS = 3_000_000  # ≈ 2.2 ميغابايت بعد ترميز base64 — كصور الوكلاء


class SiteSettingsSerializer(serializers.ModelSerializer):
    """إعدادات الموقع (Web Site Ayarları) القابلة للتعديل."""

    class Meta:
        model = Tenant
        # الثيم والخط واللون في لوحة «المظهر» — لا يُضبطان من هنا
        fields = [
            "logo_url", "default_locale",
            "founded_year", "short_name", "full_name", "address",
            "email", "phone", "homepage_text", "footer_html",
            "tagline", "login_footer", "social_links", "ui_scale",
        ]

    # الحدّ لا يُترك للواجهة: قيمةٌ من طلبٍ مباشر تُقزّم الموقع حتى يتعذّر
    # الوصول إلى الإعدادات لإصلاحها — فيُقفل صاحبُه خارج لوحته بحقلٍ تجميلي.
    def validate_ui_scale(self, value):
        try:
            n = int(value)
        except (TypeError, ValueError):
            raise serializers.ValidationError("حجم العرض رقمٌ بالمئة")
        if not (UI_SCALE_MIN <= n <= UI_SCALE_MAX):
            raise serializers.ValidationError(
                f"حجم العرض بين {UI_SCALE_MIN}% و{UI_SCALE_MAX}%"
            )
        return n

    def validate_logo_url(self, value):
        """رابطٌ خارجي أو صورةٌ مرفوعة — وفارغٌ يعني «لا شعار»."""
        v = (value or "").strip()
        if not v:
            return ""
        if v.startswith("data:image/"):
            if len(v) > MAX_LOGO_CHARS:
                raise serializers.ValidationError("الشعار كبير جداً — اختر صورة أصغر")
            return v
        if not v.startswith(_SAFE_SCHEMES):
            raise serializers.ValidationError(
                "رابط الشعار يبدأ بـ http:// أو https:// — أو ارفع صورة"
            )
        return v

    def validate_social_links(self, value):
        """
        قاموسٌ من `SOCIAL_KEYS` إلى رابط. الفارغ يُحذف لا يُخزَّن فارغاً،
        كي تعرف الواجهة «غير مضبوط» من «مضبوطٌ إلى لا شيء».

        واتساب يُقبل رقماً (`+9055…`) فيُبنى منه `wa.me` — إذ يكتب صاحب
        المتجر رقمه لا رابطاً، وكان يخرج زرٌّ لا يفتح شيئاً.
        """
        if not isinstance(value, dict):
            raise serializers.ValidationError("روابط التواصل يجب أن تكون قاموساً")

        out = {}
        for key, raw in value.items():
            if key not in SOCIAL_KEYS:
                raise serializers.ValidationError(f"منصّة غير معروفة: {key}")
            v = str(raw or "").strip()
            if not v:
                continue
            if key == "whatsapp" and not v.startswith(_SAFE_SCHEMES):
                digits = v.replace(" ", "").replace("-", "").lstrip("+")
                if not digits.isdigit():
                    raise serializers.ValidationError(
                        "واتساب: اكتب الرقم برمز الدولة (+905551234567) أو رابطاً كاملاً"
                    )
                v = f"https://wa.me/{digits}"
            if not v.startswith(_SAFE_SCHEMES):
                raise serializers.ValidationError(
                    f"رابط {key}: يبدأ بـ http:// أو https://"
                )
            if len(v) > 300:
                raise serializers.ValidationError(f"رابط {key} طويل جداً")
            out[key] = v
        return out


class SmsSettingsSerializer(serializers.ModelSerializer):
    """إعدادات SMS (Sms Servisleri)."""

    class Meta:
        model = Tenant
        fields = ["sms_provider", "sms_api_key", "sms_sender", "sms_enabled"]


class WalletSerializer(serializers.ModelSerializer):
    available = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)

    class Meta:
        model = Wallet
        fields = ["balance", "credit_limit", "currency", "available"]


class UserSerializer(serializers.ModelSerializer):
    tenant = TenantSerializer(read_only=True)
    wallet = WalletSerializer(read_only=True)
    role_label = serializers.CharField(source="get_role_display", read_only=True)

    class Meta:
        model = User
        fields = [
            "id", "login_id", "name", "phone", "role", "role_label",
            "status", "country", "tenant", "wallet", "modules",
        ]


class LoginSerializer(serializers.Serializer):
    # رقم الدخول يُنقّى بنفس دالّة الحفظ — وإلّا افترق المكتوب عن المحفوظ.
    # مسافةٌ أو محرفُ عزلٍ من نسخٍ ولصق كان يُفشل الدخول برسالة «بيانات غير
    # صحيحة» المبهمة، ولا شيء على الشاشة يفسّرها.
    login_id = serializers.CharField()

    def validate_login_id(self, value):
        return clean_login_id(value)
    # أمّا كلمة السر فلا تُشذَّب — مسافتها قد تكون منها.
    password = serializers.CharField(write_only=True, trim_whitespace=False)
    totp = serializers.CharField(required=False, allow_blank=True)
