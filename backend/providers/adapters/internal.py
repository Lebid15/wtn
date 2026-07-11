"""محوّل داخلي: التسليم الفوري من بنك البينات (Havuz) — لا اتصال خارجي."""
from django.db import transaction

from .base import BaseAdapter, ExecutionResult


class InternalPoolAdapter(BaseAdapter):
    """يسحب بيناً متاحاً من مجموعة مرتبطة بالمزوّد ويسلّمه فوراً."""

    code = "internal"

    def place_order(self, order, config: dict) -> ExecutionResult:
        from pool.models import Pin, PinPool

        provider = order.product.provider
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
