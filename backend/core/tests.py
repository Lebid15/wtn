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


class DealerListTest(APITestCase):
    """
    قائمة الوكلاء بعد إعادة تشكيلها: رقم تسلسلي، وتعطيل بنقرة، وإعدادات
    انتقلت إليها من صفحة «أسعار الوكلاء» المحذوفة.
    """

    def setUp(self):
        from catalog.models import PriceGroup

        self.tenant = Tenant.objects.create(subdomain="t9", name="متجر", base_currency="USD")
        self.admin = User.objects.create(
            login_id="admin9", name="صاحب المتجر", tenant=self.tenant,
            role=User.Role.TENANT_ADMIN,
        )
        self.client.force_authenticate(user=self.admin)
        self.group = PriceGroup.objects.create(tenant=self.tenant, name="1")

        self.big = User.objects.create(
            login_id="big9", name="وكيل كبير", tenant=self.tenant,
            role=User.Role.ANA_BAYI, dealer_no=1,
        )
        Wallet.objects.create(tenant=self.tenant, user=self.big, balance=Decimal("100"))
        self.dealer = User.objects.create(
            login_id="bayi9", name="دكان", tenant=self.tenant,
            role=User.Role.BAYI, parent=self.big, dealer_no=2,
        )
        Wallet.objects.create(tenant=self.tenant, user=self.dealer, balance=Decimal("-25"))

    def _list(self):
        r = self.client.get("/api/dealers/")
        self.assertEqual(r.status_code, 200, r.content)
        return r.json()["results"]

    def test_list_carries_the_sequential_number(self):
        self.assertEqual([d["dealer_no"] for d in self._list()], [1])

    def test_new_dealer_gets_the_next_number(self):
        r = self.client.post(
            "/api/dealers/",
            {"login_id": "bayi10", "name": "دكان ثانٍ", "password": "pass123"},
            format="json",
        )
        self.assertEqual(r.status_code, 201, r.content)
        self.assertEqual(User.objects.get(login_id="bayi10").dealer_no, 3)

    def test_toggling_status_disables_and_re_enables(self):
        url = f"/api/dealers/{self.big.id}/settings/"
        self.assertEqual(self.client.post(url, {"status": "passive"}, format="json").status_code, 200)
        self.big.refresh_from_db()
        self.assertEqual(self.big.status, User.Status.PASSIVE)
        self.assertFalse(self._list()[0]["active"])   # يبقى في الردّ، والواجهة تُخفيه

        self.client.post(url, {"status": "active"}, format="json")
        self.big.refresh_from_db()
        self.assertEqual(self.big.status, User.Status.ACTIVE)

    def test_settings_carry_and_save_group_and_load_limit(self):
        url = f"/api/dealers/{self.dealer.id}/settings/"
        row = self.client.get(url).json()
        self.assertEqual(row["price_group"], None)
        self.assertEqual([g["id"] for g in row["price_groups"]], [self.group.id])

        r = self.client.post(
            url, {"price_group": self.group.id, "oyun_load_limit": "25000"}, format="json",
        )
        self.assertEqual(r.status_code, 200, r.content)
        self.dealer.refresh_from_db()
        self.assertEqual(self.dealer.price_group_id, self.group.id)
        self.assertEqual(self.dealer.oyun_load_limit, Decimal("25000"))

    def test_unknown_price_group_is_refused(self):
        r = self.client.post(
            f"/api/dealers/{self.dealer.id}/settings/", {"price_group": 9999}, format="json",
        )
        self.assertEqual(r.status_code, 404)

    def test_sub_dealer_is_nested_under_its_big_agent(self):
        """الدكان التابع لا يقف صفّاً مستقلاً — مكانه داخل صفّ وكيله."""
        rows = self._list()
        self.assertEqual([r["name"] for r in rows], ["وكيل كبير"])
        big = rows[0]
        self.assertTrue(big["is_big"])
        self.assertEqual(big["children_count"], 1)
        self.assertEqual([c["name"] for c in big["children"]], ["دكان"])

    def test_independent_dealer_stands_on_its_own_row(self):
        solo = User.objects.create(
            login_id="solo9", name="دكان مستقلّ", tenant=self.tenant,
            role=User.Role.BAYI, dealer_no=3,
        )
        Wallet.objects.create(tenant=self.tenant, user=solo)
        names = [r["name"] for r in self._list()]
        self.assertIn("دكان مستقلّ", names)
        self.assertNotIn("دكان", names)   # التابع يبقى مطويّاً تحت وكيله

    def test_promoting_a_dealer_to_big_agent(self):
        solo = User.objects.create(
            login_id="solo10", name="مرشّح", tenant=self.tenant,
            role=User.Role.BAYI, parent=self.big, dealer_no=4,
        )
        r = self.client.post(
            f"/api/dealers/{solo.id}/settings/", {"role": "ana_bayi"}, format="json",
        )
        self.assertEqual(r.status_code, 200, r.content)
        solo.refresh_from_db()
        self.assertEqual(solo.role, User.Role.ANA_BAYI)
        self.assertIsNone(solo.parent_id)   # الكبير لا يتبع أحداً

    def test_big_agent_with_shops_cannot_be_demoted(self):
        r = self.client.post(
            f"/api/dealers/{self.big.id}/settings/", {"role": "bayi"}, format="json",
        )
        self.assertEqual(r.status_code, 400)
        self.big.refresh_from_db()
        self.assertEqual(self.big.role, User.Role.ANA_BAYI)

    def test_attaching_a_dealer_to_a_big_agent(self):
        solo = User.objects.create(
            login_id="solo11", name="دكان حرّ", tenant=self.tenant,
            role=User.Role.BAYI, dealer_no=5,
        )
        r = self.client.post(
            f"/api/dealers/{solo.id}/settings/", {"parent": self.big.id}, format="json",
        )
        self.assertEqual(r.status_code, 200, r.content)
        solo.refresh_from_db()
        self.assertEqual(solo.parent_id, self.big.id)
        self.assertNotIn("دكان حرّ", [x["name"] for x in self._list()])

    def test_a_big_agent_cannot_follow_another(self):
        other = User.objects.create(
            login_id="big10", name="كبير آخر", tenant=self.tenant,
            role=User.Role.ANA_BAYI, dealer_no=6,
        )
        r = self.client.post(
            f"/api/dealers/{other.id}/settings/", {"parent": self.big.id}, format="json",
        )
        self.assertEqual(r.status_code, 400)

    def test_creating_a_big_agent_with_a_follower(self):
        r = self.client.post(
            "/api/dealers/",
            {"login_id": "ahmad9", "name": "أحمد العلي", "password": "pass123",
             "role": "ana_bayi"},
            format="json",
        )
        self.assertEqual(r.status_code, 201, r.content)
        ahmad_id = r.json()["id"]
        r2 = self.client.post(
            "/api/dealers/",
            {"login_id": "shop9", "name": "محل النور", "password": "pass123",
             "parent": ahmad_id},
            format="json",
        )
        self.assertEqual(r2.status_code, 201, r2.content)
        row = next(x for x in self._list() if x["id"] == ahmad_id)
        self.assertEqual([c["name"] for c in row["children"]], ["محل النور"])

    def test_removed_dealer_prices_endpoints_are_gone(self):
        self.assertEqual(self.client.get("/api/catalog/dealer-prices/").status_code, 404)
