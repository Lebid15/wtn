"""
الجرد النهائي — المرحلة الأولى: قراءة ما نملكه فعلاً.

**الفكرة المقتبَسة من نظام JRD:** الجرد لقطةٌ لكل مالك في لحظة، والفرق بين
لقطتين هو ربحك. هناك كان لا بدّ من روبوتات وAPI لجلب الأرصدة من كل مصدر —
وهنا **الأرصدة عندنا أصلاً في القاعدة**، فالمرحلة الأولى قراءةٌ لا جلب.

**والفرق الجوهري عن ذلك النظام:** هناك كل بند كان مالاً لنا فيُجمع. وعندنا
**محافظ الوكلاء ليست مالنا**: وكيلٌ رصيده +500 يعني أننا مدينون له بخدمةٍ
قيمتها 500 — التزامٌ علينا لا أصلٌ لنا. جمعُه ضمن رأس المال يضخّمه ضخّماً
كاذباً. لذلك يفصل هذا التقرير **الأصول عن الالتزامات** ولا يخلطهما.

ولا نطبع رقم «صافي رأس المال» في هذه المرحلة عمداً: بعض الأرقام عملتها غير
محسومة بعد (انظر `unresolved` في الردّ)، وجمعُ أرقامٍ بعملات مجهولة يعطي
رقماً واثقاً وخاطئاً — وهو أسوأ من لا رقم.
"""
from decimal import Decimal

from django.db.models import Count, Q, Sum
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from core import currency as cur
from core.models import Invoice, User, Wallet
from payments.models import ReceivingAccount
from providers.models import Provider

ZERO = Decimal("0")


def _row(name, amount, currency, tenant, *, kind, note="", resolved=True):
    """صفّ واحد في الجرد. `base` = القيمة بعملة الدفتر، أو None إن تعذّر."""
    amount = Decimal(amount or 0)
    base = None
    if resolved:
        if currency == cur.base_currency(tenant):
            base = amount.quantize(Decimal("0.01"))
        else:
            rate = cur.rate_of(tenant, currency)
            base = (amount / rate).quantize(Decimal("0.01")) if rate > 0 else None
    return {
        "name": name, "amount": str(amount), "currency": currency,
        "base": str(base) if base is not None else None,
        "kind": kind, "note": note, "resolved": resolved and base is not None,
    }


