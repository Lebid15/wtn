"""روابط الكتالوج (router + مسارات مخصّصة)."""
from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    GameViewSet, PriceGroupViewSet, ProductViewSet,
    price_matrix_view, set_price_view,
)

router = DefaultRouter()
router.register("games", GameViewSet, basename="game")
router.register("products", ProductViewSet, basename="product")
router.register("price-groups", PriceGroupViewSet, basename="price-group")

urlpatterns = [
    path("price-matrix/", price_matrix_view, name="price-matrix"),
    path("set-price/", set_price_view, name="set-price"),
] + router.urls
