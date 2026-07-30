"""محوّل "نفس النظام" الداخلي: متجر يشتري من متجر آخر على منصّتنا.

الربط: صاحب المتجر (أ) يملك حساب وكيل (bayi) لدى المتجر المورّد (ب).
config = {"dealer_login": "..."} — رقم دخول حسابه هناك.
provider_package_id على المنتج = رقم منتج المورّد (ب).

عند الطلب: يُنشأ طلب حقيقي داخل متجر (ب) باسم ذلك الوكيل (يخصم محفظته هناك)،
ويُنفَّذ لدى (ب) بتوجيهات (ب) نفسها (بنك بيناته أو مزوّده الخارجي...)،
ويعود الـ PIN إلى طلبنا. أي سلسلة توريد كاملة داخل المنصّة.
"""
from decimal import Decimal

from .base import BalanceResult, BaseAdapter, ExecutionResult, PackageList


class InternalTenantAdapter(BaseAdapter):

    code = "tenant"

    def get_balance(self, config: dict, provider=None) -> BalanceResult:
        """رصيد محفظتنا (كوكيل) لدى المتجر المورّد — قراءة محلية من القاعدة."""
        from core.models import User

        login = ((config or {}).get("dealer_login") or "").strip()
        if not login:
            return BalanceResult(ok=False, note="إعداد ناقص: dealer_login")
        dealer = User.objects.filter(login_id=login).select_related("wallet", "tenant").first()
        wallet = getattr(dealer, "wallet", None)
        if dealer is None or wallet is None:
            return BalanceResult(ok=False, note=f"حساب '{login}' غير موجود لدى المورّد أو بلا محفظة")
        bal = wallet.balance
        return BalanceResult(
            ok=True, balance=bal,
            debt=-bal if bal < Decimal("0") else Decimal("0"),
            note=f"رصيدنا لدى متجر {dealer.tenant.name}",
        )

    def list_packages(self, config: dict, provider=None) -> PackageList:
        """كتالوج المورّد: منتجات المتجر الذي نملك حساب وكيل لديه."""
        from catalog.models import Product
        from core.models import User

        login = ((config or {}).get("dealer_login") or "").strip()
        if not login:
            return PackageList(ok=False, note="إعداد ناقص: dealer_login")
        dealer = User.objects.filter(login_id=login).select_related("tenant").first()
        if dealer is None:
            return PackageList(ok=False, note=f"حساب '{login}' غير موجود لدى المورّد")
        rows = Product.objects.filter(
            tenant=dealer.tenant, status=Product.Status.ACTIVE
        ).select_related("game").order_by("game__sort_order", "sort_order")
        packages = [
            {"id": str(x.id), "name": x.name, "game": x.game.name,
             "kupur": x.kupur, "price": str(x.recommended_price)}
            for x in rows
        ]
        if not packages:
            return PackageList(ok=False, note=f"لا منتجات نشطة لدى {dealer.tenant.name}")
        return PackageList(ok=True, packages=packages)

    def place_order(self, order, config: dict, provider=None, depth: int = 0) -> ExecutionResult:
        from core.models import User
        from catalog.models import Product
        from orders import services

        login = (config.get("dealer_login") or "").strip()
        if not login:
            return ExecutionResult(status="failed", note="إعداد ناقص: dealer_login (حسابنا لدى المورّد)")

        dealer = (
            User.objects.filter(login_id=login, role=User.Role.BAYI)
            .select_related("tenant", "wallet").first()
        )
        if dealer is None:
            return ExecutionResult(status="failed", note=f"حساب الوكيل '{login}' غير موجود لدى المورّد")
        if dealer.tenant_id == order.tenant_id:
            return ExecutionResult(status="failed", note="التوجيه الداخلي يجب أن يكون لمتجر آخر")

        try:
            package_id, _extra = self.link_for(order, provider)
            supplier_product_id = int(package_id)
        except (TypeError, ValueError):
            return ExecutionResult(
                status="failed",
                note="provider_package_id يجب أن يكون رقم منتج لدى المتجر المورّد",
            )
        sp = Product.objects.filter(pk=supplier_product_id, tenant=dealer.tenant).select_related("game").first()
        if sp is None:
            return ExecutionResult(status="failed", note=f"المنتج {supplier_product_id} غير موجود لدى المورّد")

        # أنشئ الطلب لدى المورّد (يخصم محفظتنا هناك بسعرنا لديه)
        try:
            sup_order = services.create_order(
                dealer, sp,
                player_id=order.player_id, customer_phone=order.customer_phone,
            )
        except services.OrderError as e:
            return ExecutionResult(status="failed", note=f"رفض المورّد: {e}")

        # نفّذ لدى المورّد بتوجيهاته هو (عمق +1 يمنع الحلقات)
        services.dispatch_order(sup_order, depth=depth + 1)
        sup_order.refresh_from_db()

        ref = f"tenant:{dealer.tenant.subdomain}:{sup_order.receipt_no}"
        if sup_order.status == "success":
            return ExecutionResult(
                status="success", pin=sup_order.pin_result,
                cost=sup_order.sell_price, external_ref=ref,
                note=f"نُفّذ عبر متجر {dealer.tenant.name}",
            )
        if sup_order.status in ("pending", "processing"):
            return ExecutionResult(
                status="processing", external_ref=ref,
                note=f"قيد التنفيذ لدى متجر {dealer.tenant.name}",
            )
        return ExecutionResult(
            status="failed", external_ref=ref,
            note=f"فشل لدى المورّد: {sup_order.api_response[:120]}",
        )
