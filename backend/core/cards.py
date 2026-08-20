"""
بطاقات الصفحة الرئيسية — يكتبها من فوقك، وتراها في لوحتك.

مالك المنصّة يكتب لأصحاب المتاجر، وصاحب المتجر يكتب لوكلائه. القراءة والكتابة
هنا معاً لأنهما وجها قاعدة واحدة: **لا يكتب أحدٌ إلا لمن تحته، ولا يقرأ أحدٌ
إلا ما كُتب له.**
"""
from django.db.models import Q
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import HomeCard, HomeCardRead, Tenant, User

# حقولٌ نصّية تُنسخ كما هي بعد التشذيب والقصّ
TEXT_FIELDS = {
    "title": 120, "body": 4000, "icon": 24,
    "bg_color": 24, "bg_color2": 24, "text_color": 24,
    "link_url": 300, "link_label": 60,
}


def _row(c: HomeCard) -> dict:
    return {
        "id": c.id,
        "audience": c.audience,
        "target_tenant": c.target_tenant_id,
        "title": c.title,
        "body": c.body,
        "icon": c.icon,
        "bg_color": c.bg_color,
        "bg_color2": c.bg_color2,
        "text_color": c.text_color,
        "link_url": c.link_url,
        "link_label": c.link_label,
        "sort_order": c.sort_order,
        "active": c.active,
    }


def _audience_for_writer(user) -> str | None:
    """من يكتب لمن. مالك المنصّة ⇒ أصحاب المتاجر · صاحب المتجر ⇒ وكلاؤه."""
    if user.role == User.Role.PLATFORM_OWNER:
        return HomeCard.Audience.TENANTS
    if user.role == User.Role.TENANT_ADMIN:
        return HomeCard.Audience.DEALERS
    return None


def _apply(card: HomeCard, data: dict) -> None:
    for field, limit in TEXT_FIELDS.items():
        if field in data:
            setattr(card, field, str(data[field] or "").strip()[:limit])
    if "sort_order" in data:
        try:
            card.sort_order = max(0, int(data["sort_order"]))
        except (TypeError, ValueError):
            pass
    if "active" in data:
        card.active = bool(data["active"])
    # لونٌ فارغ يكسر العرض — نرتدّ إلى الافتراضي بدل حفظ الفراغ
    card.bg_color = card.bg_color or "#0f766e"
    card.text_color = card.text_color or "#ffffff"


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def cards_view(request):
    """بطاقاتي التي أكتبها لمن تحتي: عرضٌ وإنشاء."""
    audience = _audience_for_writer(request.user)
    if audience is None:
        return Response({"detail": "غير مصرّح"}, status=403)

    owner = None if request.user.role == User.Role.PLATFORM_OWNER else request.user.tenant
    qs = HomeCard.objects.filter(audience=audience, tenant=owner)

    if request.method == "POST":
        data = request.data
        if not str(data.get("title") or "").strip():
            return Response({"detail": "عنوان البطاقة مطلوب"}, status=400)
        card = HomeCard(audience=audience, tenant=owner)
        _apply(card, data)
        # إعلانٌ خاصّ بمتجر بعينه — لمالك المنصّة وحده
        if audience == HomeCard.Audience.TENANTS and data.get("target_tenant"):
            card.target_tenant = Tenant.objects.filter(pk=data["target_tenant"]).first()
        if not data.get("sort_order"):
            last = qs.order_by("-sort_order").first()
            card.sort_order = (last.sort_order + 1) if last else 0
        card.save()
        return Response(_row(card), status=201)

    return Response({"results": [_row(c) for c in qs]})


@api_view(["PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def card_detail_view(request, card_id):
    """تعديل بطاقة أو حذفها — ولا يمسّ أحدٌ بطاقة غيره."""
    audience = _audience_for_writer(request.user)
    if audience is None:
        return Response({"detail": "غير مصرّح"}, status=403)

    owner = None if request.user.role == User.Role.PLATFORM_OWNER else request.user.tenant
    card = HomeCard.objects.filter(pk=card_id, audience=audience, tenant=owner).first()
    if card is None:
        return Response({"detail": "البطاقة غير موجودة"}, status=404)

    if request.method == "DELETE":
        card.delete()
        return Response(status=204)

    _apply(card, request.data)
    if audience == HomeCard.Audience.TENANTS and "target_tenant" in request.data:
        tid = request.data.get("target_tenant")
        card.target_tenant = Tenant.objects.filter(pk=tid).first() if tid else None
    card.save()
    return Response(_row(card))


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def my_cards_view(request):
    """البطاقات التي تخصّني أنا — تقرأها صفحتي الرئيسية."""
    return Response({"results": [_row(c) for c in cards_for(request.user)]})


def cards_for(user):
    """البطاقات التي تخصّ هذا المستخدم — مصدرٌ واحد للصفحة الرئيسية وللجرس."""
    if user.role == User.Role.TENANT_ADMIN:
        # من مالك المنصّة: العامّة + الموجّهة إلى متجري وحده
        return HomeCard.objects.filter(
            audience=HomeCard.Audience.TENANTS, tenant__isnull=True, active=True,
        ).filter(Q(target_tenant__isnull=True) | Q(target_tenant_id=user.tenant_id))
    if user.role in (User.Role.BAYI, User.Role.ANA_BAYI):
        return HomeCard.objects.filter(
            audience=HomeCard.Audience.DEALERS, tenant=user.tenant, active=True,
        )
    return HomeCard.objects.none()


def unseen_cards(user):
    """ما لم يفتحه بعد. البطاقةُ تُقرأ مرّةً، ثم لا يُشعِل تحريرُها الجرسَ ثانية."""
    seen = HomeCardRead.objects.filter(user=user).values_list("card_id", flat=True)
    return cards_for(user).exclude(pk__in=seen)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def mark_cards_seen_view(request):
    """
    «رأيتُها» — يُنادى حين يفتح المستخدم الجرس أو صفحته الرئيسية.

    `bulk_create(ignore_conflicts=True)` لا حلقةُ `get_or_create`: النداء
    يتكرّر مع كل فتحة، وقيدُ التفرّد يكفي حارساً.
    """
    cards = list(unseen_cards(request.user).values_list("id", flat=True))
    if cards:
        HomeCardRead.objects.bulk_create(
            [HomeCardRead(card_id=c, user=request.user) for c in cards],
            ignore_conflicts=True,
        )
    return Response({"marked": len(cards)})
