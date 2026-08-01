"""DRF serializers للقلب."""
from rest_framework import serializers

from .models import Tenant, User, Wallet


class TenantSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tenant
        fields = ["id", "name", "subdomain", "status", "theme", "font", "theme_color",
                  "logo_url", "base_currency"]


class SiteSettingsSerializer(serializers.ModelSerializer):
    """إعدادات الموقع (Web Site Ayarları) القابلة للتعديل."""

    class Meta:
        model = Tenant
        # الثيم والخط واللون في لوحة «المظهر» — لا يُضبطان من هنا
        fields = [
            "logo_url", "default_locale",
            "founded_year", "short_name", "full_name", "address",
            "email", "phone", "homepage_text", "footer_html",
        ]


class SmsSettingsSerializer(serializers.ModelSerializer):
    """إعدادات SMS (Sms Servisleri)."""

    class Meta:
        model = Tenant
        fields = ["sms_provider", "sms_api_key", "sms_sender", "sms_enabled"]


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
