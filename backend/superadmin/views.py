"""API لوحة المنصّة (SuperAdmin): إدارة المستأجرين — لمالك المنصّة فقط."""
from decimal import Decimal

from django.db import transaction
from rest_framework import status as http
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import BasePermission, IsAuthenticated
from rest_framework.response import Response

from core.models import Tenant, User, Wallet


class IsPlatformOwner(BasePermission):
    """يسمح فقط لمالك المنصّة."""
    message = "هذه اللوحة مخصّصة لمالك المنصّة فقط."

    def has_permission(self, request, view):
        return bool(request.user and request.user.role == User.Role.PLATFORM_OWNER)


def _tenant_row(t):
    dealers = User.objects.filter(tenant=t, role=User.Role.BAYI).count()
    return {
        "id": t.id,
        "name": t.name,
        "subdomain": t.subdomain,
        "status": t.status,
        "theme": t.theme,
        "dealers": dealers,
        "created_at": t.created_at.strftime("%Y-%m-%d"),
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
