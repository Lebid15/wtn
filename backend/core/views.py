"""API views للقلب: تسجيل الدخول (JWT + 2FA)، المستخدم، الوكلاء، المحفظة."""
from decimal import Decimal, InvalidOperation

import pyotp
from rest_framework import status, viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

from . import services
from .models import DealerGroup, User, Wallet, WalletTransaction
from .serializers import (
    DealerGroupSerializer, LoginSerializer, SiteSettingsSerializer,
    SmsSettingsSerializer, UserSerializer,
)


class DealerGroupViewSet(viewsets.ModelViewSet):
    """CRUD مجموعات الوكلاء (Bayi Grupları)."""
    serializer_class = DealerGroupSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return DealerGroup.objects.filter(tenant=self.request.user.tenant)

    def perform_create(self, serializer):
        serializer.save(tenant=self.request.user.tenant)


def _tokens_for(user: User) -> dict:
    refresh = RefreshToken.for_user(user)
    return {"access": str(refresh.access_token), "refresh": str(refresh)}


@api_view(["POST"])
@permission_classes([AllowAny])
def login_view(request):
    """تسجيل الدخول: login_id + كلمة السر (+ رمز 2FA إن كان مفعّلاً)."""
    serializer = LoginSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    data = serializer.validated_data

    try:
        user = User.objects.get(login_id=data["login_id"])
    except User.DoesNotExist:
        return Response(
            {"detail": "بيانات الدخول غير صحيحة"}, status=status.HTTP_401_UNAUTHORIZED
        )

    if not user.check_password(data["password"]):
        user.failed_login_count += 1
        user.save(update_fields=["failed_login_count"])
        return Response(
            {"detail": "بيانات الدخول غير صحيحة"}, status=status.HTTP_401_UNAUTHORIZED
        )

    if user.status != User.Status.ACTIVE:
        return Response({"detail": "الحساب معطّل"}, status=status.HTTP_403_FORBIDDEN)

    # التحقق الثنائي (2FA) — بديل حديث لآلة حاسبة المرجع
    if user.totp_enabled:
        code = data.get("totp", "")
        if not code:
            return Response({"require_totp": True}, status=status.HTTP_200_OK)
        if not pyotp.TOTP(user.totp_secret).verify(code, valid_window=1):
            return Response(
                {"detail": "رمز التحقق غير صحيح"}, status=status.HTTP_401_UNAUTHORIZED
            )

    user.failed_login_count = 0
    user.save(update_fields=["failed_login_count"])

    return Response({"user": UserSerializer(user).data, "tokens": _tokens_for(user)})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def me_view(request):
    """معلومات المستخدم الحالي (للواجهة بعد الدخول)."""
    return Response(UserSerializer(request.user).data)


