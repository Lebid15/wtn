"""API لبنك البينات (Havuz) — معزول لكل مستأجر."""
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from .models import PinPool
from .serializers import PinPoolSerializer


class PinPoolViewSet(viewsets.ModelViewSet):
    """CRUD مجموعات البينات ضمن مستأجر المستخدم الحالي."""
    serializer_class = PinPoolSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return PinPool.objects.filter(tenant=self.request.user.tenant).prefetch_related("pins")

    def perform_create(self, serializer):
        serializer.save(tenant=self.request.user.tenant)
