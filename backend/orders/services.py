"""
منطق الطلبات: إنشاء طلب (تسعير + خصم محفظة)، تنفيذ، إلغاء (استرجاع).
يربط: التسعير (catalog) + المحفظة (core) + المزوّدين (providers).
"""
import random
from decimal import Decimal, InvalidOperation

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


def _link_price(product_id: int, provider_id: int):
    """سعر الباقة لدى المزوّد كما حُفظ وقت الربط من كتالوجه (أو None)."""
    from catalog.models import ProductLink

    link = ProductLink.objects.filter(
        product_id=product_id, provider_id=provider_id
    ).only("extra").first()
    raw = (link.extra or {}).get("price") if link else None
    if raw in (None, ""):
        return None
    try:
        return Decimal(str(raw).replace(",", "."))
    except (InvalidOperation, ValueError):
        return None


def _apply_real_cost(order: Order, result, provider) -> list:
    """
    يعتمد التكلفة **الفعلية** التي أعادها المزوّد بدل التكلفة المقدَّرة على
    المنتج، ويعيد حساب الربح. بدونها يظهر ربح وهمي بينما العملية خاسرة.

    ويُعلّم الربط بهذه التكلفة (`extra.price`) حتى تعمل حماية الخسارة على
    الطلب التالي — فالربط قد يكون أُنشئ يدوياً بلا سعر كتالوج، وبلا سعر
    معروف تمرّ الحماية صامتةً (فشل مفتوح).
    """
    if result.cost is None or result.cost < 0:
        return []
    order.cost_price = result.cost
    order.profit = order.sell_price - result.cost
    _learn_link_price(order.product_id, getattr(provider, "id", None), result.cost)
    return ["cost_price", "profit"]


def _learn_link_price(product_id: int, provider_id, cost) -> None:
    """يحفظ التكلفة الفعلية على الربط ليصير سعراً مرجعياً لحماية الخسارة."""
    from catalog.models import ProductLink

    if not provider_id:
        return
    link = ProductLink.objects.filter(
        product_id=product_id, provider_id=provider_id
    ).first()
    if link is None:
        return
    extra = dict(link.extra or {})
    if str(extra.get("price") or "") == str(cost):
        return
    extra["price"] = str(cost)
    link.extra = extra
    link.save(update_fields=["extra", "updated_at"])


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

        # حماية الخسارة (Zarar Ayarı): سعر الباقة المحفوظ وقت الربط مأخوذ من
        # كتالوج المزوّد. إن تجاوز سعر بيعنا، فالطلب خاسر قبل أن يُرسَل —
        # نتخطّى هذا المزوّد بدل إنفاق المال. يُعطَّل بإطفاء loss_guard عليه.
        if provider.loss_guard:
            known = _link_price(order.product_id, provider.id)
            if known is None:
                # لا سعر مرجعي بعد (ربط يدوي مثلاً) — نمرّر ونتعلّم التكلفة من
                # ردّ المزوّد، فتحمي الطلبَ التالي.
                trail.append(f"{provider.name}: حماية الخسارة بلا سعر مرجعي — أول طلب يحدّده")
            elif known > order.sell_price:
                trail.append(
                    f"{provider.name}: حماية الخسارة — تكلفته {known} > سعر البيع {order.sell_price}"
                )
                continue
        try:
            result = adapter.place_order(order, provider.config or {}, provider=provider, depth=depth)
        except Exception as e:
            trail.append(f"{provider.name}: خطأ محوّل ({e})")
            continue

        note = (result.note or "").strip()
        ref = f" · ref={result.external_ref}" if result.external_ref else ""

        cost_fields = _apply_real_cost(order, result, provider)

        if result.status == "success":
            order.status = Order.Status.SUCCESS
            order.provider = provider
            order.pin_result = result.pin or ""
            order.approved_at = timezone.now()
            prefix = f"[بديل بعد: {' | '.join(trail)}] " if trail else ""
            order.api_response = f"{prefix}{note}{ref}"[:250]
            order.provider_ref = result.external_ref or ""
            order.provider_note = note[:250]
            order.save(update_fields=[
                "status", "provider", "pin_result", "api_response",
                "provider_ref", "provider_note", "approved_at",
            ] + cost_fields)
            return order

        if result.status == "processing":
            order.status = Order.Status.PROCESSING
            order.provider = provider
            prefix = f"[بديل بعد: {' | '.join(trail)}] " if trail else ""
            order.api_response = f"{prefix}{note}{ref}"[:250]
            order.provider_ref = result.external_ref or ""
            order.provider_note = note[:250]
            order.save(update_fields=[
                "status", "provider", "api_response", "provider_ref", "provider_note",
            ] + cost_fields)
            return order

        trail.append(f"{provider.name}: {note or 'فشل'}")

    # فشلت كل التوجيهات → عالق مع السجلّ الكامل
    order.status = Order.Status.STUCK
    order.provider = chain[-1]
    order.api_response = ("فشلت كل التوجيهات → " + " | ".join(trail))[:250]
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


