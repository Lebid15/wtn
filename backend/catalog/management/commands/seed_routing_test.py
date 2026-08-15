"""بيئة اختبار التوجيه (realtest.md): متجر مورّد داخلي + بنك فارغ — idempotent."""
from decimal import Decimal

from django.core.management.base import BaseCommand

from core.models import Tenant, User, Wallet
from catalog.models import Game, Product
from providers.models import Provider
from pool.models import Pin, PinPool


class Command(BaseCommand):
    help = "تجهيز بيئة اختبار التوجيه: متجر مورّد + مزوّد داخلي + بنك فارغ"

    def handle(self, *args, **options):
        A = Tenant.objects.filter(subdomain="alaya").first()
        if not A:
            self.stderr.write("شغّل seed_demo أولاً.")
            return

        # متجر المورّد (B) بمنتج وبنك بينات
        B, _ = Tenant.objects.get_or_create(
            subdomain="supplier", defaults=dict(name="متجر المورّد", status="active")
        )
        bg, _ = Game.objects.get_or_create(tenant=B, name="PUBG Mobile", defaults=dict(status="active"))
        bp, _ = Product.objects.get_or_create(
            tenant=B, game=bg, name="60 UC (مورّد)",
            defaults=dict(cost_price=Decimal("20"), recommended_price=Decimal("25"),
                          execution_type="auto"),
        )
        bpool_prov, _ = Provider.objects.get_or_create(
            tenant=B, name="بنك المورّد", type=Provider.Type.POOL
        )
        bpool, _ = PinPool.objects.get_or_create(tenant=B, name="بينات المورّد", provider=bpool_prov)
        have = Pin.objects.filter(pool=bpool, status=Pin.Status.AVAILABLE).count()
        for i in range(have, 10):
            Pin.objects.create(tenant=B, pool=bpool, code=f"SUPPLIER-PIN-{i:03d}", cost=Decimal("18"))
        if bp.provider_id != bpool_prov.id:
            bp.provider = bpool_prov
            bp.save(update_fields=["provider"])

        # حسابنا كوكيل لدى المورّد
        acc, created = User.objects.get_or_create(
            login_id="alaya_at_supplier",
            defaults=dict(tenant=B, role=User.Role.BAYI, name="متجر علايا (وكيل)", status="active",
                          internal_supply_allowed=True),
        )
        if created:
            acc.set_password("x12345")
            acc.save()
            Wallet.objects.create(tenant=B, user=acc, balance=Decimal("500"))
        else:
            # حسابات أُنشئت قبل حقل الإذن — بدونه يرفض المحوّل التوجيه
            if not acc.internal_supply_allowed:
                acc.internal_supply_allowed = True
                acc.save(update_fields=["internal_supply_allowed"])
            # جدّد الرصيد للتجارب
            w = getattr(acc, "wallet", None)
            if w and w.balance < 100:
                w.balance = Decimal("500")
                w.save(update_fields=["balance"])

        # مزوّدا متجرنا (أ): بنك فارغ (لإجبار الفشل) + متجر داخلي
        Provider.objects.get_or_create(tenant=A, name="بنك فارغ (للاختبار)", type=Provider.Type.POOL)
        empty = Provider.objects.get(tenant=A, name="بنك فارغ (للاختبار)")
        PinPool.objects.get_or_create(tenant=A, name="مجموعة فارغة", provider=empty)
        Provider.objects.get_or_create(
            tenant=A, name="متجر المورّد (داخلي)", type=Provider.Type.SAME_SYSTEM,
            defaults=dict(config={"dealer_login": "alaya_at_supplier"}),
        )

        self.stdout.write(self.style.SUCCESS(
            f"بيئة التوجيه جاهزة: منتج المورّد={bp.id} · بينات متاحة="
            f"{Pin.objects.filter(pool=bpool, status='available').count()} · رصيدنا لديه={acc.wallet.balance}"
        ))
