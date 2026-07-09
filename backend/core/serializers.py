"""DRF serializers للقلب."""
from rest_framework import serializers

from .models import Tenant, User, Wallet


class TenantSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tenant
        fields = ["id", "name", "subdomain", "status", "theme", "theme_color", "logo_url"]


class WalletSerializer(serializers.ModelSerializer):
    available = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)

    class Meta:
        model = Wallet
        fields = ["balance", "credit_limit", "currency", "available"]


class UserSerializer(serializers.ModelSerializer):
    tenant = TenantSerializer(read_only=True)
    wallet = WalletSerializer(read_only=True)
    role_label = serializers.CharField(source="get_role_display", read_only=True)

    class Meta:
        model = User
        fields = [
            "id", "login_id", "name", "phone", "role", "role_label",
            "status", "country", "tenant", "wallet", "modules",
        ]


class LoginSerializer(serializers.Serializer):
    login_id = serializers.CharField()
    password = serializers.CharField(write_only=True)
    totp = serializers.CharField(required=False, allow_blank=True)
