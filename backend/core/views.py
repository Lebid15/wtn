"""API views للقلب: تسجيل الدخول (JWT + 2FA)، المستخدم، الوكلاء، المحفظة."""
from decimal import Decimal, InvalidOperation

import pyotp
from rest_framework import status, viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

from . import currency, services
from .models import Invoice, User, Wallet, WalletTransaction
from .serializers import (
    LoginSerializer, SiteSettingsSerializer, SmsSettingsSerializer, UserSerializer,
)


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
def exchange_rates_view(request):
    """
    سعر الصرف العام للمتجر: عملة الأساس + كم وحدةً منها تساوي وحدةً
    من كل عملة أخرى. تعتمد عليه طرق الدفع في حساب المبلغ المُضاف للمحفظة.
    """
    tenant = request.user.tenant
    if tenant is None:
        return Response({"detail": "لا يوجد مستأجر"}, status=400)

    if request.method == "PUT":
        if request.user.role != User.Role.TENANT_ADMIN:
            return Response({"detail": "غير مصرّح"}, status=403)
        base = str(request.data.get("base_currency") or tenant.base_currency or "TRY")
        rates = request.data.get("exchange_rates")
        if isinstance(rates, dict):
            clean = {}
            for cur, val in rates.items():
                try:
                    d = Decimal(str(val))
                except (InvalidOperation, TypeError):
                    return Response({"detail": f"سعر صرف غير صحيح للعملة {cur}"}, status=400)
                if d <= 0:
                    return Response({"detail": f"سعر صرف {cur} يجب أن يكون أكبر من صفر"}, status=400)
                clean[cur] = str(d)
            clean.pop(base, None)  # عملة الأساس لا سعر صرف لها
            tenant.exchange_rates = clean
        tenant.base_currency = base
        tenant.save(update_fields=["base_currency", "exchange_rates"])

    return Response({
        "base_currency": tenant.base_currency or "TRY",
        "exchange_rates": tenant.exchange_rates or {},
    })


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


def _create_dealer(request):
    """إنشاء وكيل (Bayi) جديد تحت المستأجر الحالي — يقابل زر "Bayi Ekle"."""
    tenant = request.user.tenant
    if tenant is None:
        return Response({"detail": "لا يوجد مستأجر"}, status=400)

    data = request.data
    login_id = (data.get("login_id") or "").strip()
    name = (data.get("name") or "").strip()
    password = data.get("password") or ""
    if not login_id or not name or not password:
        return Response(
            {"detail": "الاسم ورقم الدخول وكلمة السر مطلوبة"}, status=400
        )
    if User.objects.filter(login_id=login_id).exists():
        return Response({"detail": "رقم الدخول مستخدم مسبقاً"}, status=400)

    try:
        credit_limit = Decimal(str(data.get("credit_limit") or "0"))
    except (InvalidOperation, TypeError):
        return Response({"detail": "الحد الائتماني غير صحيح"}, status=400)

    country = (data.get("country") or "SY").strip()[:2] or "SY"
    group = (data.get("group") or "").strip()

    from django.db import transaction as db_transaction

    with db_transaction.atomic():
        u = User(
            tenant=tenant,
            role=User.Role.BAYI,
            login_id=login_id,
            name=name,
            country=country,
            status=User.Status.ACTIVE,
            modules={"oyun": True, "shopping": True, "group": group},
        )
        u.set_password(password)
        u.save()
        Wallet.objects.create(
            tenant=tenant, user=u, balance=Decimal("0"), credit_limit=credit_limit
        )

    return Response(
        {"id": u.id, "login_id": u.login_id, "name": u.name},
        status=status.HTTP_201_CREATED,
    )


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def dealers_view(request):
    """قائمة الوكلاء (Bayi Listesi) للمستأجر الحالي + إنشاء وكيل جديد (Bayi Ekle)."""
    if request.method == "POST":
        return _create_dealer(request)
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
        mods = u.modules or {}
        rows.append({
            "id": u.id,
            "login_id": u.login_id,
            "name": u.name,
            "balance": str(wallet.balance) if wallet else "0.00",
            "credit_limit": str(wallet.credit_limit) if wallet else "0.00",
            "currency": wallet.currency if wallet else "TRY",
            # عملة عرض الوكيل — فارغة تعني عملة الموقع
            "display_currency": u.display_currency or "",
            "status": u.status,
            "country": u.country,
            "group": mods.get("group", ""),
            "shopping": mods.get("shopping", True),   # Alışveriş
            "oyun": mods.get("oyun", True),           # لعبة OyunPin
            "active": u.status == User.Status.ACTIVE,  # Aktif
            "children_count": u.children.count(),
        })
    return Response({"count": len(rows), "results": rows})


