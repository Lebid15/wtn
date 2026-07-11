"""روابط لوحة المنصّة."""
from django.urls import path

from . import views

urlpatterns = [
    path("tenants/", views.tenants_view, name="platform-tenants"),
    path("tenants/<int:tenant_id>/<str:action>/", views.tenant_status_view, name="platform-tenant-status"),
]
