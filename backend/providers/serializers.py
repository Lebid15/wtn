"""DRF serializers للمزوّدين."""
from rest_framework import serializers

from .models import Provider

# تسميات العرض حسب config.code — تميّز البرمجية التي يعمل بها المزوّد الخارجي
# (ZNET / ZDK) عن نوعه التخزيني العام (card_store).
# `barakat` و`apstore` متجران على برمجية ZDK — يُعرضان بها لا باسميهما، فاسم
# المتجر نفسه محفوظ في حقل `name`.
KIND_LABELS = {
    "znet": "ZNET",
    "zdk": "ZDK",
    "barakat": "ZDK",
    "apstore": "ZDK",
}


class ProviderSerializer(serializers.ModelSerializer):
    type_label = serializers.SerializerMethodField()
    status_label = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = Provider
        fields = [
            "id", "name", "type", "type_label", "config", "status", "status_label",
            "real_balance", "balance", "debt", "loss_guard", "auto_update",
            "balance_alert_threshold", "sort_order", "created_at",
        ]
        read_only_fields = ["tenant", "created_at"]

    def get_type_label(self, obj) -> str:
        code = ((obj.config or {}).get("code") or "").lower()
        return KIND_LABELS.get(code) or obj.get_type_display()
