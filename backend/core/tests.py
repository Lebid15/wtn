"""اختبارات القلب."""
from decimal import Decimal

from django.test import TestCase
from rest_framework.test import APITestCase

from catalog.models import Game, Product
from orders.models import Order
from providers.models import Provider

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


class HeaderAlertsTest(APITestCase):
    """
    شريط «ما ينتظر قرارك»: كل عدّاد يقيس ما **يحتاج تدخّلاً** لا ما هو موجود.
    الطلب الناجح والوكيل الموجب والمزوّد السليم لا تُعَدّ.
    """

    def setUp(self):
        self.tenant = Tenant.objects.create(subdomain="t", name="متجر")
        self.admin = User.objects.create(
            login_id="admin", name="مدير", tenant=self.tenant, role=User.Role.TENANT_ADMIN,
        )
        self.client.force_authenticate(user=self.admin)
        self.game = Game.objects.create(tenant=self.tenant, name="PUBG")
        self.product = Product.objects.create(tenant=self.tenant, game=self.game, name="60 UC")

    def test_quiet_store_reports_all_zero(self):
        r = self.client.get("/api/alerts/")
        self.assertEqual(r.status_code, 200, r.content)
        for key, value in r.json().items():
            self.assertEqual(value, 0, f"{key} يجب أن يكون صفراً في متجر هادئ")

    def test_counts_only_what_needs_a_decision(self):
        dealer = self._dealer("bayi1", Decimal("-50"))   # سالب ⇒ يُعَدّ
        self._dealer("bayi2", Decimal("100"))            # موجب ⇒ لا يُعَدّ
        self._order(dealer, Order.Status.PENDING)
        self._order(dealer, Order.Status.STUCK)
        self._order(dealer, Order.Status.SUCCESS)        # محسوم ⇒ لا يُعَدّ
        Provider.objects.create(
            tenant=self.tenant, name="معطّل", status=Provider.Status.PASSIVE)
        Provider.objects.create(
            tenant=self.tenant, name="سليم", status=Provider.Status.ACTIVE)

        d = self.client.get("/api/alerts/").json()

        self.assertEqual(d["dealers_negative"], 1)
        self.assertEqual(d["orders_pending"], 1)
        self.assertEqual(d["orders_stuck"], 1)
        self.assertEqual(d["providers"], 1)

    def test_provider_below_its_own_threshold_is_counted(self):
        """الحدّ يضبطه المالك لكل مزوّد — والمقارنة به هو لا برقم عامّ."""
        Provider.objects.create(
            tenant=self.tenant, name="منخفض", status=Provider.Status.ACTIVE,
            real_balance=Decimal("40"), balance_alert_threshold=Decimal("100"),
        )
        Provider.objects.create(
            tenant=self.tenant, name="كافٍ", status=Provider.Status.ACTIVE,
            real_balance=Decimal("400"), balance_alert_threshold=Decimal("100"),
        )
        Provider.objects.create(  # بلا حدّ مضبوط ⇒ لا إنذار مهما قلّ رصيده
            tenant=self.tenant, name="بلا حدّ", status=Provider.Status.ACTIVE,
            real_balance=Decimal("0"),
        )

        self.assertEqual(self.client.get("/api/alerts/").json()["providers"], 1)

    def _dealer(self, login_id, balance):
        u = User.objects.create(
            login_id=login_id, name=login_id, tenant=self.tenant, role=User.Role.BAYI,
        )
        Wallet.objects.create(tenant=self.tenant, user=u, balance=balance)
        return u

    def _order(self, dealer, status):
        return Order.objects.create(
            tenant=self.tenant, receipt_no=f"R{Order.objects.count() + 1}",
            dealer=dealer, game=self.game, product=self.product, status=status,
            cost_price=Decimal("1"), sell_price=Decimal("2"), profit=Decimal("1"),
        )
