"""DRF serializers للمزوّدين."""
from rest_framework import serializers

from .models import Provider


class ProviderSerializer(serializers.ModelSerializer):
    type_label = serializers.CharField(source="get_type_display", read_only=True)
    status_label = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = Provider
        fields = [
            "id", "name", "type", "type_label", "config", "status", "status_label",
            "real_balance", "balance", "debt", "loss_guard", "auto_update",
            "balance_alert_threshold", "sort_order", "created_at",
        ]
        read_only_fields = ["tenant", "created_at"]
