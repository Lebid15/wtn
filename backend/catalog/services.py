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


def catalog_index(packages) -> dict:
    """
    فهرس كتالوج المزوّد بمفتاح **(المعرّف، الكوبون)** معاً.

    المعرّف وحده لا يميّز الباقة: زينت يرقّم به **اللعبة** (`oyun_bilgi_id`)،
    فباقات ببجي كلّها معرّفها `1` ويميّزها `kupur`. المطابقة به وحده تُلصق
    سعر أوّل باقة في اللعبة بكل باقاتها.
    """
    index = {}
    for p in packages:
        pid = str(p.get("id") or "").strip()
        if not pid:
            continue
        index[(pid, str(p.get("kupur") or "").strip())] = p
    return index


def catalog_match(index: dict, link):
    """
    باقة الرابط في الفهرس: (المطابقة، سبب الإخفاق).

    الرابط اليدويّ قد يكون بلا كوبون. حينها نقبل المطابقة **إن لم يكن في
    الكتالوج إلا باقة واحدة بهذا المعرّف**؛ فإن تعدّدت فالأمر ملتبس ونمتنع —
    التخمين هنا يكتب سعر باقة على أخرى بلا أن ينتبه أحد.
    """
    pid = str(link.package_id).strip()
    kupur = str((link.extra or {}).get("kupur") or "").strip()

    found = index.get((pid, kupur))
    if found is not None:
        return found, ""

    same_id = [v for (k_id, _), v in index.items() if k_id == pid]
    if not same_id:
        return None, "لا وجود لها في كتالوج المزوّد"
    if kupur:
        return None, f"الكوبون {kupur} غير موجود لدى المزوّد"
    if len(same_id) > 1:
        return None, f"أكثر من باقة بالرقم {pid} — حدّد الكوبون في «ربط الباقات»"
    return same_id[0], ""


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
