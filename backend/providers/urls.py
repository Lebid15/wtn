"""روابط المزوّدين."""
from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import ProviderViewSet, provider_totals_view

router = DefaultRouter()
router.register("", ProviderViewSet, basename="provider")

urlpatterns = [
    path("totals/", provider_totals_view, name="provider-totals"),
] + router.urls
