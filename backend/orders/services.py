"""
منطق الطلبات: إنشاء طلب (تسعير + خصم محفظة)، تنفيذ، إلغاء (استرجاع).
يربط: التسعير (catalog) + المحفظة (core) + المزوّدين (providers).
"""
import random
from decimal import Decimal

from django.db import transaction
from django.utils import timezone

from core import services as wallet_services
from core.models import User, WalletTransaction
from catalog.models import AgentMargin, Product, ProductPrice
from .models import Order


class OrderError(Exception):
    """خطأ في عملية الطلب."""


def _gen_receipt_no() -> str:
    return timezone.now().strftime("%y%m%d") + str(random.randint(10000, 99999))


def resolve_sell_price(dealer: User, product: Product) -> Decimal:
    """
    السعر النهائي للمشتري:
    1) سعر مجموعته (يحدّده صاحب المتجر) وإلا السعر الموصى.
    2) إن كان المشتري دكاناً تابعاً لوكيل كبير، يُضاف هامش الوكيل الكبير للمنتج.
    """
    base = product.recommended_price
    if dealer.price_group_id:
        pp = ProductPrice.objects.filter(
            product=product, price_group_id=dealer.price_group_id
        ).first()
        if pp:
            base = pp.price

    # هامش الوكيل الكبير (إن كان الدكان تابعاً له)
    if dealer.parent_id and getattr(dealer.parent, "role", None) == User.Role.ANA_BAYI:
        margin = AgentMargin.objects.filter(
            agent_id=dealer.parent_id, product=product
        ).first()
        if margin and margin.margin_percent:
            base = base * (Decimal("1") + margin.margin_percent / Decimal("100"))

    return base.quantize(Decimal("0.01"))


@transaction.atomic
def create_order(dealer: User, product: Product, *, player_id="", customer_phone="") -> Order:
    """ينشئ طلباً: يحسب السعر، يخصم من محفظة الوكيل، ويسجّل الطلب (قيد الانتظار)."""
    if product.tenant_id != dealer.tenant_id:
        raise OrderError("المنتج والوكيل من مستأجرين مختلفين")
    if product.status != Product.Status.ACTIVE:
        raise OrderError("المنتج غير متاح للبيع")

    sell = resolve_sell_price(dealer, product)
    cost = product.cost_price

    wallet = getattr(dealer, "wallet", None)
    if wallet is None:
        raise OrderError("لا توجد محفظة للوكيل")

    # خصم المحفظة (يحترم الحد الائتماني) — قد يرفع WalletError
    try:
        txn = wallet_services.apply_transaction(
            wallet.id, -sell, WalletTransaction.Type.ORDER_DEBIT,
            created_by=dealer, note=f"طلب {product.name}",
        )
    except wallet_services.WalletError as e:
        raise OrderError(str(e))

    order = Order.objects.create(
        tenant_id=dealer.tenant_id,
        receipt_no=_gen_receipt_no(),
        dealer=dealer, game=product.game, product=product,
        player_id=player_id, customer_phone=customer_phone,
        cost_price=cost, sell_price=sell, profit=sell - cost,
        status=Order.Status.PENDING,
        balance_before=txn.balance_before, balance_after=txn.balance_after,
    )
    # ربط الحركة بالطلب
    txn.ref_type = "order"
    txn.ref_id = order.id
    txn.save(update_fields=["ref_type", "ref_id"])
    return order


@transaction.atomic
def execute_order(order: Order, *, provider=None, pin="") -> Order:
    """تنفيذ الطلب (ناجح): يسجّل المزوّد والـ PIN."""
    if order.status not in (Order.Status.PENDING, Order.Status.PROCESSING, Order.Status.STUCK):
        raise OrderError("لا يمكن تنفيذ طلب بحالته الحالية")
    order.status = Order.Status.SUCCESS
    order.provider = provider or order.provider
    order.pin_result = pin or f"PIN-{random.randint(100000, 999999)}"
    order.api_response = "تم التنفيذ بنجاح"
    order.approved_at = timezone.now()
    order.save(update_fields=["status", "provider", "pin_result", "api_response", "approved_at"])
    return order


