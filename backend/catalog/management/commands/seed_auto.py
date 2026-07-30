"""بذرة توضيحية للتنفيذ التلقائي: ربط منتج ببنك بينات آلي مع بينات جاهزة."""
from decimal import Decimal

from django.core.management.base import BaseCommand

from core.models import Tenant
from catalog.models import Product
from providers.models import Provider
from pool.models import Pin, PinPool


class Command(BaseCommand):
    help = "ربط منتج بمزوّد بنك بينات آلي (تنفيذ تلقائي فوري) — للعرض"

    def handle(self, *args, **options):
        tenant = Tenant.objects.filter(subdomain="alaya").first()
        if not tenant:
            self.stderr.write("شغّل seed_demo أولاً.")
            return

        provider, _ = Provider.objects.get_or_create(
            tenant=tenant, name="بنك البينات الآلي", type=Provider.Type.POOL,
            defaults=dict(config={"code": "internal"}),
        )
        pool, _ = PinPool.objects.get_or_create(
            tenant=tenant, name="بينات التسليم الفوري", provider=provider,
        )
        # ضمان توفّر بينات جاهزة (حتى 10)
        have = Pin.objects.filter(pool=pool, status=Pin.Status.AVAILABLE).count()
        for i in range(have, 10):
            Pin.objects.create(
                tenant=tenant, pool=pool, code=f"AUTO-PIN-{i:04d}", cost=Decimal("1.00")
            )

        # اربط أول منتج بالمزوّد واجعله تلقائياً — للعرض على قاعدة جديدة فقط.
        # هذا الأمر يعمل في كل نشر (start.sh)، فلا يجوز أن يدهس توجيهاً ضبطه
        # صاحب المتجر يدوياً: أي منتج له مزوّد أو رقم ربط يُترك كما هو.
        product = Product.objects.filter(tenant=tenant).order_by("game__sort_order", "sort_order").first()
        if not product:
            return
        if product.provider_id or product.provider_alt1_id or product.provider_alt2_id \
                or product.provider_package_id:
            self.stdout.write(
                f"تخطّي بذرة التنفيذ التلقائي: '{product.game.name} — {product.name}' "
                f"مضبوط مسبقاً (لا ندهس إعداد المستخدم)"
            )
            return

        product.provider = provider
        product.execution_type = Product.Execution.AUTO
        product.provider_package_id = "auto-demo"
        product.save(update_fields=["provider", "execution_type", "provider_package_id"])
        self.stdout.write(self.style.SUCCESS(
            f"التنفيذ التلقائي: '{product.game.name} — {product.name}' ← {provider.name} "
            f"({Pin.objects.filter(pool=pool, status='available').count()} بين جاهز)"
        ))
