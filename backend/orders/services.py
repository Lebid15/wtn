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


def resolve_dealer_sell_price(product: Product, raw=None) -> Decimal:
    """
    سعر بيع الوكيل **لزبونه**: ما كتبه بيده إن كتبه، وإلا سعر التوصية.
    سعر التوصية تخمين من صاحب المتجر؛ الوكيل حرّ أن يبيع أغلى أو أرخص.
    """
    if raw in (None, ""):
        return product.recommended_price.quantize(Decimal("0.01"))
    try:
        value = Decimal(str(raw).replace(",", "."))
    except (InvalidOperation, ValueError):
        raise OrderError("سعر البيع غير صالح")
    if value < 0:
        raise OrderError("سعر البيع لا يصحّ أن يكون سالباً")
    return value.quantize(Decimal("0.01"))


@transaction.atomic
def create_order(dealer: User, product: Product, *, player_id="", customer_phone="",
                 dealer_sell_price=None) -> Order:
    """ينشئ طلباً: يحسب السعر، يخصم من محفظة الوكيل، ويسجّل الطلب (قيد الانتظار)."""
    if product.tenant_id != dealer.tenant_id:
        raise OrderError("المنتج والوكيل من مستأجرين مختلفين")
    if product.status != Product.Status.ACTIVE:
        raise OrderError("المنتج غير متاح للبيع")

    sell = resolve_sell_price(dealer, product)
    cost = product.cost_price
    retail = resolve_dealer_sell_price(product, dealer_sell_price)

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
        dealer_sell_price=retail, dealer_profit=retail - sell,
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
    """
    تنفيذ الطلب يدوياً (ناجح): يسجّل المزوّد والـ PIN إن أُعطي.
    بلا PIN يبقى الحقل فارغاً وتُعرض «شُحن مباشرةً ✓» — لا يجوز اختلاق كود
    وهمي يُسلَّم للوكيل على أنه كود شحن حقيقي.

    ويقبل **عكس قرار سابق**: طلب ملغى يُعاد قبوله. وحينها يُعاد خصم المبلغ
    لأن الإلغاء أرجعه — بدون ذلك يشحن الوكيل مجاناً.
    """
    reinstated = order.status == Order.Status.CANCELLED
    if not reinstated and order.status not in (
        Order.Status.PENDING, Order.Status.PROCESSING, Order.Status.STUCK
    ):
        raise OrderError("لا يمكن تنفيذ طلب بحالته الحالية")

    if reinstated:
        try:
            wallet_services.apply_transaction(
                order.dealer.wallet.id, -order.sell_price, WalletTransaction.Type.ORDER_DEBIT,
                note=f"إعادة خصم طلب {order.receipt_no} بعد قبوله",
                ref_type="order", ref_id=order.id,
            )
        except wallet_services.WalletError as e:
            raise OrderError(f"تعذّر إعادة خصم المبلغ: {e}")

    order.status = Order.Status.SUCCESS
    order.provider = provider or order.provider
    order.pin_result = pin or order.pin_result
    order.api_response = (
        "أعاد المشغّل قبوله بعد إلغائه — أُعيد خصم المبلغ" if reinstated
        else "نفّذه المشغّل يدوياً"
    )
    order.approved_at = timezone.now()
    order.save(update_fields=["status", "provider", "pin_result", "api_response", "approved_at"])
    return order


@transaction.atomic
def set_manual(order: Order) -> Order:
    """
    إعادة الطلب إلى **التنفيذ اليدوي**: يعود «قيد الانتظار» ويُفكّ عن مزوّده.
    مخرج الطلب العالق: يُعاد يدوياً ثم يُنفَّذ أو يُوجَّه إلى مزوّد آخر.
    مرجع المزوّد وملاحظته يبقيان — هما سجلّ ما جرى، ولا يُستعلَم عنهما بعد
    الآن لأن حلقة المراقبة لا تلمس إلا «قيد التنفيذ».
    """
    if order.status in (Order.Status.SUCCESS, Order.Status.CANCELLED):
        raise OrderError("لا يمكن إعادة طلب محسوم إلى اليدوي")
    order.status = Order.Status.PENDING
    order.provider = None
    order.api_response = "أُعيد إلى التنفيذ اليدوي بقرار المشغّل"
    order.save(update_fields=["status", "provider", "api_response"])
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


