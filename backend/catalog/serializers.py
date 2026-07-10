"""DRF serializers للكتالوج."""
from rest_framework import serializers

from .models import Game, Product


class ProductSerializer(serializers.ModelSerializer):
    profit = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    status_label = serializers.CharField(source="get_status_display", read_only=True)
    created_at = serializers.DateTimeField(format="%Y-%m-%d", read_only=True)
    game_name = serializers.CharField(source="game.name", read_only=True)

    class Meta:
        model = Product
        fields = [
            "id", "game", "game_name", "name", "cost_price", "recommended_price", "profit",
            "kupur", "status", "status_label", "is_parcali", "execution_type",
            "description", "sort_order", "created_at",
        ]
        read_only_fields = ["tenant"]


class GameSerializer(serializers.ModelSerializer):
    product_count = serializers.IntegerField(source="products.count", read_only=True)
    status_label = serializers.CharField(source="get_status_display", read_only=True)
    created_at = serializers.DateTimeField(format="%Y-%m-%d", read_only=True)

    class Meta:
        model = Game
        fields = [
            "id", "name", "image_url", "dealer_note", "description", "status",
            "status_label", "require_player_id", "kurulu_sale", "toplu_sale",
            "sms_template", "sort_order", "product_count", "created_at",
        ]
        read_only_fields = ["tenant"]


class GameDetailSerializer(GameSerializer):
    products = ProductSerializer(many=True, read_only=True)

    class Meta(GameSerializer.Meta):
        fields = GameSerializer.Meta.fields + ["products"]
