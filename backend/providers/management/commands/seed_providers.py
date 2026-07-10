"""تعبئة مزوّدين تجريبيين."""
from decimal import Decimal

from django.core.management.base import BaseCommand

from core.models import Tenant
from providers.models import Provider

DEMO = [
    # (name, type, real_balance, balance, status)
    ("مزوّد بطاقات أول", Provider.Type.CARD_STORE, Decimal("9455.31"), Decimal("9455.31"), "active"),
    ("مزوّد بطاقات ثانٍ", Provider.Type.CARD_STORE, Decimal("2478.68"), Decimal("2478.68"), "active"),
    ("نظام شريك", Provider.Type.SAME_SYSTEM, Decimal("19020.38"), Decimal("19020.38"), "active"),
    ("بنك البينات الداخلي", Provider.Type.POOL, Decimal("0"), Decimal("0"), "active"),
    ("المنفّذ اليدوي", Provider.Type.LOADER, Decimal("0"), Decimal("0"), "active"),
]


class Command(BaseCommand):
    help = "تعبئة مزوّدين تجريبيين"

    def handle(self, *args, **options):
        tenant = Tenant.objects.filter(subdomain="alaya").first()
        if not tenant:
            self.stderr.write("شغّل seed_demo أولاً.")
            return
        for order, (name, ptype, real, bal, status) in enumerate(DEMO):
            Provider.objects.get_or_create(
                tenant=tenant, name=name,
                defaults=dict(type=ptype, real_balance=real, balance=bal,
                              status=status, sort_order=order),
            )
        self.stdout.write(self.style.SUCCESS(
            f"المزوّدون: {Provider.objects.filter(tenant=tenant).count()}"
        ))
