"""روابط بنك البينات."""
from rest_framework.routers import DefaultRouter

from .views import PinPoolViewSet

router = DefaultRouter()
router.register("", PinPoolViewSet, basename="pool")

urlpatterns = router.urls
