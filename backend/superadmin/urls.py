"""روابط لوحة المنصّة."""
from django.urls import path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register("library/games", views.LibraryGameViewSet, basename="library-game")
router.register("library/products", views.LibraryProductViewSet, basename="library-product")

urlpatterns = [
    path("tenants/", views.tenants_view, name="platform-tenants"),
    path("tenants/<int:tenant_id>/<str:action>/", views.tenant_status_view, name="platform-tenant-status"),
] + router.urls
