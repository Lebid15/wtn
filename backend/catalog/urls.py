"""روابط الكتالوج (router)."""
from rest_framework.routers import DefaultRouter

from .views import GameViewSet, ProductViewSet

router = DefaultRouter()
router.register("games", GameViewSet, basename="game")
router.register("products", ProductViewSet, basename="product")

urlpatterns = router.urls
