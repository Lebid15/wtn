"""DRF serializers للطلبات."""
from rest_framework import serializers

from .models import Order


class OrderSerializer(serializers.ModelSerializer):
    dealer_name = serializers.CharField(source="dealer.name", read_only=True)
    game_name = serializers.CharField(source="game.name", read_only=True)
    product_name = serializers.CharField(source="product.name", read_only=True)
    provider_name = serializers.CharField(source="provider.name", read_only=True, default="")
    status_label = serializers.CharField(source="get_status_display", read_only=True)
    created_at = serializers.DateTimeField(format="%Y-%m-%d %H:%M", read_only=True)

    class Meta:
        model = Order
        fields = [
            "id", "receipt_no", "dealer", "dealer_name", "game_name",
            "product", "product_name", "player_id", "customer_phone",
            "cost_price", "sell_price", "profit", "status", "status_label",
            "provider", "provider_name", "pin_result", "api_response",
            "provider_ref", "provider_note", "last_sync_at",
            "dealer_sell_price", "dealer_profit",
            "balance_before", "balance_after", "created_at",
        ]


class StoreOrderSerializer(serializers.ModelSerializer):
    """
    الطلب **بمنظور الوكيل**: شراؤه هو ما دفعه لصاحب المتجر (`sell_price`)،
    وبيعه هو ما باع به لزبونه. أرقام المالك (تكلفة المزوّد وربحه) واسم
    المزوّد وسجلّ التوجيه لا تخرج إلى لوحة الوكيل.
    """
    game_name = serializers.CharField(source="game.name", read_only=True)
    product_name = serializers.CharField(source="product.name", read_only=True)
    status_label = serializers.CharField(source="get_status_display", read_only=True)
    paid_price = serializers.DecimalField(
        source="sell_price", max_digits=12, decimal_places=2, read_only=True
    )
    created_at = serializers.DateTimeField(format="%Y-%m-%d %H:%M", read_only=True)

    class Meta:
        model = Order
        fields = [
            "id", "receipt_no", "game_name", "product", "product_name",
            "player_id", "customer_phone",
            "paid_price", "dealer_sell_price", "dealer_profit",
            "status", "status_label", "pin_result", "provider_note",
            "last_sync_at", "balance_before", "balance_after", "created_at",
        ]
