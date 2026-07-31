"""
العملات: عملة الدفتر واحدة لكل متجر، وعملة العرض تخصّ كل وكيل.

المبدأ: **كل رقم محفوظ في قاعدة البيانات بعملة الموقع** (Tenant.base_currency).
عملة عرض الوكيل تحويلٌ عند الخروج والدخول فقط، فلا يختلط الدفتر بعملتين
ولا يصير عكس أي قرار (إلغاء طلب، إبطال إيداع) رهينةَ سعر صرف يوم آخر.

اصطلاح سعر الصرف: exchange_rates[CUR] = كم وحدةً من عملة الموقع تساوي
وحدةً واحدة من CUR. فالتحويل من عملة الموقع إلى عملة العرض قسمةٌ عليه.
"""
from decimal import Decimal, InvalidOperation

CENT = Decimal("0.01")
DEFAULT_BASE = "TRY"


def base_currency(tenant) -> str:
    return (getattr(tenant, "base_currency", "") or DEFAULT_BASE) if tenant else DEFAULT_BASE


def rate_of(tenant, currency: str) -> Decimal:
    """كم وحدةً من عملة الموقع تساوي وحدةً من `currency`. صفر = بلا سعر مضبوط."""
    base = base_currency(tenant)
    if not currency or currency == base:
        return Decimal("1")
    try:
        r = Decimal(str((getattr(tenant, "exchange_rates", None) or {}).get(currency, "0")))
    except (InvalidOperation, TypeError):
        return Decimal("0")
    return r if r > 0 else Decimal("0")


def display_currency(user) -> str:
    """عملة عرض المستخدم — فارغة تعني عملة الموقع."""
    tenant = getattr(user, "tenant", None)
    chosen = getattr(user, "display_currency", "") or ""
    if not chosen or chosen == base_currency(tenant):
        return base_currency(tenant)
    # عملة بلا سعر صرف مضبوط لا يجوز العرض بها — نرجع لعملة الموقع
    return chosen if rate_of(tenant, chosen) > 0 else base_currency(tenant)


def display_rate(user) -> Decimal:
    return rate_of(getattr(user, "tenant", None), display_currency(user)) or Decimal("1")


def to_display(user, amount) -> Decimal:
    """من عملة الدفتر إلى عملة عرض المستخدم."""
    if amount is None:
        return None
    return (Decimal(str(amount)) / display_rate(user)).quantize(CENT)


def from_display(user, amount) -> Decimal:
    """من عملة عرض المستخدم إلى عملة الدفتر — لكل رقم يكتبه المستخدم."""
    if amount is None:
        return None
    return (Decimal(str(amount)) * display_rate(user)).quantize(CENT)


def convert_keys(row: dict, keys, user) -> dict:
    """يحوّل مفاتيح مبالغ في قاموس ناتج عن serializer إلى عملة العرض."""
    for k in keys:
        v = row.get(k)
        if v is None or v == "":
            continue
        try:
            row[k] = str(to_display(user, v))
        except (InvalidOperation, TypeError):
            pass
    return row