def _send_to(order: Order, provider, trail: list, depth: int = 0) -> bool:
    """
    محاولة إرسال واحدة لدى مزوّد بعينه.
    تُعيد True إن حُسمت المحاولة (ناجح أو قيد تنفيذ) فتتوقّف السلسلة،
    وFalse إن فشلت أو تُخُطّيت — ويُسجَّل السبب في `trail`.
    """
    from providers.adapters.registry import adapter_for

    adapter = adapter_for(provider)
    if adapter is None:
        trail.append(f"{provider.name}: منفّذ يدوي — تُخُطّي")
        return False

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
            return False

    try:
        result = adapter.place_order(order, provider.config or {}, provider=provider, depth=depth)
    except Exception as e:
        trail.append(f"{provider.name}: خطأ محوّل ({e})")
        return False

    note = (result.note or "").strip()
    ref = f" · ref={result.external_ref}" if result.external_ref else ""
    cost_fields = _apply_real_cost(order, result, provider)

    if result.status in ("success", "processing"):
        order.status = (
            Order.Status.SUCCESS if result.status == "success" else Order.Status.PROCESSING
        )
        order.provider = provider
        prefix = f"[بديل بعد: {' | '.join(trail)}] " if trail else ""
        order.api_response = f"{prefix}{note}{ref}"[:250]
        order.provider_ref = result.external_ref or ""
        order.provider_note = note[:250]
        fields = ["status", "provider", "api_response", "provider_ref", "provider_note"]
        if result.status == "success":
            order.pin_result = result.pin or ""
            order.approved_at = timezone.now()
            fields += ["pin_result", "approved_at"]
        order.save(update_fields=fields + cost_fields)
        return True

    trail.append(f"{provider.name}: {note or 'فشل'}")
    return False


def dispatch_to_provider(order: Order, provider, depth: int = 0) -> Order:
    """
    توجيه **يدوي** إلى مزوّد يختاره المشغّل — يتخطّى سلسلة المنتج.
    مخرج الطلب العالق أو المُعدّ يدوياً: يُرسَل إلى من يراه المشغّل مناسباً.
    """
    if order.status not in (Order.Status.PENDING, Order.Status.STUCK):
        raise OrderError("لا يُوجَّه إلا طلب قيد الانتظار أو عالق")

    trail = []
    if _send_to(order, provider, trail, depth):
        return order

    order.status = Order.Status.STUCK
    order.provider = provider
    order.api_response = ("فشل التوجيه اليدوي → " + " | ".join(trail))[:250]
    order.save(update_fields=["status", "provider", "api_response"])
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
        if _send_to(order, provider, trail, depth):
            return order

    # فشلت كل التوجيهات → عالق مع السجلّ الكامل
    order.status = Order.Status.STUCK
    order.provider = chain[-1]
    order.api_response = ("فشلت كل التوجيهات → " + " | ".join(trail))[:250]
    order.save(update_fields=["status", "provider", "api_response"])
    return order


@transaction.atomic
def cancel_order(order: Order) -> Order:
    """
    إلغاء الطلب: يسترجع المبلغ لمحفظة الوكيل.
    ويقبل **عكس قرار سابق**: طلب نُفّذ بالخطأ يُبطله المشغّل ويُستَرجع مبلغه.
    """
    if order.status == Order.Status.CANCELLED:
        raise OrderError("الطلب ملغى مسبقاً")
    revoked = order.status == Order.Status.SUCCESS

    wallet = order.dealer.wallet
    wallet_services.apply_transaction(
        wallet.id, order.sell_price, WalletTransaction.Type.REFUND,
        created_by=order.dealer, note=f"إلغاء طلب {order.receipt_no}",
        ref_type="order", ref_id=order.id, allow_below_limit=True,
    )
    order.status = Order.Status.CANCELLED
    order.api_response = (
        "أبطله المشغّل بعد نجاحه — استُرجع المبلغ" if revoked
        else "أُلغي واسترُجع المبلغ"
    )
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
