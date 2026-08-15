"""
فتح قفل حساب من سطر الأوامر — مخرج الطوارئ.

القفل يفتحه من فوقك: صاحب المتجر لوكلائه، ومالك المنصّة لأصحاب المتاجر.
أمّا **مالك المنصّة نفسه فلا أحد فوقه** — فلو قُفل حسابه لأُغلقت المنصّة كلّها
بلا مفتاح. هذا الأمر هو المفتاح، ولا يُنال إلا بالوصول إلى الخادم.

    python manage.py unlock_user 9990000000 --password "كلمة سرّ جديدة"
"""
from django.core.management.base import BaseCommand

from core.models import User


class Command(BaseCommand):
    help = "فتح قفل حساب بعد محاولات دخول فاشلة (ومعه كلمة سرّ جديدة اختيارياً)"

    def add_arguments(self, parser):
        parser.add_argument("login_id")
        parser.add_argument(
            "--password",
            help="كلمة سرّ جديدة. اتركها لفتح القفل وحده — وهو أضعف: "
                 "الكلمة القديمة ثبت أن أحدهم يخمّنها.",
        )

    def handle(self, *args, **options):
        login_id = options["login_id"].strip()
        user = User.objects.filter(login_id=login_id).first()
        if user is None:
            self.stderr.write(f"لا حساب برقم الدخول '{login_id}'")
            return

        was_locked = user.is_locked
        password = options.get("password")
        if password:
            if len(password) < 5:
                self.stderr.write("كلمة السر قصيرة (5 أحرف على الأقل)")
                return
            user.set_password(password)
            user.save(update_fields=["password"])
        user.unlock()

        state = "كان مقفلاً وفُتح" if was_locked else "لم يكن مقفلاً — صُفّر العدّاد"
        pw = " · وكلمة السرّ الجديدة فعّالة" if password else ""
        self.stdout.write(self.style.SUCCESS(f"{user.name} ({login_id}): {state}{pw}"))
