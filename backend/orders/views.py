"""API للطلبات (Takip): قائمة + إنشاء + تنفيذ + إلغاء."""
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
