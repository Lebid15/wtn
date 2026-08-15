"""
صفحة «API» في لوحة الوكيل: يرى توكنه، وينسخه، ويولّد بديلاً عند التسريب.

**التوليد بيد الوكيل نفسه** — لا خطر في ذلك: التوكن لا يفتح إلا محفظته هو
وطلباته هو، ولا يمسّ وكيلاً آخر. وحدّه الائتماني يبقى سقف الضرر كما هو في
لوحته تماماً. (بخلاف «مأذون بالتوجيه الداخلي» الذي يمسّ محفظة متجرٍ آخر
فوجب أن يضعه صاحب المتجر بيده — انظر plan.md §29.)
"""
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from core.models import User

from .models import ApiToken, generate_token


def _row(token: ApiToken) -> dict:
    return {
        "allowed": True,
        "token": token.token,
        "created_at": token.created_at.strftime("%Y-%m-%d %H:%M"),
        "last_used_at": token.last_used_at.strftime("%Y-%m-%d %H:%M") if token.last_used_at else "",
        "calls": token.calls,
    }


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def my_api_token_view(request):
    """GET يعرض التوكن (ويُنشئه عند أول زيارة) · POST يولّد بديلاً ويُبطل القديم."""
    user = request.user
    if user.role not in (User.Role.BAYI, User.Role.ANA_BAYI):
        return Response({"detail": "هذه الصفحة للوكلاء"}, status=403)

    # غير مأذون ⇒ **لا يُولَّد توكن أصلاً**. و200 لا 403 كي تعرض اللوحة شرحاً
    # هادئاً («راجع المتجر») بدل صفحة خطأ حمراء على أمرٍ ليس عطلاً.
    if not user.api_access_allowed:
        return Response({
            "allowed": False,
            "detail": "الربط الخارجي غير مفعّل لحسابك — اطلب من صاحب المتجر تفعيله.",
        })

    token, _ = ApiToken.objects.get_or_create(user=user)
    if request.method == "POST":
        token.token = generate_token()
        token.calls = 0
        token.last_used_at = None
        token.save(update_fields=["token", "calls", "last_used_at"])
        return Response({**_row(token), "detail": "وُلّد توكن جديد — القديم تعطّل فوراً"})
    return Response(_row(token))
