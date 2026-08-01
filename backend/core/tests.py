"""اختبارات القلب."""
from django.test import TestCase

from .models import Tenant, User, Wallet


class LoginTest(TestCase):
    """حارس ضد تكرار عطل: حذف `_tokens_for` كسر تسجيل الدخول بخطأ 500."""

    def test_login_returns_tokens(self):
        tenant = Tenant.objects.create(subdomain="t1", name="متجر اختبار")
        user = User.objects.create(login_id="user001", name="مستخدم", tenant=tenant)
        user.set_password("pass123")
        user.save()
        Wallet.objects.create(tenant=tenant, user=user)

        r = self.client.post(
            "/api/auth/login/",
            {"login_id": "user001", "password": "pass123"},
            content_type="application/json",
        )
        self.assertEqual(r.status_code, 200, r.content[:500])
        self.assertIn("access", r.json()["tokens"])
        self.assertIn("refresh", r.json()["tokens"])
