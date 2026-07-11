"""تعبئة كتالوج تجريبي: ألعاب + منتجات + مجموعات أسعار."""
from decimal import Decimal

from django.core.management.base import BaseCommand

from core.models import Tenant
from catalog.models import Game, PriceGroup, Product


# (اسم اللعبة، يتطلّب معرّف لاعب، [(اسم المنتج، تكلفة، سعر موصى)])
DEMO_CATALOG = [
    ("PUBG Mobile", True, [
        ("60 UC", Decimal("28.00"), Decimal("32.00")),
        ("325 UC", Decimal("140.00"), Decimal("158.00")),
        ("660 UC", Decimal("278.00"), Decimal("312.00")),
        ("1800 UC", Decimal("690.00"), Decimal("760.00")),
    ]),
    ("Free Fire", True, [
        ("100 جوهرة", Decimal("22.00"), Decimal("26.00")),
        ("310 جوهرة", Decimal("66.00"), Decimal("76.00")),
        ("1060 جوهرة", Decimal("210.00"), Decimal("236.00")),
    ]),
    ("Likee", False, [
        ("500 عملة", Decimal("40.00"), Decimal("47.00")),
        ("2000 عملة", Decimal("150.00"), Decimal("170.00")),
    ]),
    ("Yalla Ludo", True, [
        ("عملات صغيرة", Decimal("18.00"), Decimal("22.00")),
        ("عملات كبيرة", Decimal("95.00"), Decimal("110.00")),
    ]),
    ("SoulChill", False, [
        ("باقة ماسات 100", Decimal("35.00"), Decimal("41.00")),
    ]),
]


class Command(BaseCommand):
    help = "تعبئة كتالوج تجريبي (ألعاب + منتجات)"

    def handle(self, *args, **options):
        tenant = Tenant.objects.filter(subdomain="alaya").first()
        if not tenant:
            self.stderr.write("شغّل seed_demo أولاً (لا يوجد مستأجر).")
            return

        # مجموعات أسعار افتراضية
        for name in ["1", "4", "5", "6", "15"]:
            PriceGroup.objects.get_or_create(tenant=tenant, name=name)

        for order, (game_name, needs_id, products) in enumerate(DEMO_CATALOG):
            game, _ = Game.objects.get_or_create(
                tenant=tenant, name=game_name,
                defaults=dict(require_player_id=needs_id, sort_order=order,
                              status=Game.Status.ACTIVE),
            )
            for p_order, (pname, cost, rec) in enumerate(products):
                Product.objects.get_or_create(
                    tenant=tenant, game=game, name=pname,
                    defaults=dict(cost_price=cost, recommended_price=rec,
                                  sort_order=p_order, execution_type=Product.Execution.AUTO),
                )
        total_p = Product.objects.filter(tenant=tenant).count()
        self.stdout.write(self.style.SUCCESS(
            f"الكتالوج: {Game.objects.filter(tenant=tenant).count()} ألعاب، {total_p} منتج."
        ))
