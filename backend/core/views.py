"""API views للقلب: تسجيل الدخول (JWT + 2FA)، معلومات المستخدم الحالي."""
import pyotp
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

from .models import User
from .serializers import LoginSerializer, UserSerializer


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
