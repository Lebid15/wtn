"""API للكتالوج: الألعاب والمنتجات ومجموعات الأسعار — معزولة لكل مستأجر."""
from decimal import Decimal, InvalidOperation

from rest_framework import viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from core.models import User
from django.db import transaction
from .models import Game, LibraryGame, PriceGroup, Product, ProductPrice
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


def _dealer_row(u):
    return {
        "id": u.id,
        "login_id": u.login_id,
        "name": u.name,
        "oyun_load_limit": str(u.oyun_load_limit),
        "foreign_ip_allowed": u.foreign_ip_allowed,
        "price_group": u.price_group_id,
    }


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def dealer_prices_view(request):
    """قائمة إعدادات أسعار الوكلاء (Bayi Fiyat Ayarları)."""
    tenant = request.user.tenant
    dealers = (
        User.objects.filter(tenant=tenant, role=User.Role.BAYI)
        .select_related("price_group").order_by("name")
    )
    return Response({
        "groups": [
            {"id": g.id, "name": g.name}
            for g in PriceGroup.objects.filter(tenant=tenant).order_by("id")
        ],
        "dealers": [_dealer_row(u) for u in dealers],
    })


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def dealer_price_update_view(request, dealer_id):
    """تحديث إعدادات سعر وكيل واحد."""
    try:
        u = User.objects.get(pk=dealer_id, tenant=request.user.tenant, role=User.Role.BAYI)
    except User.DoesNotExist:
        return Response({"detail": "الوكيل غير موجود"}, status=404)

    data = request.data
    if "oyun_load_limit" in data:
        try:
            u.oyun_load_limit = Decimal(str(data["oyun_load_limit"]))
        except (InvalidOperation, TypeError):
            return Response({"detail": "حد غير صحيح"}, status=400)
    if "foreign_ip_allowed" in data:
        u.foreign_ip_allowed = bool(data["foreign_ip_allowed"])
    if "price_group" in data:
        gid = data["price_group"]
        u.price_group = (
            PriceGroup.objects.filter(pk=gid, tenant=request.user.tenant).first() if gid else None
        )
    u.save(update_fields=["oyun_load_limit", "foreign_ip_allowed", "price_group"])
    return Response(_dealer_row(u))


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def dealer_bulk_group_view(request):
    """تعيين مجموعة أسعار لكل الوكلاء دفعة واحدة (Toplu Fiyat Grubu Ata)."""
    gid = request.data.get("price_group")
    group = PriceGroup.objects.filter(pk=gid, tenant=request.user.tenant).first() if gid else None
    if gid and not group:
        return Response({"detail": "المجموعة غير موجودة"}, status=404)
    count = User.objects.filter(tenant=request.user.tenant, role=User.Role.BAYI).update(
        price_group=group
    )
    return Response({"updated": count, "price_group": group.id if group else None})


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


def _require_tenant_admin(request):
    u = request.user
    return u.role == User.Role.TENANT_ADMIN and u.tenant_id is not None


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def library_browse_view(request):
    """تصفّح المكتبة العالمية لصاحب المتجر — مع علامة "مستورَد" لكل لعبة."""
    if not _require_tenant_admin(request):
        return Response({"detail": "مخصّص لصاحب المتجر"}, status=403)
    imported = set(
        Game.objects.filter(tenant=request.user.tenant)
        .exclude(master_library_uuid="")
        .values_list("master_library_uuid", flat=True)
    )
    rows = []
    for g in LibraryGame.objects.filter(is_active=True).prefetch_related("products"):
        active_products = [p for p in g.products.all() if p.is_active]
        rows.append({
            "id": g.id,
            "uuid": g.uuid,
            "name": g.name,
            "image_url": g.image_url,
            "description": g.description,
            "require_player_id": g.require_player_id,
            "product_count": len(active_products),
            "products": [{
                "name": p.name, "suggested_cost": str(p.suggested_cost),
                "suggested_price": str(p.suggested_price), "kupur": p.kupur,
            } for p in active_products],
            "is_imported": g.uuid in imported,
        })
    return Response({"count": len(rows), "results": rows})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def library_import_view(request, library_game_id):
    """استيراد لعبة عالمية + كل باقاتها الفعّالة إلى متجر صاحب المتجر (نسخ snapshot)."""
    if not _require_tenant_admin(request):
        return Response({"detail": "مخصّص لصاحب المتجر"}, status=403)
    tenant = request.user.tenant

    # (1) snapshot من المكتبة العالمية
    try:
        lib = LibraryGame.objects.prefetch_related("products").get(
            pk=library_game_id, is_active=True
        )
    except LibraryGame.DoesNotExist:
        return Response({"detail": "غير موجود", "code": "not_found"}, status=404)

    # (2) منع الاستيراد المكرر عبر uuid المصدر
    if Game.objects.filter(tenant=tenant, master_library_uuid=lib.uuid).exists():
        return Response(
            {"detail": "مستورَد مسبقاً", "code": "already_imported"}, status=400
        )

    packages = [p for p in lib.products.all() if p.is_active]

    # (3) نسخ (clone) داخل معاملة ذرّية
    with transaction.atomic():
        last = Game.objects.filter(tenant=tenant).order_by("-sort_order").first()
        game = Game.objects.create(
            tenant=tenant,
            name=lib.name,
            image_url=lib.image_url,
            description=lib.description,
            require_player_id=lib.require_player_id,
            kurulu_sale=lib.kurulu_sale,
            toplu_sale=lib.toplu_sale,
            sms_template=lib.sms_template,
            master_library_uuid=lib.uuid,   # الرابط المنطقي بالمصدر
            sort_order=(last.sort_order + 1) if last else 0,
        )
        for i, p in enumerate(packages):
            Product.objects.create(
                tenant=tenant, game=game, name=p.name,
                cost_price=p.suggested_cost, recommended_price=p.suggested_price,
                kupur=p.kupur, is_parcali=p.is_parcali,
                execution_type=p.execution_type, description=p.description,
                sort_order=i,
            )

    return Response(
        GameDetailSerializer(game).data | {"imported_products": len(packages)},
        status=201,
    )
