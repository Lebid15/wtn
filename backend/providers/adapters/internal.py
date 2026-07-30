"""محوّل داخلي: التسليم الفوري من بنك البينات (Havuz) — لا اتصال خارجي."""
from decimal import Decimal

from django.db import transaction

from .base import BalanceResult, BaseAdapter, ExecutionResult, PackageList


class InternalPoolAdapter(BaseAdapter):
    """يسحب بيناً متاحاً من مجموعة مرتبطة بالمزوّد ويسلّمه فوراً."""

    code = "internal"

    def list_packages(self, config: dict, provider=None) -> PackageList:
        """كتالوج بنك البينات: مجموعات البينات المرتبطة بهذا المزوّد + المتاح فيها."""
        from pool.models import Pin, PinPool

        pools = PinPool.objects.filter(status=PinPool.Status.ACTIVE)
        if provider is not None:
            pools = pools.filter(provider=provider)
        packages = []
        for pool in pools.order_by("id"):
            available = Pin.objects.filter(pool=pool, status=Pin.Status.AVAILABLE).count()
            packages.append({
                "id": str(pool.id), "name": pool.name, "game": "بنك الأكواد",
                "kupur": "", "price": "", "available_count": available,
            })
        if not packages:
            return PackageList(ok=False, note="لا مجموعات بينات مرتبطة بهذا المزوّد")
        return PackageList(ok=True, packages=packages)

    def place_order(self, order, config: dict, provider=None, depth: int = 0) -> ExecutionResult:
        from pool.models import Pin, PinPool

        pools = PinPool.objects.filter(
            tenant=order.tenant, status=PinPool.Status.ACTIVE
        )
        if provider:
            pools = pools.filter(provider=provider)

        with transaction.atomic():
            pin = (
                Pin.objects.select_for_update(skip_locked=True)
                .filter(tenant=order.tenant, pool__in=pools, status=Pin.Status.AVAILABLE)
                .order_by("id")
                .first()
            )
            if pin is None:
                return ExecutionResult(
                    status="failed", note="لا يوجد بين متاح في بنك البينات",
                )
            pin.status = Pin.Status.DELIVERED
            pin.save(update_fields=["status"])

        return ExecutionResult(
            status="success", pin=pin.code, cost=pin.cost,
            note="تسليم فوري من بنك البينات", external_ref=f"pool:{pin.id}",
        )

    def get_balance(self, config: dict, provider=None) -> BalanceResult:
        """قيمة المخزون: مجموع تكلفة البينات المتاحة في مجموعات هذا المزوّد."""
        from django.db.models import Count, Sum
        from pool.models import Pin

        if provider is None:
            return BalanceResult(ok=False, note="مزوّد غير محدّد")
        agg = Pin.objects.filter(
            pool__provider=provider, status=Pin.Status.AVAILABLE
        ).aggregate(total=Sum("cost"), n=Count("id"))
        return BalanceResult(
            ok=True, balance=agg["total"] or Decimal("0"), debt=Decimal("0"),
            note=f"{agg['n'] or 0} بين متاح",
        )
