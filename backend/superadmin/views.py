"""API لوحة المنصّة (SuperAdmin): إدارة المستأجرين + المكتبة العالمية — لمالك المنصّة فقط."""
from decimal import Decimal

from django.db import transaction
from rest_framework import status as http, viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import BasePermission, IsAuthenticated
from rest_framework.response import Response

from catalog.models import LibraryGame, LibraryProduct
from catalog.serializers import (
    LibraryGameDetailSerializer, LibraryGameSerializer, LibraryProductSerializer,
)
from core.models import Invoice, Tenant, User, Wallet
from core.views import _invoice_row


class IsPlatformOwner(BasePermission):
    """يسمح فقط لمالك المنصّة."""
    message = "هذه اللوحة مخصّصة لمالك المنصّة فقط."

    def has_permission(self, request, view):
        return bool(request.user and request.user.role == User.Role.PLATFORM_OWNER)


class LibraryGameViewSet(viewsets.ModelViewSet):
    """CRUD ألعاب المكتبة العالمية — لمالك المنصّة فقط."""
    permission_classes = [IsAuthenticated, IsPlatformOwner]
    queryset = LibraryGame.objects.all()

    def get_serializer_class(self):
        return LibraryGameDetailSerializer if self.action == "retrieve" else LibraryGameSerializer


class LibraryProductViewSet(viewsets.ModelViewSet):
    """CRUD باقات المكتبة العالمية — لمالك المنصّة فقط."""
    permission_classes = [IsAuthenticated, IsPlatformOwner]
    serializer_class = LibraryProductSerializer

    def get_queryset(self):
        qs = LibraryProduct.objects.all()
        game = self.request.query_params.get("game")
        return qs.filter(game_id=game) if game else qs


def _tenant_row(t):
    from django.utils import timezone
    dealers = User.objects.filter(tenant=t, role=User.Role.BAYI).count()
    today = timezone.now().date()
    days_left = (t.sub_expires_at - today).days if t.sub_expires_at else None
    return {
        "id": t.id,
        "name": t.name,
        "subdomain": t.subdomain,
        "status": t.status,
        "theme": t.theme,
        "dealers": dealers,
        "created_at": t.created_at.strftime("%Y-%m-%d"),
        "sub_plan": t.sub_plan,
        "sub_plan_label": t.get_sub_plan_display(),
        "sub_monthly_price": str(t.sub_monthly_price),
        "sub_yearly_price": str(t.sub_yearly_price),
        "sub_expires_at": t.sub_expires_at.strftime("%Y-%m-%d") if t.sub_expires_at else None,
        "sub_active": bool(t.sub_expires_at and t.sub_expires_at >= today),
        "sub_days_left": days_left,
    }


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated, IsPlatformOwner])
def tenants_view(request):
    if request.method == "POST":
        data = request.data
        subdomain = (data.get("subdomain") or "").strip().lower()
        if not subdomain or not data.get("name"):
            return Response({"detail": "الاسم والنطاق الفرعي مطلوبان"}, status=400)
        if Tenant.objects.filter(subdomain=subdomain).exists():
            return Response({"detail": "النطاق الفرعي مستخدم مسبقاً"}, status=400)
        admin_login = (data.get("admin_login_id") or "").strip()
        if not admin_login or not data.get("admin_password"):
            return Response({"detail": "بيانات أدمن المستأجر مطلوبة"}, status=400)
        if User.objects.filter(login_id=admin_login).exists():
            return Response({"detail": "رقم دخول الأدمن مستخدم مسبقاً"}, status=400)

        with transaction.atomic():
            tenant = Tenant.objects.create(
                name=data["name"], subdomain=subdomain,
                status=Tenant.Status.ACTIVE, theme=data.get("theme", "teal"),
            )
            admin = User(
                tenant=tenant, role=User.Role.TENANT_ADMIN,
                login_id=admin_login, name=data.get("admin_name", "مدير المستأجر"),
                status=User.Status.ACTIVE, is_staff=True,
            )
            admin.set_password(data["admin_password"])
            admin.save()
            Wallet.objects.create(tenant=tenant, user=admin, balance=Decimal("0"))
        return Response(_tenant_row(tenant), status=http.HTTP_201_CREATED)

    tenants = Tenant.objects.all().order_by("-created_at")
    return Response({
        "count": tenants.count(),
        "results": [_tenant_row(t) for t in tenants],
        "stats": {
            "tenants": tenants.count(),
            "active": tenants.filter(status=Tenant.Status.ACTIVE).count(),
            "dealers": User.objects.filter(role=User.Role.BAYI).count(),
        },
    })