def _get_dealer_wallet(request, dealer_id):
    """يجلب محفظة وكيل ضمن نفس المستأجر (عزل)."""
    return Wallet.objects.select_related("user").get(
        user_id=dealer_id, tenant=request.user.tenant
    )


# أقصى حجم لصورة محفوظة كـ data URL — الصور تُصغَّر في المتصفّح قبل الإرسال
MAX_IMAGE_CHARS = 3_000_000  # ≈ 2.2 ميغابايت بعد ترميز base64


def _dealer_settings_row(u):
    wallet = getattr(u, "wallet", None)
    tenant = u.tenant
    return {
        "id": u.id,
        "login_id": u.login_id,
        "name": u.name,
        "role": u.role,
        "role_label": u.get_role_display(),
        # التبويب الأول
        "display_currency": u.display_currency or "",
        "credit_limit": str(wallet.credit_limit) if wallet else "0.00",
        "balance": str(wallet.balance) if wallet else "0.00",
        "status": u.status,
        # التبويب الثاني
        "phone": u.phone,
        "country": u.country,
        "province": u.province,
        "id_image": u.id_image,
        "shop_image": u.shop_image,
        "auto_debt_collection": u.auto_debt_collection,
        # مرجع العملات
        "base_currency": currency.base_currency(tenant),
        "available_currencies": sorted(
            c for c, v in (tenant.exchange_rates or {}).items() if str(v).strip()
        ),
    }


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def dealer_settings_view(request, dealer_id):
    """
    إعدادات وكيل واحد من «قائمة الوكلاء» — نافذة بتبويبين:
    الحساب (العملة · الحد الائتماني · كلمة السر · الحالة) وبيانات الوكيل
    (الجوال · البلد والمحافظة · الوثائق · موافقة التحصيل الآلي).
    """
    if request.user.role != User.Role.TENANT_ADMIN:
        return Response({"detail": "غير مصرّح"}, status=403)
    try:
        u = User.objects.select_related("wallet", "tenant").get(
            pk=dealer_id, tenant=request.user.tenant,
            role__in=[User.Role.BAYI, User.Role.ANA_BAYI],
        )
    except User.DoesNotExist:
        return Response({"detail": "الوكيل غير موجود"}, status=404)

    if request.method == "GET":
        return Response(_dealer_settings_row(u))

    data = request.data
    tenant = request.user.tenant
    fields = []

    if "display_currency" in data:
        cur = str(data["display_currency"] or "")
        if cur and cur != currency.base_currency(tenant) and not currency.rate_of(tenant, cur):
            return Response(
                {"detail": f"لا سعر صرف مضبوط للعملة {cur} — اضبطه في «أسعار الصرف» أولاً"},
                status=400,
            )
        u.display_currency = "" if cur == currency.base_currency(tenant) else cur
        fields.append("display_currency")

    if "status" in data:
        if data["status"] not in User.Status.values:
            return Response({"detail": "حالة غير معروفة"}, status=400)
        u.status = data["status"]
        fields.append("status")

    for key in ("phone", "province", "country"):
        if key in data:
            setattr(u, key, str(data[key] or "").strip()[:80])
            fields.append(key)

    for key in ("id_image", "shop_image"):
        if key in data:
            img = str(data[key] or "")
            if len(img) > MAX_IMAGE_CHARS:
                return Response({"detail": "الصورة كبيرة جداً — اختر صورة أصغر"}, status=400)
            if img and not img.startswith("data:image/"):
                return Response({"detail": "الملف المرفوع ليس صورة"}, status=400)
            setattr(u, key, img)
            fields.append(key)

    if "auto_debt_collection" in data:
        u.auto_debt_collection = bool(data["auto_debt_collection"])
        fields.append("auto_debt_collection")

    new_password = str(data.get("new_password") or "")
    if new_password:
        if len(new_password) < 5:
            return Response({"detail": "كلمة السر قصيرة (5 أحرف على الأقل)"}, status=400)
        u.set_password(new_password)
        fields.append("password")

    if fields:
        u.save(update_fields=fields)

    # الحد الائتماني على المحفظة لا على المستخدم
    if "credit_limit" in data:
        wallet = getattr(u, "wallet", None)
        if wallet is None:
            return Response({"detail": "لا توجد محفظة لهذا الوكيل"}, status=400)
        try:
            limit = Decimal(str(data["credit_limit"]))
        except (InvalidOperation, TypeError):
            return Response({"detail": "حد ائتماني غير صحيح"}, status=400)
        if limit > 0:
            return Response(
                {"detail": "الحد الائتماني أقصى دَين مسموح — اكتبه صفراً أو رقماً سالباً"},
                status=400,
            )
        wallet.credit_limit = limit
        wallet.save(update_fields=["credit_limit"])

    u.refresh_from_db()
    return Response(_dealer_settings_row(u))


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


