"""API للكتالوج: الألعاب والمنتجات ومجموعات الأسعار — معزولة لكل مستأجر."""
from decimal import Decimal, InvalidOperation

from rest_framework import viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Game, PriceGroup, Product, ProductPrice
from .serializers import (
    GameDetailSerializer, GameSerializer, PriceGroupSerializer, ProductSerializer,
)


class GameViewSet(viewsets.ModelViewSet):
    """CRUD الألعاب ضمن مستأجر المستخدم الحالي."""
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Game.objects.filter(tenant=self.request.user.tenant)

    def get_serializer_class(self):
        return GameDetailSerializer if self.action == "retrieve" else GameSerializer

    def perform_create(self, serializer):
        serializer.save(tenant=self.request.user.tenant)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def price_matrix_view(request):
    """مصفوفة الأسعار: منتجات (مجمّعة حسب اللعبة) × مجموعات الأسعار.
    كل خلية = السعر الصريح للمجموعة، أو السعر الموصى كافتراضي."""
    tenant = request.user.tenant
    groups = list(PriceGroup.objects.filter(tenant=tenant).order_by("id"))

    # جميع الأسعار الصريحة {(product_id, group_id): price}
    explicit = {
        (pp.product_id, pp.price_group_id): pp.price
        for pp in ProductPrice.objects.filter(tenant=tenant)
    }

    games = []
    products = (
        Product.objects.filter(tenant=tenant).select_related("game").order_by("game__sort_order", "sort_order")
    )
    current = None
    for p in products:
        if current is None or current["game_id"] != p.game_id:
            current = {"game_id": p.game_id, "game_name": p.game.name, "products": []}
            games.append(current)
        cells = {}
        for g in groups:
            val = explicit.get((p.id, g.id))
            cells[g.id] = {
                "price": str(val) if val is not None else str(p.recommended_price),
                "custom": val is not None,
            }
        current["products"].append({
            "id": p.id,
            "name": p.name,
            "cost_price": str(p.cost_price),
            "recommended_price": str(p.recommended_price),
            "prices": cells,
        })

    return Response({
        "groups": [{"id": g.id, "name": g.name} for g in groups],
        "games": games,
    })


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def set_price_view(request):
    """تعيين/تحديث سعر منتج لمجموعة (خلية في المصفوفة)."""
    tenant = request.user.tenant
    try:
        product = Product.objects.get(pk=request.data.get("product"), tenant=tenant)
        group = PriceGroup.objects.get(pk=request.data.get("price_group"), tenant=tenant)
        price = Decimal(str(request.data.get("price")))
    except (Product.DoesNotExist, PriceGroup.DoesNotExist):
        return Response({"detail": "المنتج أو المجموعة غير موجود"}, status=404)
    except (InvalidOperation, TypeError):
        return Response({"detail": "سعر غير صحيح"}, status=400)

    pp, _ = ProductPrice.objects.update_or_create(
        tenant=tenant, product=product, price_group=group, defaults={"price": price},
    )
    return Response({"product": product.id, "price_group": group.id, "price": str(pp.price)})


class PriceGroupViewSet(viewsets.ModelViewSet):
    """CRUD مجموعات الأسعار (Fiyat Grupları)."""
    serializer_class = PriceGroupSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return PriceGroup.objects.filter(tenant=self.request.user.tenant)

    def perform_create(self, serializer):
        serializer.save(tenant=self.request.user.tenant)


class ProductViewSet(viewsets.ModelViewSet):
    """CRUD المنتجات؛ يدعم الفلترة بـ ?game=<id>."""
    serializer_class = ProductSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = Product.objects.filter(tenant=self.request.user.tenant)
        game_id = self.request.query_params.get("game")
        if game_id:
            qs = qs.filter(game_id=game_id)
        return qs

    def perform_create(self, serializer):
        serializer.save(tenant=self.request.user.tenant)
