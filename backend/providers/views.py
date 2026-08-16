"""API للمزوّدين (Oyun Apileri) — معزول لكل مستأجر."""
from decimal import Decimal

from django.db.models import Sum
from rest_framework import status as http_status
from rest_framework import viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .adapters.registry import adapter_for
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

    @action(detail=True, methods=["get"], url_path="packages")
    def packages(self, request, pk=None):
        """كتالوج باقات المزوّد — لقائمة الاختيار في صفحة ربط الباقات."""
        provider = self.get_object()
        adapter = adapter_for(provider)
        if adapter is None:
            return Response(
                {"detail": "منفّذ يدوي — لا كتالوج آلياً لهذا النوع"},
                status=http_status.HTTP_400_BAD_REQUEST,
            )
        result = adapter.list_packages(provider.config or {}, provider=provider)
        if not result.ok:
            return Response(
                {"detail": result.note or "تعذّر جلب باقات المزوّد"},
                status=http_status.HTTP_502_BAD_GATEWAY,
            )
        return Response({"count": len(result.packages), "packages": result.packages})

    @action(detail=True, methods=["post"], url_path="refresh-balance")
    def refresh_balance(self, request, pk=None):
        """جلب الرصيد الفعلي من المزوّد وحفظه (زر الشمس ☀)."""
        provider = self.get_object()
        adapter = adapter_for(provider)
        if adapter is None:
            return Response(
                {"detail": "منفّذ يدوي — لا رصيد آلياً لهذا النوع"},
                status=http_status.HTTP_400_BAD_REQUEST,
            )
        result = adapter.get_balance(provider.config or {}, provider=provider)
        if not result.ok:
            return Response(
                {"detail": result.note or "فشل جلب الرصيد من المزوّد"},
                status=http_status.HTTP_502_BAD_GATEWAY,
            )
        fields = []
        if result.balance is not None:
            provider.real_balance = result.balance
            fields.append("real_balance")
        if result.debt is not None:
            provider.debt = result.debt
            fields.append("debt")
        if fields:
            provider.save(update_fields=fields)
        data = ProviderSerializer(provider).data
        data["balance_note"] = result.note
        return Response(data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def provider_totals_view(request):
    """
    مجاميع المزوّدين (صف Toplamlar في المرجع) — **بعملة الدفتر**.

    كان يجمع الأرقام كما هي، وذلك يجمع ليرةً على دولار فيخرج رقمٌ بلا معنى.
    فيُحوَّل كلُّ مزوّد بعملته هو قبل الجمع، ومن لا سعر صرف لعملته يُستثنى
    ويُقال عددُه صراحةً — إسقاطُه صامتاً يجعل المجموع كاذباً بهدوء.
    """
    from core import currency as cur

    tenant = request.user.tenant
    totals = {"real_balance": Decimal("0"), "balance": Decimal("0"), "debt": Decimal("0")}
    skipped = set()
    for p in Provider.objects.filter(tenant=tenant):
        c = cur.currency_of(p)
        for field in totals:
            converted = cur.to_base(tenant, getattr(p, field), c)
            if converted is None:
                skipped.add(c)
            else:
                totals[field] += converted

    out = {k: str(v) for k, v in totals.items()}
    out["currency"] = cur.base_currency(tenant)
    out["unconverted"] = sorted(skipped)
    return Response(out)
