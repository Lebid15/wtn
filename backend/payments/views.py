"""API للمدفوعات: حسابات الاستلام + إشعارات الدفع (مع موافقة تشحن المحفظة)."""
from django.db.models import Sum
from rest_framework import viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from core import services as wallet_services
from core.models import WalletTransaction
from .models import PaymentNotification, ReceivingAccount
from .serializers import PaymentNotificationSerializer, ReceivingAccountSerializer


class ReceivingAccountViewSet(viewsets.ModelViewSet):
    """CRUD حسابات الاستلام (Hesaplarım)."""
    serializer_class = ReceivingAccountSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return ReceivingAccount.objects.filter(tenant=self.request.user.tenant)

    def perform_create(self, serializer):
        serializer.save(tenant=self.request.user.tenant)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def accounts_total_view(request):
    total = ReceivingAccount.objects.filter(tenant=request.user.tenant).aggregate(
        balance=Sum("balance")
    )["balance"]
    return Response({"balance": str(total or 0)})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def payment_notifications_view(request):
    """قائمة إشعارات الدفع (Ödeme Takip) — فلتر بالحالة."""
    qs = PaymentNotification.objects.filter(tenant=request.user.tenant).select_related(
        "dealer", "account"
    )
    st = request.query_params.get("status")
    if st and st != "all":
        qs = qs.filter(status=st)
    return Response({
        "count": qs.count(),
        "results": PaymentNotificationSerializer(qs[:200], many=True).data,
    })


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def payment_decide_view(request, notif_id, action):
    """قبول/رفض إشعار دفع. القبول يشحن محفظة الوكيل."""
    if action not in ("approve", "reject"):
        return Response({"detail": "إجراء غير معروف"}, status=400)
    try:
        notif = PaymentNotification.objects.select_related("dealer").get(
            pk=notif_id, tenant=request.user.tenant
        )
    except PaymentNotification.DoesNotExist:
        return Response({"detail": "الإشعار غير موجود"}, status=404)
    if notif.status != PaymentNotification.Status.PENDING:
        return Response({"detail": "تمّت معالجة الإشعار مسبقاً"}, status=400)

    if action == "approve":
        wallet = getattr(notif.dealer, "wallet", None)
        if wallet is None:
            return Response({"detail": "لا توجد محفظة للوكيل"}, status=400)
        wallet_services.apply_transaction(
            wallet.id, notif.amount, WalletTransaction.Type.TOPUP,
            created_by=request.user, note=f"دفعة معتمدة #{notif.id}",
            ref_type="payment", ref_id=notif.id, allow_below_limit=True,
        )
        notif.status = PaymentNotification.Status.APPROVED
    else:
        notif.status = PaymentNotification.Status.REJECTED

    notif.approved_by = request.user
    notif.save(update_fields=["status", "approved_by"])
    return Response(PaymentNotificationSerializer(notif).data)
