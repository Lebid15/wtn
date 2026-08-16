"""
مصادقة الواجهة الخارجية: ترويسة `api-token` وحدها — لا اسم مستخدم ولا كلمة سر.

نفس ما تفعله ZDK، عمداً: كود المتاجر الخارجية مكتوب لهذه الترويسة أصلاً، فربطه
بنا تبديلُ رابطٍ لا إعادةُ كتابة.

**لا نرفع `AuthenticationFailed`** لأن DRF عندها يردّ بشكله هو (`{"detail": …}`)،
وعميلٌ مكتوبٌ لـ ZDK لا يفهمه. فنسجّل سبب الرفض على الطلب ويتولّى `_api` في
`views.py` إخراجه بجسم الخطأ المتّفق عليه (`code` + `message`).
"""
from datetime import timedelta

from django.db.models import F
from django.utils import timezone
from rest_framework import authentication

from core.models import Tenant, User

from . import errors
from .models import ApiToken

# دقيقة بين كتابتَي «آخر استعمال» — الرقم للاطمئنان لا للمحاسبة، ولا يستحقّ
# كتابةً في القاعدة مع كل نداء.
TOUCH_EVERY = timedelta(minutes=1)


class ApiTokenAuthentication(authentication.BaseAuthentication):

    def authenticate(self, request):
        raw = (request.headers.get("api-token") or "").strip()
        if not raw:
            request.api_auth_error = errors.TOKEN_REQUIRED
            return None

        row = (
            ApiToken.objects.select_related("user__tenant", "user__wallet")
            .filter(token=raw).first()
        )
        if row is None:
            request.api_auth_error = errors.TOKEN_INVALID
            return None

        user = row.user
        # متجر موقوف ⇒ لا شراء عبر الواجهة أيضاً، وإلّا كان الـ API باباً خلفياً.
        # التجريبي يعمل — هو متجر قائم لم يشترك بعد، لا متجر معاقَب.
        if user.status != User.Status.ACTIVE or user.tenant is None or (
            user.tenant.status == Tenant.Status.SUSPENDED
        ):
            request.api_auth_error = errors.ACCOUNT_DISABLED
            return None

        # الإذن يُفحص عند **كل نداء** لا عند التوليد: سحبُه من صاحب المتجر يجب
        # أن يوقف ربطاً قائماً فوراً، لا أن ينتظر توليد توكن جديد لن يقع أبداً.
        if not user.api_access_allowed:
            request.api_auth_error = errors.API_NOT_ENABLED
            return None

        # عنوان متجرٍ بعينه يخدم أهله وحدهم — وإلّا كانت العناوين الفرعية
        # باباً خلفياً يلتفّ على عزل المتاجر. و`api.wtn4.com` والنطاق العام
        # يخدمان الجميع كما كانا، فلا ينقطع عميلٌ مربوطٌ اليوم.
        store = getattr(request, "store", None)
        if store is not None and user.tenant_id != store.id:
            request.api_auth_error = errors.WRONG_STORE_HOST
            return None

        # F() لا `row.calls + 1`: النداءات متوازية، والقراءة‑ثم‑الكتابة تضيّع العدّ
        now = timezone.now()
        fields = {"calls": F("calls") + 1}
        if row.last_used_at is None or now - row.last_used_at >= TOUCH_EVERY:
            fields["last_used_at"] = now
        ApiToken.objects.filter(pk=row.pk).update(**fields)

        request.api_token = row
        return (user, row)

    def authenticate_header(self, request):
        """بدونها يردّ DRF بـ 403 بدل 401 على غياب الاعتماد."""
        return "api-token"
