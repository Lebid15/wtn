"""API للطلبات (Takip): قائمة + إنشاء + تنفيذ + إلغاء + تقارير."""
from django.db.models import Count, Sum
from rest_framework import status as http
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from core.models import User
from catalog.models import Product
from providers.models import Provider
from . import services
from .models import Order
from .serializers import OrderSerializer


def _filtered_orders(request):
    """طلبات المستأجر بعد تطبيق فلاتر التقرير (وكيل/لعبة/منتج/تاريخ/حالة)."""
    qs = Order.objects.filter(tenant=request.user.tenant)
    p = request.query_params
    if p.get("dealer"):
        qs = qs.filter(dealer_id=p["dealer"])
    if p.get("game"):
        qs = qs.filter(game_id=p["game"])
    if p.get("product"):
        qs = qs.filter(product_id=p["product"])
    if p.get("date_from"):
        qs = qs.filter(created_at__date__gte=p["date_from"])
    if p.get("date_to"):
        qs = qs.filter(created_at__date__lte=p["date_to"])
    # التقارير تحسب الطلبات الناجحة فقط افتراضياً (Olumsuz işlemler dahil edilmez)
    status = p.get("status", "success")
    if status and status != "all":
        qs = qs.filter(status=status)
    return qs


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def report_summary_view(request):
    """تقرير مجمّع حسب اللعبة (Oyun Pin Toplam Raporu)."""
    qs = _filtered_orders(request)
    rows = (
        qs.values("game__name")
        .annotate(count=Count("id"), cost=Sum("cost_price"),
                  sell=Sum("sell_price"), profit=Sum("profit"))
        .order_by("-count")
    )
    results = [{
        "game": r["game__name"],
        "count": r["count"],
        "cost": str(r["cost"] or 0),
        "sell": str(r["sell"] or 0),
        "profit": str(r["profit"] or 0),
    } for r in rows]
    totals = qs.aggregate(count=Count("id"), cost=Sum("cost_price"),
                          sell=Sum("sell_price"), profit=Sum("profit"))
    return Response({
        "results": results,
        "totals": {k: str(v or 0) for k, v in totals.items()},
    })


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def orders_view(request):
    tenant = request.user.tenant

    if request.method == "POST":
        # إنشاء طلب: dealer + product (+ player_id/customer_phone)
        try:
            dealer = User.objects.get(pk=request.data.get("dealer"), tenant=tenant)
            product = Product.objects.select_related("game").get(
                pk=request.data.get("product"), tenant=tenant
            )
        except (User.DoesNotExist, Product.DoesNotExist):
            return Response({"detail": "الوكيل أو المنتج غير موجود"}, status=404)
        try:
            order = services.create_order(
                dealer, product,
                player_id=request.data.get("player_id", ""),
                customer_phone=request.data.get("customer_phone", ""),
            )
        except services.OrderError as e:
            return Response({"detail": str(e)}, status=http.HTTP_400_BAD_REQUEST)
        return Response(OrderSerializer(order).data, status=http.HTTP_201_CREATED)

    # GET: قائمة + فلاتر
    qs = Order.objects.filter(tenant=tenant).select_related(
        "dealer", "game", "product", "provider"
    )
    status_filter = request.query_params.get("status")
    if status_filter and status_filter != "all":
        qs = qs.filter(status=status_filter)
    search = request.query_params.get("q", "").strip()
    if search:
        qs = qs.filter(receipt_no__icontains=search)

    return Response({
        "count": qs.count(),
        "results": OrderSerializer(qs[:200], many=True).data,
    })


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def report_dealers_view(request):
    """تقرير مجمّع حسب الوكيل (كشف الوكلاء / تقرير الأرباح)."""
    qs = _filtered_orders(request)
    rows = (
        qs.values("dealer__name")
        .annotate(count=Count("id"), sell=Sum("sell_price"), profit=Sum("profit"))
        .order_by("-profit")
    )
    results = [{
        "dealer": r["dealer__name"],
        "count": r["count"],
        "sell": str(r["sell"] or 0),
        "profit": str(r["profit"] or 0),
    } for r in rows]
    totals = qs.aggregate(count=Count("id"), sell=Sum("sell_price"), profit=Sum("profit"))
    return Response({
        "results": results,
        "totals": {k: str(v or 0) for k, v in totals.items()},
    })


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def store_catalog_view(request):
    """كتالوج المتجر: الألعاب النشطة ومنتجاتها بسعر المشتري (سعر مجموعته)."""
    from catalog.models import Game

    user = request.user
    games = Game.objects.filter(
        tenant=user.tenant, status=Game.Status.ACTIVE
    ).prefetch_related("products").order_by("sort_order")
    result = []
    for g in games:
        products = []
        for p in g.products.filter(status=Product.Status.ACTIVE):
            products.append({
                "id": p.id,
                "name": p.name,
                "price": str(services.resolve_sell_price(user, p)),
                "require_player_id": g.require_player_id,
            })
        if products:
            result.append({
                "id": g.id, "name": g.name, "image_url": g.image_url,
                "require_player_id": g.require_player_id, "products": products,
            })
    return Response({"games": result})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def store_buy_view(request):
    """شراء من المتجر: ينشئ طلباً للمستخدم الحالي (يخصم محفظته)."""
    try:
        product = Product.objects.select_related("game").get(
            pk=request.data.get("product"), tenant=request.user.tenant
        )
    except Product.DoesNotExist:
        return Response({"detail": "المنتج غير موجود"}, status=404)
    try:
        order = services.create_order(
            request.user, product,
            player_id=request.data.get("player_id", ""),
            customer_phone=request.data.get("customer_phone", ""),
        )
    except services.OrderError as e:
        return Response({"detail": str(e)}, status=http.HTTP_400_BAD_REQUEST)
    return Response(OrderSerializer(order).data, status=http.HTTP_201_CREATED)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def store_orders_view(request):
    """طلبات الوكيل نفسه فقط (Pin Takip الخاصة به) — معزولة عن باقي الوكلاء."""
    qs = Order.objects.filter(
        tenant=request.user.tenant, dealer=request.user
    ).select_related("game", "product", "provider").order_by("-created_at")
    status_filter = request.query_params.get("status")
    if status_filter and status_filter != "all":
        qs = qs.filter(status=status_filter)
    search = request.query_params.get("q", "").strip()
    if search:
        qs = qs.filter(receipt_no__icontains=search)
    return Response({
        "count": qs.count(),
        "results": OrderSerializer(qs[:200], many=True).data,
    })


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def store_report_view(request):
    """تقرير إجماليات الوكيل نفسه (Oyun Pin Toplam Raporu) — مجمّع حسب المنتج."""
    user = request.user
    qs = Order.objects.filter(tenant=user.tenant, dealer=user)
    p = request.query_params
    if not p.get("include_cancelled"):
        qs = qs.exclude(status=Order.Status.CANCELLED)
    if p.get("date_from"):
        qs = qs.filter(created_at__date__gte=p["date_from"])
    if p.get("date_to"):
        qs = qs.filter(created_at__date__lte=p["date_to"])
    rows = (
        qs.values("game__name", "product__name")
        .annotate(count=Count("id"), cost=Sum("cost_price"),
                  sell=Sum("sell_price"), profit=Sum("profit"))
        .order_by("game__name", "-count")
    )
    results = [{
        "game": r["game__name"], "product": r["product__name"],
        "count": r["count"], "cost": str(r["cost"] or 0),
        "sell": str(r["sell"] or 0), "profit": str(r["profit"] or 0),
    } for r in rows]
    totals = qs.aggregate(count=Count("id"), cost=Sum("cost_price"),
                          sell=Sum("sell_price"), profit=Sum("profit"))
    return Response({
        "results": results,
        "products": len(results),
        "totals": {k: str(v or 0) for k, v in totals.items()},
    })


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def store_summary_view(request):
    """ملخّص لوحة الوكيل: رصيده + عدد طلباته الناجحة + أرباحه (من طلباته هو)."""
    user = request.user
    wallet = getattr(user, "wallet", None)
    mine = Order.objects.filter(tenant=user.tenant, dealer=user)
    agg = mine.filter(status=Order.Status.SUCCESS).aggregate(
        count=Count("id"), profit=Sum("profit"), sell=Sum("sell_price")
    )
    return Response({
        "balance": str(wallet.balance) if wallet else "0.00",
        "credit_limit": str(wallet.credit_limit) if wallet else "0.00",
        "currency": wallet.currency if wallet else "TRY",
        "orders": agg["count"] or 0,
        "profit": str(agg["profit"] or 0),
        "sell": str(agg["sell"] or 0),
        "pending": mine.filter(status=Order.Status.PENDING).count(),
    })


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def order_execute_view(request, order_id):
    try:
        order = Order.objects.get(pk=order_id, tenant=request.user.tenant)
    except Order.DoesNotExist:
        return Response({"detail": "الطلب غير موجود"}, status=404)
    provider = None
    pid = request.data.get("provider")
    if pid:
        provider = Provider.objects.filter(pk=pid, tenant=request.user.tenant).first()
    try:
        order = services.execute_order(order, provider=provider, pin=request.data.get("pin", ""))
    except services.OrderError as e:
        return Response({"detail": str(e)}, status=http.HTTP_400_BAD_REQUEST)
    return Response(OrderSerializer(order).data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def order_cancel_view(request, order_id):
    try:
        order = Order.objects.get(pk=order_id, tenant=request.user.tenant)
    except Order.DoesNotExist:
        return Response({"detail": "الطلب غير موجود"}, status=404)
    try:
        order = services.cancel_order(order)
    except services.OrderError as e:
        return Response({"detail": str(e)}, status=http.HTTP_400_BAD_REQUEST)
    return Response(OrderSerializer(order).data)
