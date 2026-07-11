"""إنشاء مالك المنصّة (Platform Owner)."""
from django.core.management.base import BaseCommand

from core.models import User


class Command(BaseCommand):
    help = "إنشاء حساب مالك المنصّة"

    def handle(self, *args, **options):
        owner, created = User.objects.get_or_create(
            login_id="9990000000",
            defaults=dict(
                role=User.Role.PLATFORM_OWNER, name="مالك المنصّة",
                status=User.Status.ACTIVE, is_staff=True, is_superuser=True,
                tenant=None,
            ),
        )
        if created:
            owner.set_password("super123")
            owner.save()
        self.stdout.write(self.style.SUCCESS(
            f"مالك المنصّة: 9990000000 / super123 ({'أُنشئ' if created else 'موجود'})"
        ))