def dispatch_order(order: Order, depth: int = 0) -> Order:
    """
    التنفيذ التلقائي مع التوجيه البديل (Failover):
    يُجرَّب المزوّد الرئيسي، وعند الفشل يُجرَّب API 1 ثم API 2 تلقائياً —
    بحسب ما فعّله صاحب المتجر على المنتج (مزوّد واحد أو اثنان أو ثلاثة).
    - success → ناجح + PIN.  - processing → قيد التنفيذ (يتوقّف عندها).
    - فشل الكل → عالق، مع سجلّ محاولات كامل في api_response.
    depth يمنع حلقات التوجيه الداخلي بين المتاجر (متجر → متجر → ...).
    """
    from providers.adapters.registry import adapter_for

    if depth > 2:
        order.status = Order.Status.STUCK
        order.api_response = "تجاوز عمق التوجيه الداخلي المسموح (حلقة متاجر؟)"
        order.save(update_fields=["status", "api_response"])
        return order

    product = order.product
    chain = [p for p in (product.provider, product.provider_alt1, product.provider_alt2) if p]
    if not chain:
        return order  # بلا مزوّد — يبقى قيد الانتظار للتنفيذ اليدوي

    trail = []  # سجلّ المحاولات: "المزوّد: السبب"
    for provider in chain:
        adapter = adapter_for(provider)
        if adapter is None:
            trail.append(f"{provider.name}: منفّذ يدوي — تُخُطّي")
            continue
        try:
            result = adapter.place_order(order, provider.config or {}, provider=provider, depth=depth)
        except Exception as e:
            trail.append(f"{provider.name}: خطأ محوّل ({e})")
            continue

        note = (result.note or "").strip()
        ref = f" · ref={result.external_ref}" if result.external_ref else ""

        if result.status == "success":
            order.status = Order.Status.SUCCESS
            order.provider = provider
            order.pin_result = result.pin or ""
            order.approved_at = timezone.now()
            prefix = f"[بديل بعد: {' | '.join(trail)}] " if trail else ""
            order.api_response = f"{prefix}{note}{ref}"[:1000]
            order.save(update_fields=["status", "provider", "pin_result", "api_response", "approved_at"])
            return order

        if result.status == "processing":
            order.status = Order.Status.PROCESSING
            order.provider = provider
            prefix = f"[بديل بعد: {' | '.join(trail)}] " if trail else ""
            order.api_response = f"{prefix}{note}{ref}"[:1000]
            order.save(update_fields=["status", "provider", "api_response"])
            return order

        trail.append(f"{provider.name}: {note or 'فشل'}")

    # فشلت كل التوجيهات → عالق مع السجلّ الكامل
    order.status = Order.Status.STUCK
    order.provider = chain[-1]
    order.api_response = ("فشلت كل التوجيهات → " + " | ".join(trail))[:1000]
    order.save(update_fields=["status", "provider", "api_response"])
    return order


@transaction.atomic
def cancel_order(order: Order) -> Order:
    """إلغاء الطلب: يسترجع المبلغ لمحفظة الوكيل."""
    if order.status == Order.Status.CANCELLED:
        raise OrderError("الطلب ملغى مسبقاً")
    if order.status == Order.Status.SUCCESS:
        raise OrderError("لا يمكن إلغاء طلب ناجح")

    wallet = order.dealer.wallet
    wallet_services.apply_transaction(
        wallet.id, order.sell_price, WalletTransaction.Type.REFUND,
        created_by=order.dealer, note=f"إلغاء طلب {order.receipt_no}",
        ref_type="order", ref_id=order.id, allow_below_limit=True,
    )
    order.status = Order.Status.CANCELLED
    order.api_response = "أُلغي واسترُجع المبلغ"
    order.save(update_fields=["status", "api_response"])
    return order
