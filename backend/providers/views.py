"""API للمزوّدين (Oyun Apileri) — معزول لكل مستأجر."""
from django.db.models import Sum
from rest_framework import viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Provider
from .serializers import ProviderSerializer


class ProviderViewSet(viewsets.ModelViewSet):
    """CRUD المزوّدين ضمن مستأجر المستخدم الحالي."""
    serializer_class = ProviderSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = Provider.objects.filter(tenant=self.request.user.tenant)
        status = self.request.query_params.get("status")
        if status:
            qs = qs.filter(status=status)
        return qs

    def perform_create(self, serializer):
        serializer.save(tenant=self.request.user.tenant)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def provider_totals_view(request):
    """مجاميع المزوّدين (صف Toplamlar في المرجع)."""
    agg = Provider.objects.filter(tenant=request.user.tenant).aggregate(
        real_balance=Sum("real_balance"), balance=Sum("balance"), debt=Sum("debt"),
    )
    return Response({k: str(v or 0) for k, v in agg.items()})
