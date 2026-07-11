"""تعبئة مجموعات بينات تجريبية مع بعض البينات."""
from decimal import Decimal

from django.core.management.base import BaseCommand

from core.models import Tenant
from providers.models import Provider
from pool.models import Pin, PinPool

DEMO = [
    ("جوجل بلاي 25 ل.ت", "بطاقات جوجل بلاي فئة 25", 3, Decimal("22.00")),
    ("جوجل بلاي 50 ل.ت", "بطاقات جوجل بلاي فئة 50", 2, Decimal("44.00")),
    ("جوجل بلاي 100 ل.ت", "بطاقات جوجل بلاي فئة 100", 0, Decimal("0")),
    ("بطاقات آيتونز", "بطاقات آيتونز متنوّعة", 5, Decimal("30.00")),
]


class Command(BaseCommand):
    help = "تعبئة مجموعات بينات تجريبية"

    def handle(self, *args, **options):
        tenant = Tenant.objects.filter(subdomain="alaya").first()
        if not tenant:
            self.stderr.write("شغّل seed_demo أولاً.")
            return
        provider = Provider.objects.filter(tenant=tenant, type=Provider.Type.POOL).first()
        for name, desc, count, cost in DEMO:
            pool, created = PinPool.objects.get_or_create(
                tenant=tenant, name=name,
                defaults=dict(description=desc, provider=provider),
            )
            if created:
                for i in range(count):
                    Pin.objects.create(
                        tenant=tenant, pool=pool, code=f"CODE-{name[:4]}-{i:04d}", cost=cost
                    )
        self.stdout.write(self.style.SUCCESS(
            f"البينات: {PinPool.objects.filter(tenant=tenant).count()} مجموعات، "
            f"{Pin.objects.filter(tenant=tenant).count()} بين."
        ))
