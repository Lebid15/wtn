"""API لوحة الوكيل الكبير (Ana Bayi) — كل شيء مُقيّد بشجرته الفرعية."""
from decimal import Decimal, InvalidOperation

from django.db import transaction
from django.db.models import Count, Sum
from rest_framework import status as http
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import BasePermission, IsAuthenticated
from rest_framework.response import Response

from core import currency
from core.models import User, Wallet
from catalog.models import AgentMargin, Product
from orders.models import Order
from orders.services import resolve_sell_price


class IsAnaBayi(BasePermission):
    message = "هذه اللوحة مخصّصة للوكيل الكبير فقط."

    def has_permission(self, request, view):
        return bool(request.user and request.user.role == User.Role.ANA_BAYI)


AGENT = [IsAuthenticated, IsAnaBayi]


def _dealer_ids(agent):
    return list(User.objects.filter(parent=agent, role=User.Role.BAYI).values_list("id", flat=True))


@api_view(["GET"])
@permission_classes(AGENT)
def summary_view(request):
    agent = request.user
    ids = _dealer_ids(agent)
    orders = Order.objects.filter(dealer_id__in=ids, status=Order.Status.SUCCESS)
    agg = orders.aggregate(count=Count("id"), profit=Sum("profit"))
    wallet = getattr(agent, "wallet", None)
    show = currency.to_display
    return Response({
        "balance": str(show(agent, wallet.balance)) if wallet else "0.00",
        "dealers": len(ids),
        "orders": agg["count"] or 0,
        "profit": str(show(agent, agg["profit"] or 0)),
        "currency": currency.display_currency(agent),
    })


@api_view(["GET", "POST"])
@permission_classes(AGENT)
def dealers_view(request):
    agent = request.user
    if request.method == "POST":
        data = request.data
        login_id = (data.get("login_id") or "").strip()
        if not login_id or not data.get("password") or not data.get("name"):
            return Response({"detail": "الاسم ورقم الدخول وكلمة السر مطلوبة"}, status=400)
        if User.objects.filter(login_id=login_id).exists():
            return Response({"detail": "رقم الدخول مستخدم مسبقاً"}, status=400)
        with transaction.atomic():
            u = User(tenant=agent.tenant, parent=agent, role=User.Role.BAYI,
                     login_id=login_id, name=data["name"], status=User.Status.ACTIVE,
                     modules={"oyun": True, "shopping": True})
            u.set_password(data["password"])
            u.save()
            Wallet.objects.create(tenant=agent.tenant, user=u, balance=Decimal("0"))
        return Response({"id": u.id, "login_id": u.login_id, "name": u.name}, status=http.HTTP_201_CREATED)

    rows = []
    for u in User.objects.filter(parent=agent, role=User.Role.BAYI).select_related("wallet").order_by("name"):
        w = getattr(u, "wallet", None)
        rows.append({
            "id": u.id, "login_id": u.login_id, "name": u.name,
            # أرصدة دكاكينه بعملة **عرضه هو** — لوحته كلّها بعملة واحدة
            "balance": str(currency.to_display(agent, w.balance)) if w else "0.00",
            "status": u.status,
        })
    return Response({
        "count": len(rows), "results": rows,
        "currency": currency.display_currency(agent),
    })


@api_view(["GET"])
@permission_classes(AGENT)
def orders_view(request):
    ids = _dealer_ids(request.user)
    qs = Order.objects.filter(dealer_id__in=ids).select_related("dealer", "game", "product").order_by("-created_at")
    st = request.query_params.get("status")
    if st and st != "all":
        qs = qs.filter(status=st)
    show = currency.to_display
    rows = [{
        "id": o.id, "receipt_no": o.receipt_no, "dealer_name": o.dealer.name,
        "product_name": o.product.name, "game_name": o.game.name,
        "sell_price": str(show(request.user, o.sell_price)),
        "profit": str(show(request.user, o.profit)),
        "status": o.status, "status_label": o.get_status_display(),
        "created_at": o.created_at.strftime("%Y-%m-%d %H:%M"),
    } for o in qs[:200]]
    return Response({
        "count": qs.count(), "results": rows,
        "currency": currency.display_currency(request.user),
    })


@api_view(["GET"])
@permission_classes(AGENT)
def margins_view(request):
    """الباقات + تكلفة الوكيل الكبير (سعره من صاحب المتجر) + هامشه + سعر دكاكينه."""
    agent = request.user
    margins = {m.product_id: m.margin_percent for m in AgentMargin.objects.filter(agent=agent)}
    products = Product.objects.filter(tenant=agent.tenant, status=Product.Status.ACTIVE).select_related("game").order_by("game__sort_order", "sort_order")
    rows = []
    for p in products:
        cost = resolve_sell_price_for_agent(agent, p)
        pct = margins.get(p.id, Decimal("0"))
        dealer_price = (cost * (Decimal("1") + pct / Decimal("100"))).quantize(Decimal("0.01"))
        rows.append({
            "product": p.id, "name": p.name, "game": p.game.name,
            # الهامش نسبة مئوية فلا يُحوَّل — والسعران بعملة عرضه
            "cost": str(currency.to_display(agent, cost)),
            "margin_percent": str(pct),
            "dealer_price": str(currency.to_display(agent, dealer_price)),
        })
    return Response({"results": rows, "currency": currency.display_currency(agent)})


def resolve_sell_price_for_agent(agent, product):
    """سعر الوكيل الكبير نفسه (من صاحب المتجر) دون هامشه — بتجاهل parent."""
    from catalog.models import ProductPrice
    if agent.price_group_id:
        pp = ProductPrice.objects.filter(product=product, price_group_id=agent.price_group_id).first()
        if pp:
            return pp.price
    return product.recommended_price


@api_view(["POST"])
@permission_classes(AGENT)
def set_margin_view(request):
    agent = request.user
    try:
        product = Product.objects.get(pk=request.data.get("product"), tenant=agent.tenant)
        pct = Decimal(str(request.data.get("margin_percent")))
    except (Product.DoesNotExist, InvalidOperation, TypeError):
        return Response({"detail": "بيانات غير صحيحة"}, status=400)
    AgentMargin.objects.update_or_create(
        tenant=agent.tenant, agent=agent, product=product,
        defaults={"margin_percent": pct},
    )
    return Response({"product": product.id, "margin_percent": str(pct)})
