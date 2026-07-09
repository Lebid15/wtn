"""API للكتالوج: الألعاب والمنتجات — معزولة لكل مستأجر."""
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from .models import Game, Product
from .serializers import GameDetailSerializer, GameSerializer, ProductSerializer


class GameViewSet(viewsets.ModelViewSet):
    """CRUD الألعاب ضمن مستأجر المستخدم الحالي."""
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Game.objects.filter(tenant=self.request.user.tenant)

    def get_serializer_class(self):
        return GameDetailSerializer if self.action == "retrieve" else GameSerializer

    def perform_create(self, serializer):
        serializer.save(tenant=self.request.user.tenant)


class ProductViewSet(viewsets.ModelViewSet):
    """CRUD المنتجات؛ يدعم الفلترة بـ ?game=<id>."""
    serializer_class = ProductSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = Product.objects.filter(tenant=self.request.user.tenant)
        game_id = self.request.query_params.get("game")
        if game_id:
            qs = qs.filter(game_id=game_id)
        return qs

    def perform_create(self, serializer):
        serializer.save(tenant=self.request.user.tenant)
