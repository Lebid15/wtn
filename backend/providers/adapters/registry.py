"""اختيار المحوّل المناسب لمزوّد حسب نوعه/كوده."""
from providers.models import Provider

from .internal import InternalPoolAdapter
from .tenant import InternalTenantAdapter
from .zdk import ZdkAdapter
from .znet import ZnetAdapter


def adapter_for(provider: Provider):
    """يُعيد نسخة المحوّل المناسبة، أو None لو المزوّد يدوي/غير مدعوم آلياً."""
    if provider is None:
        return None

    # كود صريح في config يتقدّم على النوع
    code = (provider.config or {}).get("code", "").lower()
    # `barakat`/`apstore` متجران يعملان ببرمجية ZDK نفسها — يبقيان مقبولَين
    # للمزوّدين المُعدّين قبل التوحيد، والجديد يُحفظ بالكود `zdk`.
    by_code = {"znet": ZnetAdapter, "zdk": ZdkAdapter,
               "barakat": ZdkAdapter, "apstore": ZdkAdapter,
               "internal": InternalPoolAdapter,
               "tenant": InternalTenantAdapter}
    if code in by_code:
        return by_code[code]()

    by_type = {
        Provider.Type.POOL: InternalPoolAdapter,
        Provider.Type.SAME_SYSTEM: InternalTenantAdapter,  # متجر ← متجر داخل المنصّة
        Provider.Type.CARD_STORE: ZdkAdapter,
        # LOADER = تنفيذ يدوي → لا محوّل آلي
    }
    cls = by_type.get(provider.type)
    return cls() if cls else None
