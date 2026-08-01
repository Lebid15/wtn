"""
قواعد التسعير: ربط سعر مجموعة الأسعار بتكلفة الباقة.

التسعير الجماعي لا يكتب رقماً ويمضي — يحفظ **قاعدة** (نسبة أو مبلغ فوق
التكلفة) تبقى نافذة. فمتى تغيّرت التكلفة تبعها السعر تلقائياً، من أي طريق
تغيّرت: تحرير الخلية، أو «تحديث التكاليف» من مزوّد، أو تحويل عملة الدفتر.

ولأن الطرق كثيرة وستزيد، إعادة الحساب معلّقة على **حفظ الباقة نفسها**
(إشارة `post_save`) لا على كل نقطة استدعاء — فلا تفلت واحدة منها.
"""
from decimal import Decimal

from core.currency import CENT

HUNDRED = Decimal("100")


def price_from_margin(cost: Decimal, mode: str, value: Decimal):
    """
    السعر الناتج عن قاعدة، أو None إن تعذّر.

    تكلفة صفر لا تُسعَّر: النسبة عليها تعطي صفراً — أي بيعاً مجّانياً بلا أن
    ينتبه أحد. وسعرٌ سالب يُرفض كذلك.
    """
    if cost is None or cost <= 0 or value is None:
        return None
    price = (
        cost * (Decimal("1") + Decimal(value) / HUNDRED) if mode == "percent"
        else cost + Decimal(value)
    ).quantize(CENT)
    return price if price >= 0 else None


def apply_margin_rules(product) -> int:
    """
    يعيد حساب أسعار المجموعات المرتبطة بقاعدة لهذه الباقة.

    يُعيد عدد الأسعار التي تغيّرت فعلاً. الأسعار اليدوية (بلا قاعدة) لا تُمَسّ.
    """
    from .models import ProductPrice

    rows = ProductPrice.objects.filter(product=product).exclude(margin_mode="")
    changed = 0
    for row in rows:
        price = price_from_margin(product.cost_price, row.margin_mode, row.margin_value)
        if price is None or price == row.price:
            continue
        row.price = price
        row.save(update_fields=["price"])
        changed += 1
    return changed
