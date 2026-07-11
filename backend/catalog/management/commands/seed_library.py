"""بذرة المكتبة العالمية: ألعاب عالمية جاهزة مع باقاتها (يديرها مالك المنصّة)."""
from decimal import Decimal

from django.core.management.base import BaseCommand

from catalog.models import LibraryGame, LibraryProduct


# (اسم اللعبة, رابط الصورة, require_player_id, [(اسم الباقة, تكلفة, سعر مقترح, كوبور)])
LIBRARY = [
    ("PUBG Mobile UC", "", True, [
        ("60 UC", Decimal("0.85"), Decimal("1.00"), "60"),
        ("325 UC", Decimal("4.20"), Decimal("4.90"), "325"),
        ("660 UC", Decimal("8.30"), Decimal("9.60"), "660"),
        ("1800 UC", Decimal("21.00"), Decimal("24.00"), "1800"),
    ]),
    ("Free Fire Diamonds", "", True, [
        ("100 جوهرة", Decimal("0.90"), Decimal("1.05"), "100"),
        ("310 جوهرة", Decimal("2.70"), Decimal("3.20"), "310"),
        ("520 جوهرة", Decimal("4.40"), Decimal("5.10"), "520"),
    ]),
    ("Yalla Ludo Gold", "", False, [
        ("عملات صغيرة", Decimal("1.00"), Decimal("1.20"), ""),
        ("عملات كبيرة", Decimal("5.00"), Decimal("5.80"), ""),
    ]),
    ("Jawaker Tokens", "", False, [
        ("10K توكن", Decimal("1.80"), Decimal("2.10"), "10000"),
        ("50K توكن", Decimal("8.50"), Decimal("9.80"), "50000"),
    ]),
]


class Command(BaseCommand):
    help = "تعبئة المكتبة العالمية بألعاب وباقات جاهزة"

    def handle(self, *args, **options):
        for order, (name, img, needs_id, packages) in enumerate(LIBRARY):
            game, created = LibraryGame.objects.get_or_create(
                name=name,
                defaults=dict(
                    image_url=img, require_player_id=needs_id,
                    sort_order=order, is_active=True,
                ),
            )
            if not created:
                continue
            for i, (pname, cost, price, kupur) in enumerate(packages):
                LibraryProduct.objects.create(
                    game=game, name=pname, suggested_cost=cost,
                    suggested_price=price, kupur=kupur, sort_order=i,
                )
            self.stdout.write(f"مكتبة: {name} ({len(packages)} باقات)")
        self.stdout.write(self.style.SUCCESS("اكتملت بذرة المكتبة العالمية."))
