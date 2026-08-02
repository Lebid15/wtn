"""
بناء نصّ الرسالة من قالب المتجر.

**القاعدة الأهمّ هنا:** الرصيد يُبنى **بعملة عرض الوكيل** لا بعملة الدفتر.
دفترنا بالدولار، لكن وكيلاً عملته الليرة يرى في لوحته «-20,500 ل.ت» — فلو
أرسلنا له الرقم كما هو في القاعدة (-500) لقرأ في واتساب رقماً لا يطابق ما
يراه في حسابه، ونحن نطالبه بالدفع. رقمان لدَينٍ واحد = شكوى مضمونة.
"""
from decimal import Decimal

from core import currency as cur
from payments.models import CURRENCIES

CURRENCY_LABELS = dict(CURRENCIES)
CURRENCY_SYMBOLS = {
    "TRY": "₺", "USD": "$", "SYP": "ل.س", "EUR": "€",
    "SAR": "﷼", "AED": "د.إ", "EGP": "ج.م",
}

# العناصر النائبة — بالعربية ومعها مرادف إنجليزي لمن يفضّله.
PLACEHOLDERS = [
    ("{الاسم}", "{name}", "اسم الوكيل"),
    ("{الرقم}", "{login}", "رقم دخول الوكيل"),
    ("{الرصيد}", "{balance}", "الرصيد موقّعاً (سالب = دَين)"),
    ("{الدين}", "{debt}", "قيمة الدَّين موجبةً (صفر إن لم يكن مديناً)"),
    ("{العملة}", "{currency}", "اسم عملة الوكيل — «ليرة تركية»"),
    ("{الرمز}", "{symbol}", "رمز العملة — ₺"),
    ("{المتجر}", "{store}", "اسم المتجر"),
]


def fmt(amount: Decimal) -> str:
    """رقم مقروء في رسالة: فواصل آلاف، وبلا كسور إن كانت صفراً."""
    q = Decimal(amount).quantize(Decimal("0.01"))
    whole = q == q.to_integral_value()
    return f"{q:,.0f}" if whole else f"{q:,.2f}"


def context_for(dealer) -> dict:
    """قيم العناصر النائبة لوكيل واحد — كلّها بعملة عرضه."""
    wallet = getattr(dealer, "wallet", None)
    balance = cur.to_display(dealer, wallet.balance if wallet else Decimal("0"))
    code = cur.display_currency(dealer)
    tenant = getattr(dealer, "tenant", None)
    return {
        "{الاسم}": dealer.name, "{name}": dealer.name,
        "{الرقم}": dealer.login_id, "{login}": dealer.login_id,
        "{الرصيد}": fmt(balance), "{balance}": fmt(balance),
        "{الدين}": fmt(-balance if balance < 0 else Decimal("0")),
        "{debt}": fmt(-balance if balance < 0 else Decimal("0")),
        "{العملة}": CURRENCY_LABELS.get(code, code), "{currency}": CURRENCY_LABELS.get(code, code),
        "{الرمز}": CURRENCY_SYMBOLS.get(code, code), "{symbol}": CURRENCY_SYMBOLS.get(code, code),
        "{المتجر}": (tenant.name if tenant else ""), "{store}": (tenant.name if tenant else ""),
    }


def render(template: str, dealer) -> str:
    """يحقن قيم الوكيل في القالب. ما لا يُعرف من العناصر يبقى كما كُتب."""
    text = template or ""
    for token, value in context_for(dealer).items():
        text = text.replace(token, str(value))
    return text.strip()