@api_view(["POST"])
@permission_classes([IsAuthenticated, IsPlatformOwner])
def tenant_status_view(request, tenant_id, action):
    """تعليق/تفعيل مستأجر."""
    if action not in ("suspend", "activate"):
        return Response({"detail": "إجراء غير معروف"}, status=400)
    try:
        t = Tenant.objects.get(pk=tenant_id)
    except Tenant.DoesNotExist:
        return Response({"detail": "المستأجر غير موجود"}, status=404)
    t.status = Tenant.Status.SUSPENDED if action == "suspend" else Tenant.Status.ACTIVE
    t.save(update_fields=["status"])
    return Response(_tenant_row(t))


@api_view(["POST"])
@permission_classes([IsAuthenticated, IsPlatformOwner])
def tenant_subscription_view(request, tenant_id):
    """اشتراك المستأجر: ضبط الأسعار (شهري/سنوي) وتفعيل/إلغاء خطة — لمالك المنصّة."""
    from datetime import timedelta
    from django.utils import timezone

    try:
        t = Tenant.objects.get(pk=tenant_id)
    except Tenant.DoesNotExist:
        return Response({"detail": "المستأجر غير موجود"}, status=404)

    op = request.data.get("op", "prices")

    if op == "prices":
        try:
            t.sub_monthly_price = Decimal(str(request.data.get("monthly_price", t.sub_monthly_price)))
            t.sub_yearly_price = Decimal(str(request.data.get("yearly_price", t.sub_yearly_price)))
        except Exception:
            return Response({"detail": "أسعار غير صحيحة"}, status=400)
        t.save(update_fields=["sub_monthly_price", "sub_yearly_price"])

    elif op == "activate":
        plan = request.data.get("plan")
        if plan not in (Tenant.SubPlan.MONTHLY, Tenant.SubPlan.YEARLY):
            return Response({"detail": "خطة غير معروفة"}, status=400)
        today = timezone.now().date()
        # التمديد من نهاية الاشتراك الحالي إن كان ساري المفعول، وإلا من اليوم
        base = t.sub_expires_at if (t.sub_expires_at and t.sub_expires_at >= today) else today
        days = 30 if plan == Tenant.SubPlan.MONTHLY else 365
        t.sub_plan = plan
        t.sub_started_at = today
        t.sub_expires_at = base + timedelta(days=days)
        t.save(update_fields=["sub_plan", "sub_started_at", "sub_expires_at"])
        # فاتورة اشتراك عن الفترة المُضافة
        amount = t.sub_monthly_price if plan == Tenant.SubPlan.MONTHLY else t.sub_yearly_price
        Invoice.objects.create(
            tenant=t, plan=plan, amount=amount,
            period_start=base, period_end=t.sub_expires_at,
        )

    elif op == "cancel":
        t.sub_plan = Tenant.SubPlan.NONE
        t.sub_started_at = None
        t.sub_expires_at = None
        t.save(update_fields=["sub_plan", "sub_started_at", "sub_expires_at"])

    else:
        return Response({"detail": "عملية غير معروفة"}, status=400)

    return Response(_tenant_row(t))


@api_view(["GET"])
@permission_classes([IsAuthenticated, IsPlatformOwner])
def invoices_view(request):
    """كل فواتير الاشتراكات — لمالك المنصّة، مع فلتر حالة."""
    qs = Invoice.objects.select_related("tenant").all()
    st = request.query_params.get("status")
    if st in ("paid", "unpaid"):
        qs = qs.filter(status=st)
    rows = [_invoice_row(i) for i in qs]
    totals = {
        "count": len(rows),
        "unpaid": sum(1 for i in qs if i.status == Invoice.Status.UNPAID),
        "total_amount": str(sum((i.amount for i in qs), Decimal("0"))),
    }
    return Response({"results": rows, "totals": totals})


@api_view(["POST"])
@permission_classes([IsAuthenticated, IsPlatformOwner])
def invoice_status_view(request, invoice_id, action):
    """تعليم فاتورة مدفوعة/غير مدفوعة."""
    if action not in ("paid", "unpaid"):
        return Response({"detail": "إجراء غير معروف"}, status=400)
    try:
        inv = Invoice.objects.select_related("tenant").get(pk=invoice_id)
    except Invoice.DoesNotExist:
        return Response({"detail": "الفاتورة غير موجودة"}, status=404)
    inv.status = Invoice.Status.PAID if action == "paid" else Invoice.Status.UNPAID
    inv.save(update_fields=["status"])
    return Response(_invoice_row(inv))


@api_view(["GET", "PUT"])
@permission_classes([IsAuthenticated, IsPlatformOwner])
def platform_announcement_view(request):
    """كتابة/تعديل إعلان المنصّة (يظهر لكل أصحاب المتاجر) — لمالك المنصّة."""
    from core.models import PlatformAnnouncement
    a = PlatformAnnouncement.get()
    if request.method == "PUT":
        a.message = (request.data.get("message") or "").strip()
        a.ticker = (request.data.get("ticker") or "").strip()
        a.save(update_fields=["message", "ticker", "updated_at"])
    return Response({"message": a.message, "ticker": a.ticker})
