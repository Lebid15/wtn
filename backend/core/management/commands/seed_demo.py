"""تعبئة بيانات تجريبية للقلب: مستأجر + أدمن + وكلاء بمحافظ."""
from decimal import Decimal

from django.core.management.base import BaseCommand

from core.models import Tenant, User, Wallet, WalletTransaction


DEMO_DEALERS = [
    # (login_id, name, balance, credit_limit, group)
    ("bayi001", "متجر النور للاتصالات", Decimal("13.57"), Decimal("-500"), "5"),
    ("bayi002", "الشحن السريع", Decimal("-2636.36"), Decimal("-5000"), "4"),
    ("bayi003", "abd shop", Decimal("10912.15"), Decimal("0"), "1"),
    ("bayi004", "aboomarmobile", Decimal("-0.15"), Decimal("-8000"), "6"),
    ("bayi005", "متجر علايا", Decimal("-1833.09"), Decimal("-5000"), "15"),
    ("bayi006", "الوسيط ماركت", Decimal("2849.84"), Decimal("0"), "4"),
    ("bayi007", "نجمة الشام", Decimal("0.00"), Decimal("0"), "1"),
    ("bayi008", "كنج ستور", Decimal("117.79"), Decimal("0"), "5"),
]


class Command(BaseCommand):
    help = "تعبئة بيانات تجريبية (مستأجر + أدمن + وكلاء)"

    def handle(self, *args, **options):
        tenant, created = Tenant.objects.get_or_create(
            subdomain="alaya",
            defaults=dict(name="متجر علايا", status=Tenant.Status.ACTIVE, theme="teal"),
        )
        self.stdout.write(f"{'أُنشئ' if created else 'موجود'} المستأجر: {tenant}")

        # أدمن المستأجر
        admin, created = User.objects.get_or_create(
            login_id="5550000007",
            defaults=dict(
                tenant=tenant, role=User.Role.TENANT_ADMIN, name="مدير النظام",
                status=User.Status.ACTIVE, is_staff=True,
            ),
        )
        if created:
            admin.set_password("admin123")
            admin.save()
            Wallet.objects.create(tenant=tenant, user=admin, balance=Decimal("0"))
        self.stdout.write(f"أدمن: {admin.login_id} / admin123")

        # الوكلاء
        for login_id, name, balance, limit, group in DEMO_DEALERS:
            user, created = User.objects.get_or_create(
                login_id=login_id,
                defaults=dict(
                    tenant=tenant, role=User.Role.BAYI, name=name,
                    status=User.Status.ACTIVE, modules={"oyun": True, "group": group},
                ),
            )
            if created:
                user.set_password("bayi123")
                user.save()
                wallet = Wallet.objects.create(
                    tenant=tenant, user=user, balance=balance, credit_limit=limit
                )
                if balance != 0:
                    WalletTransaction.objects.create(
                        tenant=tenant, wallet=wallet,
                        type=WalletTransaction.Type.TOPUP if balance > 0
                        else WalletTransaction.Type.ORDER_DEBIT,
                        amount=balance, balance_before=Decimal("0"), balance_after=balance,
                        note="رصيد افتتاحي تجريبي",
                    )
        self.stdout.write(self.style.SUCCESS(f"تم إنشاء {len(DEMO_DEALERS)} وكلاء."))

        # الوكيل الكبير (ana_bayi) + دكان تابع له — لعرض لوحة /bigagent
        big, created = User.objects.get_or_create(
            login_id="5552222222",
            defaults=dict(
                tenant=tenant, role=User.Role.ANA_BAYI, name="الوكيل الكبير",
                status=User.Status.ACTIVE, modules={"oyun": True},
            ),
        )
        if created:
            big.set_password("big123")
            big.save()
            Wallet.objects.create(tenant=tenant, user=big, balance=Decimal("5000"))
        self.stdout.write(f"وكيل كبير: {big.login_id} / big123")

        shop, created = User.objects.get_or_create(
            login_id="7770000001",
            defaults=dict(
                tenant=tenant, role=User.Role.BAYI, parent=big, name="دكان سمير",
                status=User.Status.ACTIVE, modules={"oyun": True},
            ),
        )
        if created:
            shop.set_password("shop123")
            shop.save()
            Wallet.objects.create(tenant=tenant, user=shop, balance=Decimal("1000"))
        elif shop.parent_id != big.id:
            shop.parent = big
            shop.save(update_fields=["parent"])
        self.stdout.write(f"دكان تحت الوكيل الكبير: {shop.login_id} / shop123")