def _group(key, label, kind, rows, hint=""):
    total = sum((Decimal(r["base"]) for r in rows if r["base"] is not None), ZERO)
    return {
        "key": key, "label": label, "kind": kind, "hint": hint,
        "rows": rows,
        "total_base": str(total),
        "unresolved": sum(1 for r in rows if not r["resolved"]),
    }


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def live_view(request):
    """لقطة حيّة لكل ما تعرفه القاعدة عن مال المتجر — بلا حفظ وبلا تعديل."""
    if request.user.role != User.Role.TENANT_ADMIN:
        return Response({"detail": "الجرد لصاحب المتجر وحده"}, status=403)
    tenant = request.user.tenant
    if tenant is None:
        return Response({"detail": "لا يوجد متجر"}, status=400)

    base = cur.base_currency(tenant)
    groups = []
    notes = []

    # ── 1. المزوّدون ──
    # `real_balance` يأتي من ردّ المزوّد نفسه، وكتالوجات المزوّدين كلّها
    # بالليرة التركية (core.currency.PROVIDER_CURRENCY) — فيُحوَّل.
    # أمّا `balance` و`debt` فيكتبهما صاحب المتجر بيده، وعملتهما غير موثّقة
    # في النموذج: نعرضهما ولا نجمعهما حتى يحسم المالك عملتهما.
    prov_rows, prov_debt_rows = [], []
    for p in Provider.objects.filter(tenant=tenant).order_by("sort_order", "id"):
        if p.real_balance:
            prov_rows.append(_row(
                p.name, p.real_balance, cur.PROVIDER_CURRENCY, tenant,
                kind="asset", note="من ردّ المزوّد",
            ))
        if p.balance:
            prov_rows.append(_row(
                f"{p.name} — رصيد يدوي", p.balance, "?", tenant,
                kind="asset", note="أدخله صاحب المتجر — عملته غير محسومة",
                resolved=False,
            ))
        if p.debt:
            prov_debt_rows.append(_row(
                f"{p.name} — دَين", p.debt, "?", tenant,
                kind="liability", note="أدخله صاحب المتجر — عملته غير محسومة",
                resolved=False,
            ))
    groups.append(_group(
        "providers", "أرصدتنا لدى المزوّدين", "asset", prov_rows,
        "مالٌ دفعناه مسبقاً ولم نستهلكه بعد — أصلٌ لنا.",
    ))
    if prov_debt_rows:
        groups.append(_group(
            "provider_debt", "ديون علينا للمزوّدين", "liability", prov_debt_rows,
            "ما استهلكناه ولم نسدّده بعد.",
        ))

    # ── 2. حسابات الاستلام والنقد ──
    # النموذج بلا حقل عملة، والمبالغ تدخله بعملة الدفتر — فتُقرأ كذلك.
    recv_rows = [
        _row(f"{a.title} ({a.get_method_display()})", a.balance, base, tenant,
             kind="asset", note="")
        for a in ReceivingAccount.objects.filter(
            tenant=tenant, status=ReceivingAccount.Status.ACTIVE
        ).order_by("sort_order", "id") if a.balance
    ]
    groups.append(_group(
        "receiving", "حساباتنا والنقد", "asset", recv_rows,
        "حسابات الاستلام المفعّلة كما هي مسجّلة في «حساباتي».",
    ))

    # ── 3. محافظ الوكلاء — الوجهان ──
    agg = Wallet.objects.filter(tenant=tenant).aggregate(
        credit=Sum("balance", filter=Q(balance__gt=0)),
        credit_n=Count("id", filter=Q(balance__gt=0)),
        debt=Sum("balance", filter=Q(balance__lt=0)),
        debt_n=Count("id", filter=Q(balance__lt=0)),
    )
    groups.append(_group(
        "dealer_debt", "ديون الوكلاء لنا", "asset",
        [_row(f"{agg['debt_n'] or 0} وكيلاً رصيدهم سالب", -(agg["debt"] or ZERO),
              base, tenant, kind="asset")] if agg["debt"] else [],
        "الرصيد السالب دَينٌ على الوكيل — مالٌ سنقبضه.",
    ))
    groups.append(_group(
        "dealer_credit", "أرصدة الوكلاء عندنا", "liability",
        [_row(f"{agg['credit_n'] or 0} وكيلاً رصيدهم موجب", agg["credit"] or ZERO,
              base, tenant, kind="liability")] if agg["credit"] else [],
        "مالٌ قبضناه ولم نقدّم مقابله بعد — التزامٌ علينا لا ربح.",
    ))

    # ── 4. فواتير اشتراك المنصّة غير المدفوعة ──
    unpaid = Invoice.objects.filter(tenant=tenant, status=Invoice.Status.UNPAID)
    inv_total = unpaid.aggregate(s=Sum("amount"))["s"] or ZERO
    if inv_total:
        groups.append(_group(
            "subscription", "اشتراك المنصّة غير المدفوع", "liability",
            [_row(f"{unpaid.count()} فاتورة", inv_total, base, tenant, kind="liability")],
            "دفترٌ بينك وبين مالك المنصّة — خارج دفتر متجرك.",
        ))

    if any(g["unresolved"] for g in groups):
        notes.append(
            "بعض الأرقام عملتها غير محسومة (الرصيد والدَّين اليدويان على المزوّد)، "
            "فلا تدخل المجاميع. تُحسم عملتها ثم تُحتسب."
        )
    if not cur.rate_of(tenant, cur.PROVIDER_CURRENCY):
        notes.append(
            f"لا سعر صرف مضبوط لـ{cur.PROVIDER_CURRENCY} — أرصدة المزوّدين لا تُحوَّل. "
            "اضبطه من «الإعدادات ← أسعار الصرف»."
        )

    assets = sum((Decimal(g["total_base"]) for g in groups if g["kind"] == "asset"), ZERO)
    liabilities = sum((Decimal(g["total_base"]) for g in groups if g["kind"] == "liability"), ZERO)

    return Response({
        "base_currency": base,
        "groups": groups,
        "totals": {
            "assets": str(assets),
            "liabilities": str(liabilities),
            "net": str(assets - liabilities),
        },
        "notes": notes,
    })
