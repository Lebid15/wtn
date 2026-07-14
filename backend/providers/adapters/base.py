"""إطار محوّلات المزوّدين: نتيجة موحّدة + واجهة أساسية."""
from dataclasses import dataclass, field
from decimal import Decimal
from typing import Optional


@dataclass
class ExecutionResult:
    """نتيجة موحّدة لتنفيذ طلب لدى مزوّد (تُطبّق على الطلب المحلي)."""
    # الحالة المُطبّقة على الطلب: success | processing | failed
    status: str
    pin: str = ""
    note: str = ""
    external_ref: str = ""            # المرجع لدى المزوّد (للتعقّب لاحقاً)
    cost: Optional[Decimal] = None    # التكلفة الفعلية إن أعادها المزوّد
    raw: str = ""                     # الاستجابة الخام (للتدقيق)

    @property
    def ok(self) -> bool:
        return self.status == "success"


@dataclass
class BalanceResult:
    """نتيجة استعلام الرصيد لدى مزوّد."""
    ok: bool
    balance: Optional[Decimal] = None   # الرصيد الفعلي لدى المزوّد
    debt: Optional[Decimal] = None      # الدين (إن أعاده المزوّد)
    note: str = ""
    raw: str = ""


class BaseAdapter:
    """واجهة المحوّل: كل مزوّد ينفّذ place_order ويُعيد ExecutionResult."""

    code = "base"

    def place_order(self, order, config: dict, provider=None, depth: int = 0) -> ExecutionResult:  # pragma: no cover
        raise NotImplementedError

    def get_balance(self, config: dict, provider=None) -> BalanceResult:
        """جلب الرصيد الفعلي — المحوّلات الداعمة تعيد تعريفه."""
        return BalanceResult(ok=False, note="هذا النوع لا يدعم جلب الرصيد آلياً")

    # أدوات مشتركة لتحليل الاستجابات التركية (pipe-separated)
    @staticmethod
    def split_pipe(text: str) -> list:
        return [p.strip() for p in (text or "").strip().split("|")]
