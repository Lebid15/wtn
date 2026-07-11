"""DRF serializers للمدفوعات."""
from rest_framework import serializers

from .models import PaymentNotification, ReceivingAccount


class ReceivingAccountSerializer(serializers.ModelSerializer):
    method_label = serializers.CharField(source="get_method_display", read_only=True)
    status_label = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = ReceivingAccount
        fields = [
            "id", "method", "method_label", "title", "account_no", "balance",
            "status", "status_label", "notification_enabled", "sort_order",
        ]
        read_only_fields = ["tenant"]


class PaymentNotificationSerializer(serializers.ModelSerializer):
    dealer_name = serializers.CharField(source="dealer.name", read_only=True)
    account_title = serializers.CharField(source="account.title", read_only=True, default="")
    status_label = serializers.CharField(source="get_status_display", read_only=True)
    created_at = serializers.DateTimeField(format="%Y-%m-%d %H:%M", read_only=True)

    class Meta:
        model = PaymentNotification
        fields = [
            "id", "dealer", "dealer_name", "account", "account_title",
            "amount", "note", "status", "status_label", "created_at",
        ]