def _invoice_row(inv):
    return {
        "id": inv.id,
        "tenant_name": inv.tenant.name,
        "plan": inv.plan,
        "plan_label": "سنوي" if inv.plan == "yearly" else "شهري",
        "amount": str(inv.amount),
        "period_start": inv.period_start.strftime("%Y-%m-%d"),
        "period_end": inv.period_end.strftime("%Y-%m-%d"),
        "status": inv.status,
        "status_label": inv.get_status_display(),
        "created_at": inv.created_at.strftime("%Y-%m-%d"),
    }


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def my_invoices_view(request):
    """فواتير اشتراك المستأجر الحالي (يراها صاحب المتجر)."""
    if request.user.tenant_id is None:
        return Response({"count": 0, "results": []})
    qs = Invoice.objects.filter(tenant=request.user.tenant).select_related("tenant")
    return Response({"count": qs.count(), "results": [_invoice_row(i) for i in qs]})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def announcement_view(request):
    """إعلان المنصّة الحالي — يظهر فوق هيدر لوحات أصحاب المتاجر."""
    from .models import PlatformAnnouncement
    a = PlatformAnnouncement.get()
    return Response({"message": a.message, "ticker": a.ticker})


@api_view(["GET", "PUT"])
@permission_classes([IsAuthenticated])
def theme_config_view(request):
    """تخصيص مظهر المتجر: أي مستخدم بالمستأجر يقرأه؛ صاحب المتجر فقط يعدّله."""
    tenant = request.user.tenant
    if tenant is None:
        return Response({"config": {}})
    if request.method == "PUT":
        if request.user.role != User.Role.TENANT_ADMIN:
            return Response({"detail": "التخصيص لصاحب المتجر فقط"}, status=403)
        cfg = request.data.get("config")
        if not isinstance(cfg, dict) or len(str(cfg)) > 4000:
            return Response({"detail": "إعدادات غير صالحة"}, status=400)
        tenant.theme_config = cfg
        tenant.save(update_fields=["theme_config"])
    return Response({"config": tenant.theme_config or {}})
