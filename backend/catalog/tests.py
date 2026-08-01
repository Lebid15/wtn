"""اختبارات الكتالوج: التسعير الجماعي، تحديث التكاليف، حذف المجموعة."""
from decimal import Decimal
from unittest.mock import patch

from rest_framework.test import APITestCase

from core.models import Tenant, User
from providers.adapters.base import PackageList
from providers.models import Provider

from .models import Game, PriceGroup, Product, ProductLink, ProductPrice


class CatalogToolsTest(APITestCase):
    """
    الدفتر بالدولار وسعر الليرة 40 — فكل سعر مزوّد بالليرة يُقسَم على 40.
    الرقم مستدير عمداً ليبقى المتوقَّع مقروءاً في التوكيدات.
    """

    def setUp(self):
        self.tenant = Tenant.objects.create(
            subdomain="t", name="متجر", base_currency="USD",
            exchange_rates={"TRY": "40"},
        )
        self.admin = User.objects.create(
            login_id="admin", name="مدير", tenant=self.tenant,
            role=User.Role.TENANT_ADMIN,
        )
        self.client.force_authenticate(user=self.admin)  # المصادقة JWT لا جلسات

        self.game = Game.objects.create(tenant=self.tenant, name="PUBG")
        self.p60 = Product.objects.create(
            tenant=self.tenant, game=self.game, name="60 UC",
            cost_price=Decimal("1.00"), recommended_price=Decimal("1.20"),
        )
        self.p325 = Product.objects.create(
            tenant=self.tenant, game=self.game, name="325 UC",
            cost_price=Decimal("4.00"), recommended_price=Decimal("4.50"),
        )
        self.group = PriceGroup.objects.create(tenant=self.tenant, name="1")

    # ── التسعير الجماعي ────────────────────────────────────────────
    def test_bulk_percent_prices_from_cost(self):
        r = self.client.post(
            "/api/catalog/bulk-price/",
            {"price_group": self.group.id, "products": [], "mode": "percent", "value": "25"},
            format="json",
        )
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(r.json()["updated"], 2)
        self.assertEqual(self._price(self.p60), Decimal("1.25"))
        self.assertEqual(self._price(self.p325), Decimal("5.00"))

    def test_bulk_is_repeatable(self):
        """الأساس هو التكلفة — فتطبيقان بالقيمة نفسها لا يضاعفان الزيادة."""
        body = {"price_group": self.group.id, "products": [], "mode": "percent", "value": "25"}
        self.client.post("/api/catalog/bulk-price/", body, format="json")
        self.client.post("/api/catalog/bulk-price/", body, format="json")
        self.assertEqual(self._price(self.p60), Decimal("1.25"))

    def test_bulk_fixed_and_selection(self):
        r = self.client.post(
            "/api/catalog/bulk-price/",
            {"price_group": self.group.id, "products": [self.p60.id],
             "mode": "fixed", "value": "0.50"},
            format="json",
        )
        self.assertEqual(r.json()["updated"], 1)
        self.assertEqual(self._price(self.p60), Decimal("1.50"))
        # لم تُحدَّد فلا تُسعَّر
        self.assertIsNone(self._price(self.p325))

    def test_bulk_skips_zero_cost(self):
        """باقة بتكلفة صفر لا تُسعَّر بصفر — تُترك ويُذكر اسمها."""
        free = Product.objects.create(
            tenant=self.tenant, game=self.game, name="بلا تكلفة", cost_price=Decimal("0"),
        )
        r = self.client.post(
            "/api/catalog/bulk-price/",
            {"price_group": self.group.id, "products": [], "mode": "percent", "value": "25"},
            format="json",
        )
        self.assertEqual(r.json()["updated"], 2)
        self.assertIn("بلا تكلفة", r.json()["skipped_zero_cost"])
        self.assertIsNone(self._price(free))

    def test_bulk_rejects_negative_result(self):
        r = self.client.post(
            "/api/catalog/bulk-price/",
            {"price_group": self.group.id, "products": [], "mode": "fixed", "value": "-9"},
            format="json",
        )
        self.assertEqual(r.status_code, 400)
        self.assertIsNone(self._price(self.p60))  # لم يُكتب شيء

    # ── ارتباط السعر بالتكلفة ──────────────────────────────────────
    def test_bulk_links_price_to_cost(self):
        """التسعير الجماعي يحفظ قاعدة لا رقماً — والسعر يتبع التكلفة بعدها."""
        self._bulk("percent", "25")
        self.assertEqual(self._price(self.p60), Decimal("1.25"))

        self.p60.cost_price = Decimal("2.00")
        self.p60.save()

        self.assertEqual(self._price(self.p60), Decimal("2.50"))  # تبع التكلفة وحده

    def test_refresh_costs_pulls_linked_prices(self):
        """تغيّر التكلفة من «تحديث التكاليف» يجرّ السعر المرتبط معه."""
        self._bulk("percent", "25")
        provider = self._provider()
        ProductLink.objects.create(
            tenant=self.tenant, product=self.p60, provider=provider, package_id="1",
        )
        catalog = PackageList(ok=True, packages=[{"id": "1", "name": "PUBG 60", "price": "80"}])

        with patch("providers.adapters.znet.ZnetAdapter.list_packages", return_value=catalog):
            self.client.post(
                "/api/catalog/refresh-costs/",
                {"provider": provider.id, "products": []}, format="json",
            )

        self.p60.refresh_from_db()
        self.assertEqual(self.p60.cost_price, Decimal("2.00"))   # 80 ل.ت ÷ 40
        self.assertEqual(self._price(self.p60), Decimal("2.50"))  # 2.00 + 25%

    def test_manual_edit_breaks_the_link(self):
        """الرقم المكتوب باليد لا يمحوه أوّلُ تغيير في التكلفة."""
        self._bulk("percent", "25")
        self.client.post(
            "/api/catalog/set-price/",
            {"product": self.p60.id, "price_group": self.group.id, "price": "9.99"},
            format="json",
        )

        self.p60.cost_price = Decimal("2.00")
        self.p60.save()

        self.assertEqual(self._price(self.p60), Decimal("9.99"))  # ثبت كما كُتب
        self.assertFalse(self._row(self.p60).linked)

    def test_new_bulk_replaces_the_rule(self):
        """تسعير جماعي جديد يحلّ محلّ القاعدة القديمة لا يتراكم عليها."""
        self._bulk("percent", "25")
        self._bulk("fixed", "0.50")
        self.assertEqual(self._price(self.p60), Decimal("1.50"))

        self.p60.cost_price = Decimal("2.00")
        self.p60.save()

        self.assertEqual(self._price(self.p60), Decimal("2.50"))  # 2.00 + 0.50 لا +25%
        self.assertEqual(self._row(self.p60).margin_mode, "fixed")

    def test_unlinked_cells_never_move(self):
        """باقة لم تدخل التسعير الجماعي لا يمسّها تغيّر تكلفتها."""
        self.client.post(
            "/api/catalog/set-price/",
            {"product": self.p325.id, "price_group": self.group.id, "price": "4.44"},
            format="json",
        )
        self.p325.cost_price = Decimal("9.00")
        self.p325.save()
        self.assertEqual(self._price(self.p325), Decimal("4.44"))

    def test_matrix_exposes_the_rule(self):
        self._bulk("percent", "25")
        r = self.client.get("/api/catalog/price-matrix/")
        cell = r.json()["games"][0]["products"][0]["prices"][str(self.group.id)]
        self.assertEqual(cell["margin"]["mode"], "percent")
        self.assertEqual(Decimal(cell["margin"]["value"]), Decimal("25"))

    # ── تحديث التكاليف ─────────────────────────────────────────────
    def test_refresh_costs_converts_provider_lira(self):
        """سعر المزوّد 44 ل.ت ⇒ تكلفتنا 1.10$ لا 44$."""
        provider = self._provider()
        ProductLink.objects.create(
            tenant=self.tenant, product=self.p60, provider=provider, package_id="1",
        )
        catalog = PackageList(ok=True, packages=[{"id": "1", "name": "PUBG 60", "price": "44"}])

        with patch("providers.adapters.znet.ZnetAdapter.list_packages", return_value=catalog):
            r = self.client.post(
                "/api/catalog/refresh-costs/",
                {"provider": provider.id, "products": []}, format="json",
            )

        self.assertEqual(r.status_code, 200, r.content)
        self.p60.refresh_from_db()
        self.assertEqual(self.p60.cost_price, Decimal("1.10"))
        # السعر المرجعي لحماية الخسارة يُحفظ بعملة الدفتر كذلك
        link = ProductLink.objects.get(product=self.p60, provider=provider)
        self.assertEqual(link.extra["price"], "1.10")

    def test_refresh_costs_matches_by_kupur_not_id_alone(self):
        """
        زينت يرقّم بـpackage_id **اللعبة** لا الباقة: باقات ببجي كلّها رقمها 1
        ويميّزها الكوبون. المطابقة بالرقم وحده كانت تلصق سعر أوّل باقة بكلّها.
        """
        provider = self._provider()
        ProductLink.objects.create(
            tenant=self.tenant, product=self.p60, provider=provider,
            package_id="1", extra={"kupur": "60"},
        )
        ProductLink.objects.create(
            tenant=self.tenant, product=self.p325, provider=provider,
            package_id="1", extra={"kupur": "325"},
        )
        catalog = PackageList(ok=True, packages=[
            {"id": "1", "kupur": "60", "name": "PUBG 60 UC", "price": "40"},
            {"id": "1", "kupur": "325", "name": "PUBG 325 UC", "price": "160"},
        ])

        with patch("providers.adapters.znet.ZnetAdapter.list_packages", return_value=catalog):
            self.client.post(
                "/api/catalog/refresh-costs/",
                {"provider": provider.id, "products": []}, format="json",
            )

        self.p60.refresh_from_db()
        self.p325.refresh_from_db()
        self.assertEqual(self.p60.cost_price, Decimal("1.00"))    # 40 ÷ 40
        self.assertEqual(self.p325.cost_price, Decimal("4.00"))   # 160 ÷ 40 — لا 1.00

    def test_refresh_costs_refuses_ambiguous_link(self):
        """رابط بلا كوبون واللعبة فيها أكثر من باقة: نمتنع بدل أن نخمّن."""
        provider = self._provider()
        ProductLink.objects.create(
            tenant=self.tenant, product=self.p60, provider=provider, package_id="1", extra={},
        )
        catalog = PackageList(ok=True, packages=[
            {"id": "1", "kupur": "60", "name": "PUBG 60 UC", "price": "40"},
            {"id": "1", "kupur": "325", "name": "PUBG 325 UC", "price": "160"},
        ])

        with patch("providers.adapters.znet.ZnetAdapter.list_packages", return_value=catalog):
            r = self.client.post(
                "/api/catalog/refresh-costs/",
                {"provider": provider.id, "products": []}, format="json",
            )

        self.assertEqual(r.json()["updated"], [])
        self.assertIn("حدّد الكوبون", r.json()["skipped"][0]["note"])
        self.p60.refresh_from_db()
        self.assertEqual(self.p60.cost_price, Decimal("1.00"))  # لم تُمَسّ

    def test_refresh_costs_matches_single_package_without_kupur(self):
        """مزوّد بلا كوبونات (ZDK): المعرّف وحده يكفي ما دام فريداً."""
        provider = self._provider()
        ProductLink.objects.create(
            tenant=self.tenant, product=self.p60, provider=provider,
            package_id="823", extra={},
        )
        catalog = PackageList(ok=True, packages=[{"id": "823", "name": "PUBG 60", "price": "44"}])

        with patch("providers.adapters.znet.ZnetAdapter.list_packages", return_value=catalog):
            self.client.post(
                "/api/catalog/refresh-costs/",
                {"provider": provider.id, "products": []}, format="json",
            )

        self.p60.refresh_from_db()
        self.assertEqual(self.p60.cost_price, Decimal("1.10"))

    def test_refresh_costs_reports_missing_package(self):
        provider = self._provider()
        ProductLink.objects.create(
            tenant=self.tenant, product=self.p60, provider=provider, package_id="999",
        )
        catalog = PackageList(ok=True, packages=[{"id": "1", "name": "غيرها", "price": "44"}])

        with patch("providers.adapters.znet.ZnetAdapter.list_packages", return_value=catalog):
            r = self.client.post(
                "/api/catalog/refresh-costs/",
                {"provider": provider.id, "products": []}, format="json",
            )

        self.assertEqual(r.json()["updated"], [])
        self.assertEqual(len(r.json()["skipped"]), 1)
        self.p60.refresh_from_db()
        self.assertEqual(self.p60.cost_price, Decimal("1.00"))  # لم تُمسّ

    def test_refresh_costs_needs_exchange_rate(self):
        """بلا سعر صرف مضبوط يُرفض التحديث بدل أن يُحسب بمعامل 1 صامت."""
        self.tenant.exchange_rates = {}
        self.tenant.save()
        provider = self._provider()
        ProductLink.objects.create(
            tenant=self.tenant, product=self.p60, provider=provider, package_id="1",
        )
        r = self.client.post(
            "/api/catalog/refresh-costs/",
            {"provider": provider.id, "products": []}, format="json",
        )
        self.assertEqual(r.status_code, 400)
        self.p60.refresh_from_db()
        self.assertEqual(self.p60.cost_price, Decimal("1.00"))

    # ── حذف المجموعة ───────────────────────────────────────────────
    def test_delete_group_moves_dealers_out(self):
        dealer = User.objects.create(
            login_id="bayi1", name="وكيل", tenant=self.tenant,
            role=User.Role.BAYI, price_group=self.group,
        )
        ProductPrice.objects.create(
            tenant=self.tenant, product=self.p60, price_group=self.group, price=Decimal("1.11"),
        )

        r = self.client.delete(f"/api/catalog/price-groups/{self.group.id}/")

        self.assertEqual(r.status_code, 204)
        dealer.refresh_from_db()
        self.assertIsNone(dealer.price_group_id)  # لا يُحذف الوكيل مع مجموعته
        self.assertFalse(ProductPrice.objects.filter(price_group_id=self.group.id).exists())

    def test_price_group_list_carries_dealer_count(self):
        User.objects.create(
            login_id="bayi2", name="وكيل", tenant=self.tenant,
            role=User.Role.BAYI, price_group=self.group,
        )
        r = self.client.get("/api/catalog/price-groups/")
        self.assertEqual(r.json()[0]["dealer_count"], 1)

    # ── مساعدات ────────────────────────────────────────────────────
    def _provider(self):
        return Provider.objects.create(
            tenant=self.tenant, name="زينت", type=Provider.Type.CARD_STORE,
            config={"code": "znet"},
        )

    def _bulk(self, mode, value, products=None):
        return self.client.post(
            "/api/catalog/bulk-price/",
            {"price_group": self.group.id, "products": products or [],
             "mode": mode, "value": value},
            format="json",
        )

    def _row(self, product):
        return ProductPrice.objects.filter(product=product, price_group=self.group).first()

    def _price(self, product):
        pp = self._row(product)
        return pp.price if pp else None
