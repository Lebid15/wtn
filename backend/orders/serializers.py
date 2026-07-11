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
            "balance_before", "balance_after", "created_at",
        ]
