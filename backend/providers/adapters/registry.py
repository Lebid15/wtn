"""اختيار المحوّل المناسب لمزوّد حسب نوعه/كوده."""
from providers.models import Provider

from .barakat import BarakatAdapter
from .internal import InternalPoolAdapter
from .znet import ZnetAdapter


def adapter_for(provider: Provider):
    """يُعيد نسخة المحوّل المناسبة، أو None لو المزوّد يدوي/غير مدعوم آلياً."""
    if provider is None:
        return None

    # كود صريح في config يتقدّم على النوع
    code = (provider.config or {}).get("code", "").lower()
    by_code = {"znet": ZnetAdapter, "barakat": BarakatAdapter,
               "apstore": BarakatAdapter, "internal": InternalPoolAdapter}
    if code in by_code:
        return by_code[code]()

    by_type = {
        Provider.Type.POOL: InternalPoolAdapter,
        Provider.Type.SAME_SYSTEM: ZnetAdapter,
        Provider.Type.CARD_STORE: BarakatAdapter,
        # LOADER = تنفيذ يدوي → لا محوّل آلي
    }
    cls = by_type.get(provider.type)
    return cls() if cls else None
