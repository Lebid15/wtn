"""
لكلّ متجرٍ عنوانُه: `islam.wtn4.com`.

الكود قبل هذا الملف كان يعرف المتجر من **الحساب الذي دخل** وحده. وهذا الوسيط
يجعله يعرفه من **الرابط** أيضاً: يقرأ ترويسة `Host` ويضع على كل طلب

    request.store  →  المتجر، أو `None` أي «الباب العام»

ثلاثة عناوين ليست متاجر: النطاق نفسه و`www` و`api` — تبقى الباب العام ولوحة
مالك المنصّة. وما عداها اسمُ متجرٍ يجب أن يقابله صفٌّ في القاعدة.

**ولماذا صفحةٌ خاصّة لعنوانٍ لا متجر له؟** لأن صفحة الدخول العامّة كذبةٌ هنا:
يقرؤها الزائر فيظنّ العنوان صحيحاً وأن حسابه هو الخطأ، فيجرّب حتى يُقفل
حسابه. والصفحة الصريحة تقول له إن العنوان نفسه لا وجود له.
"""
from django.conf import settings
from django.http import HttpResponse, JsonResponse

from .models import Tenant

# ليست متاجر — وإن جاءت على شكل نطاقٍ فرعي
RESERVED_LABELS = {"www", "api", "admin", "static", "assets", "cdn", "mail"}

# مسارات تُجيب بـ JSON لا بصفحة: عملاء وبرامج لا متصفّحات
API_PREFIXES = ("/api/", "/client/api/")


def store_from_host(host: str):
    """
    `(store, known)` — `known=False` تعني عنواناً فرعياً لا متجر له.

    والباب العام يعطي `(None, True)`: لا متجر، ولا خطأ.
    """
    host = (host or "").split(":")[0].strip().lower().rstrip(".")
    domain = settings.PLATFORM_DOMAIN.lower()

    if not host or host == domain:
        return None, True
    if not host.endswith("." + domain):
        # `localhost` · عنوان الخادم الرقمي · `web` داخل شبكة Docker · أي اسمٍ
        # آخر يُوجَّه إلينا. كلّها الباب العام — وإلّا انقطع التطوير المحلّي
        # وانقطعت نبضة البوت التي تنادي `http://web:8000`.
        return None, True

    label = host[: -(len(domain) + 1)]
    if not label or label in RESERVED_LABELS:
        return None, True
    if "." in label:
        # `a.b.wtn4.com` — الشهادة الشاملة لا تغطّي طبقتين أصلاً
        return None, False

    store = Tenant.objects.filter(subdomain=label).first()
    return store, store is not None


class StoreHostMiddleware:
    """يضع `request.store`، ويردّ عن العناوين التي لا تُخدَم."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        store, known = store_from_host(request.get_host())
        request.store = store

        if not known:
            return _refuse(
                request,
                status=404,
                title="لا متجر بهذا العنوان",
                body="العنوان الذي فتحته لا يخصّ أي متجر على المنصّة. "
                     "راجع الرابط الذي أُعطيته، أو ادخل من العنوان العام.",
                code="store_not_found",
            )

        if store is not None and store.status == Tenant.Status.SUSPENDED:
            return _refuse(
                request,
                status=403,
                title="المتجر متوقّف مؤقّتاً",
                body=f"«{store.name}» موقوفٌ بقرارٍ من إدارة المنصّة. "
                     "راجع الإدارة لمعرفة السبب وإعادة التشغيل.",
                code="store_suspended",
            )

        return self.get_response(request)


def _refuse(request, *, status: int, title: str, body: str, code: str):
    """صفحةٌ للمتصفّح وجسمٌ مفهوم لمن ينادي الـ API."""
    if request.path.startswith(API_PREFIXES):
        return JsonResponse({"detail": title, "code": code}, status=status)
    return HttpResponse(_page(title, body), status=status, content_type="text/html; charset=utf-8")


def _page(title: str, body: str) -> str:
    """
    صفحةٌ قائمةٌ بنفسها — بلا ملفّ خارجي واحد.

    عمداً: هي تُعرض على عنوانٍ لا متجر له، فقد لا تُقدَّم أصولُه أصلاً؛ ولأنها
    تُقرأ في أسوأ لحظة، فأسوأ ما يمكن أن يحدث لها أن تظهر بلا شكل.
    """
    return f"""<!doctype html>
<html lang="ar" dir="rtl"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{title}</title>
<style>
  body {{ margin:0; min-height:100vh; display:flex; align-items:center; justify-content:center;
         background:linear-gradient(135deg,#0f766e,#134e4a); color:#0f172a;
         font-family:system-ui,"Segoe UI",Tahoma,sans-serif; }}
  .card {{ background:#fff; max-width:420px; margin:20px; padding:40px 34px; border-radius:12px;
          text-align:center; box-shadow:0 12px 40px rgba(0,0,0,.25); }}
  h1 {{ font-size:21px; margin:0 0 12px; }}
  p  {{ font-size:14px; line-height:1.9; color:#64748b; margin:0; }}
  .mark {{ font-size:44px; margin-bottom:14px; }}
</style></head>
<body><div class="card">
  <div class="mark">🏪</div>
  <h1>{title}</h1>
  <p>{body}</p>
</div></body></html>"""