def sync_order(order: Order) -> dict:
    """
    استعلام حالة الطلب لدى المزوّد وتحديثه عندنا (حلقة المراقبة).

    يُطبَّق على الطلبات "قيد التنفيذ" فقط — أي ما أكّد المزوّد استلامه ولم
    يحسمه بعد. نتيجة المزوّد:
      • ناجح  → success + الـ PIN + ملاحظته
      • مرفوض → عالق (لا استرجاع تلقائي — القرار للأدمن) + سبب الرفض
      • ما زال → يبقى قيد التنفيذ ونحدّث الملاحظة إن تغيّرت
    """
    from providers.adapters.registry import adapter_for

    out = {"order": order.id, "changed": False, "status": order.status}
    if order.status != Order.Status.PROCESSING or order.provider is None:
        out["note"] = "لا يحتاج متابعة"
        return out

    adapter = adapter_for(order.provider)
    if adapter is None:
        out["note"] = "لا محوّل آلي لهذا المزوّد"
        return out

    try:
        result = adapter.fetch_status(order, order.provider.config or {}, provider=order.provider)
    except Exception as e:                     # لا نُسقِط الحلقة بسبب مزوّد واحد
        out["note"] = f"خطأ محوّل: {e}"
        return out

    note = (result.note or "").strip()
    fields = ["last_sync_at"]
    order.last_sync_at = timezone.now()

    # نسجّل ملاحظة المزوّد؛ وإن ردّ بلا رسالة (مثل "OK|3||") نحفظ الردّ الخام
    # بدل إبقاء ردّ الإرسال القديم الذي يوهم بأن الطلب ما زال مقبولاً.
    fresh = note or (result.raw or "").strip()
    if fresh and fresh != order.provider_note:
        order.provider_note = fresh[:250]
        fields.append("provider_note")

    if result.status == "success":
        order.status = Order.Status.SUCCESS
        order.pin_result = result.pin or order.pin_result
        order.approved_at = timezone.now()
        order.api_response = (f"المزوّد أكّد التنفيذ · {note}" if note else "المزوّد أكّد التنفيذ")[:250]
        fields += ["status", "pin_result", "approved_at", "api_response"]
        out["changed"] = True
    elif result.status == "failed":
        # ZNET: الحالة 3 = IPTAL (ملغى) — والمزوّد يعيد المبلغ إلى رصيدنا لديه
        # (مؤكَّد عملياً: 581.60 → 625.00). فلا يجوز إبقاء مبلغ الوكيل محجوزاً:
        # نلغي الطلب ونسترجع له تلقائياً بدل تركه "عالقاً" بانتظار الأدمن.
        order.save(update_fields=fields)          # نثبّت الملاحظة قبل الإلغاء
        cancel_order(order)
        order.api_response = (
            f"ألغى المزوّد الطلب — استُرجع المبلغ · {note}" if note
            else "ألغى المزوّد الطلب — استُرجع المبلغ"
        )[:250]
        order.save(update_fields=["api_response"])
        out.update(changed=True, status=order.status, note=note,
                   provider_note=order.provider_note, refunded=True,
                   raw=(result.raw or "")[:300], parsed=result.status)
        return out

    order.save(update_fields=fields)
    out.update(
        status=order.status, note=note, pin=order.pin_result,
        provider_note=order.provider_note,
        # الردّ الخام كما ورد من المزوّد — للتشخيص وقراءة رسالته حرفيّاً
        raw=(result.raw or "")[:300],
        parsed=result.status,
    )
    return out


def sync_pending(tenant, limit: int = 50) -> list:
    """يتابع كل الطلبات "قيد التنفيذ" لهذا المستأجر — تستدعيها حلقة المراقبة."""
    qs = (
        Order.objects.filter(tenant=tenant, status=Order.Status.PROCESSING)
        .select_related("provider", "product")
        .order_by("-created_at")[:limit]
    )
    return [sync_order(o) for o in qs]