@api_view(["GET", "PUT"])
@permission_classes([IsAuthenticated])
def site_settings_view(request):
    """قراءة/تحديث إعدادات موقع المستأجر الحالي (Web Site Ayarları)."""
    tenant = request.user.tenant
    if tenant is None:
        return Response({"detail": "لا يوجد مستأجر"}, status=400)

    if request.method == "PUT":
        serializer = SiteSettingsSerializer(tenant, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    return Response(SiteSettingsSerializer(tenant).data)


@api_view(["GET", "PUT"])
@permission_classes([IsAuthenticated])
def sms_settings_view(request):
    """قراءة/تحديث إعدادات SMS للمستأجر الحالي."""
    tenant = request.user.tenant
    if tenant is None:
        return Response({"detail": "لا يوجد مستأجر"}, status=400)
    if request.method == "PUT":
        s = SmsSettingsSerializer(tenant, data=request.data, partial=True)
        s.is_valid(raise_exception=True)
        s.save()
        return Response(s.data)
    return Response(SmsSettingsSerializer(tenant).data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def ledger_view(request):
    """حركات الحسابات (Hesap Hareketleri): كل حركات المحافظ في المستأجر."""
    qs = WalletTransaction.objects.filter(tenant=request.user.tenant).select_related(
        "wallet__user"
    )
    dealer = request.query_params.get("dealer")
    if dealer:
        qs = qs.filter(wallet__user_id=dealer)
    txn_type = request.query_params.get("type")
    if txn_type and txn_type != "all":
        qs = qs.filter(type=txn_type)
    rows = [{
        "id": t.id,
        "dealer_name": t.wallet.user.name,
        "type": t.type,
        "type_label": t.get_type_display(),
        "amount": str(t.amount),
        "balance_before": str(t.balance_before),
        "balance_after": str(t.balance_after),
        "note": t.note,
        "created_at": t.created_at.strftime("%Y-%m-%d %H:%M"),
    } for t in qs[:300]]
    return Response({"count": qs.count(), "results": rows})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def dealers_view(request):
    """قائمة الوكلاء (Bayi Listesi) للمستأجر الحالي — مع فلتر بحث."""
    qs = (
        User.objects.filter(tenant=request.user.tenant, role=User.Role.BAYI)
        .select_related("wallet")
        .order_by("name")
    )
    search = request.query_params.get("q", "").strip()
    if search:
        qs = qs.filter(name__icontains=search)

    rows = []
    for u in qs:
        wallet = getattr(u, "wallet", None)
        rows.append({
            "id": u.id,
            "login_id": u.login_id,
            "name": u.name,
            "balance": str(wallet.balance) if wallet else "0.00",
            "credit_limit": str(wallet.credit_limit) if wallet else "0.00",
            "currency": wallet.currency if wallet else "TRY",
            "status": u.status,
            "group": u.modules.get("group", "") if u.modules else "",
            "oyun": bool(u.modules.get("oyun")) if u.modules else False,
            "children_count": u.children.count(),
        })
    return Response({"count": len(rows), "results": rows})


def _get_dealer_wallet(request, dealer_id):
    """يجلب محفظة وكيل ضمن نفس المستأجر (عزل)."""
    return Wallet.objects.select_related("user").get(
        user_id=dealer_id, tenant=request.user.tenant
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def wallet_operation_view(request, dealer_id, action):
    """شحن/خصم رصيد وكيل (Finans İşlem +/−)."""
    if action not in ("topup", "deduct"):
        return Response({"detail": "عملية غير معروفة"}, status=400)
    try:
        wallet = _get_dealer_wallet(request, dealer_id)
    except Wallet.DoesNotExist:
        return Response({"detail": "الوكيل غير موجود"}, status=404)

    try:
        amount = Decimal(str(request.data.get("amount", "")))
    except (InvalidOperation, TypeError):
        return Response({"detail": "مبلغ غير صحيح"}, status=400)

    note = request.data.get("note", "")
    fn = services.topup if action == "topup" else services.deduct
    try:
        txn = fn(wallet.id, amount, created_by=request.user, note=note)
    except services.WalletError as e:
        return Response({"detail": str(e)}, status=400)

    wallet.refresh_from_db()
    return Response({
        "balance": str(wallet.balance),
        "transaction": {
            "id": txn.id, "type": txn.type, "amount": str(txn.amount),
            "balance_after": str(txn.balance_after),
        },
    })


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def wallet_transactions_view(request, dealer_id):
    """كشف حركات محفظة وكيل (Hesap Hareketleri)."""
    try:
        wallet = _get_dealer_wallet(request, dealer_id)
    except Wallet.DoesNotExist:
        return Response({"detail": "الوكيل غير موجود"}, status=404)

    txns = wallet.transactions.all()[:100]
    return Response({
        "dealer": {"id": wallet.user_id, "name": wallet.user.name,
                   "balance": str(wallet.balance), "currency": wallet.currency},
        "results": [{
            "id": t.id,
            "type": t.type,
            "type_label": t.get_type_display(),
            "amount": str(t.amount),
            "balance_after": str(t.balance_after),
            "note": t.note,
            "created_at": t.created_at.strftime("%Y-%m-%d %H:%M"),
        } for t in txns],
    })
