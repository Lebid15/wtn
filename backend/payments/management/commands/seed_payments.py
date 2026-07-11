"""تعبئة حسابات استلام + إشعارات دفع تجريبية."""
from decimal import Decimal

from django.core.management.base import BaseCommand

from core.models import Tenant, User
from payments.models import PaymentNotification, ReceivingAccount

ACCOUNTS = [
    (ReceivingAccount.Method.SHAM_CASH, "شام كاش - الحساب الرئيسي", "0955xxxxxx", Decimal("120000")),
    (ReceivingAccount.Method.MTN_CASH, "MTN كاش", "094xxxxxxx", Decimal("85000")),
    (ReceivingAccount.Method.SYRIATEL_CASH, "سيرياتيل كاش", "098xxxxxxx", Decimal("64000")),
    (ReceivingAccount.Method.BANK, "بنك بيمو - تحويل", "SY00-xxxx", Decimal("240000")),
]


class Command(BaseCommand):
    help = "تعبئة حسابات استلام وإشعارات دفع"

    def handle(self, *args, **options):
        tenant = Tenant.objects.filter(subdomain="alaya").first()
        if not tenant:
            self.stderr.write("شغّل seed_demo أولاً.")
            return
        for order, (method, title, no, bal) in enumerate(ACCOUNTS):
            ReceivingAccount.objects.get_or_create(
                tenant=tenant, title=title,
                defaults=dict(method=method, account_no=no, balance=bal, sort_order=order),
            )
        acc = ReceivingAccount.objects.filter(tenant=tenant).first()
        dealers = list(User.objects.filter(tenant=tenant, role=User.Role.BAYI)[:3])
        if not PaymentNotification.objects.filter(tenant=tenant).exists():
            for i, d in enumerate(dealers):
                PaymentNotification.objects.create(
                    tenant=tenant, dealer=d, account=acc,
                    amount=Decimal("5000") * (i + 1), note="تحويل عبر شام كاش",
                )
        self.stdout.write(self.style.SUCCESS(
            f"الحسابات: {ReceivingAccount.objects.filter(tenant=tenant).count()} · "
            f"إشعارات معلّقة: {PaymentNotification.objects.filter(tenant=tenant, status='pending').count()}"
        ))
