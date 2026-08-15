"""
اختبارات المزوّد الداخلي («نفس النظام») — وحارسها الأول: **الإذن**.

رقم الدخول فريد عبر المنصّة كلّها وسهل التخمين (`bayi003`). فلولا إذنٌ صريح على
حساب الوكيل لاستطاع أيّ صاحب متجر أن يضيف مزوّداً داخلياً برقم دخول وكيلٍ ليس
له — ثم ينفق رصيده. الإذن يضعه صاحب المتجر المورّد بيده على الحساب الذي فتحه
لهذا الغرض وحده.
"""
from decimal import Decimal

from django.test import TestCase

from catalog.models import Game, Product
from core.models import Tenant, User, Wallet
from orders.models import Order

from .adapters.tenant import InternalTenantAdapter
from .models import Provider


class InternalSupplyPermissionTest(TestCase):
    """متجران: علايا (المورّد) وإسلام (المشتري)."""

    def setUp(self):
        self.alaya = Tenant.objects.create(subdomain="alaya", name="علايا", base_currency="USD")
        self.islam = Tenant.objects.create(subdomain="islam", name="إسلام", base_currency="USD")

        # وكيل بشريّ عند علايا — لا علاقة له بإسلام ولم يُؤذن له بشيء
        self.human = User.objects.create(
            login_id="bayi003", name="abd shop", tenant=self.alaya, role=User.Role.BAYI,
        )
        Wallet.objects.create(tenant=self.alaya, user=self.human, balance=Decimal("25000"))

        # الحساب الذي فتحته علايا لمتجر إسلام — مأذون
        self.linked = User.objects.create(
            login_id="islam_at_alaya", name="متجر إسلام", tenant=self.alaya,
            role=User.Role.BAYI, internal_supply_allowed=True,
        )
        Wallet.objects.create(tenant=self.alaya, user=self.linked, balance=Decimal("500"))

        # منتج عند علايا + مشترٍ عند إسلام
        game = Game.objects.create(tenant=self.alaya, name="PUBG")
        self.supplier_product = Product.objects.create(
            tenant=self.alaya, game=game, name="60 UC",
            cost_price=Decimal("6"), recommended_price=Decimal("10"),
        )
        self.buyer = User.objects.create(
            login_id="d1", name="وكيل إسلام", tenant=self.islam, role=User.Role.BAYI,
        )
        Wallet.objects.create(tenant=self.islam, user=self.buyer, balance=Decimal("100"))

        self.adapter = InternalTenantAdapter()

    def _provider(self, login):
        return Provider.objects.create(
            tenant=self.islam, name="علايا", type=Provider.Type.SAME_SYSTEM,
            config={"dealer_login": login},
        )

    def _order(self, provider):
        game = Game.objects.create(tenant=self.islam, name="PUBG")
        product = Product.objects.create(
            tenant=self.islam, game=game, name="60 UC",
            cost_price=Decimal("10"), recommended_price=Decimal("14"),
            provider=provider, provider_package_id=str(self.supplier_product.id),
        )
        return Order.objects.create(
            tenant=self.islam, receipt_no=f"T{provider.id}", dealer=self.buyer,
            game=game, product=product,
            cost_price=Decimal("10"), sell_price=Decimal("14"), profit=Decimal("4"),
        )

    # ——— الرفض: حساب غير مأذون ———

    def test_balance_refused_for_unpermitted_dealer(self):
        """الثغرة الأصلية: إسلام يكتب bayi003 فيقرأ رصيد وكيل علايا."""
        res = self.adapter.get_balance({"dealer_login": "bayi003"}, self._provider("bayi003"))
        self.assertFalse(res.ok)
        self.assertIn("غير مأذون", res.note)

    def test_packages_refused_for_unpermitted_dealer(self):
        res = self.adapter.list_packages({"dealer_login": "bayi003"}, self._provider("bayi003"))
        self.assertFalse(res.ok)
        self.assertIn("غير مأذون", res.note)

    def test_order_refused_and_wallet_untouched(self):
        """الأهمّ: لا يُخصم قرش من محفظة الوكيل غير المأذون."""
        provider = self._provider("bayi003")
        order = self._order(provider)
        before = self.human.wallet.balance

        res = self.adapter.place_order(order, provider.config, provider)

        self.assertEqual(res.status, "failed")
        self.assertIn("غير مأذون", res.note)
        self.human.wallet.refresh_from_db()
        self.assertEqual(self.human.wallet.balance, before)
        self.assertEqual(Order.objects.filter(tenant=self.alaya).count(), 0)

    def test_permission_revoked_stops_working(self):
        """سحب الإذن يوقف مزوّداً كان يعمل — لا يبقى نافذاً بحكم الماضي."""
        provider = self._provider("islam_at_alaya")
        self.assertTrue(self.adapter.get_balance(provider.config, provider).ok)

        self.linked.internal_supply_allowed = False
        self.linked.save(update_fields=["internal_supply_allowed"])

        self.assertFalse(self.adapter.get_balance(provider.config, provider).ok)

    # ——— القبول: الحساب المأذون يعمل كما كان ———

    def test_permitted_dealer_balance_and_packages(self):
        provider = self._provider("islam_at_alaya")

        bal = self.adapter.get_balance(provider.config, provider)
        self.assertTrue(bal.ok)
        self.assertEqual(bal.balance, Decimal("500"))

        pkgs = self.adapter.list_packages(provider.config, provider)
        self.assertTrue(pkgs.ok)
        self.assertEqual([p["id"] for p in pkgs.packages], [str(self.supplier_product.id)])

    def test_own_tenant_still_refused(self):
        """الإذن لا يُلغي منع التوجيه إلى المتجر نفسه."""
        mine = User.objects.create(
            login_id="mine", name="وكيلي", tenant=self.islam,
            role=User.Role.BAYI, internal_supply_allowed=True,
        )
        Wallet.objects.create(tenant=self.islam, user=mine, balance=Decimal("50"))
        provider = self._provider("mine")
        res = self.adapter.place_order(self._order(provider), provider.config, provider)
        self.assertEqual(res.status, "failed")
        self.assertIn("متجر آخر", res.note)

    def test_unknown_login_refused(self):
        res = self.adapter.get_balance({"dealer_login": "nope"}, self._provider("nope"))
        self.assertFalse(res.ok)
        self.assertIn("غير موجود", res.note)
