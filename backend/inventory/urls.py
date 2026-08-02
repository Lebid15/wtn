"""روابط الجرد النهائي."""
from django.urls import path

from . import views

urlpatterns = [
    path("live/", views.live_view, name="inventory-live"),
    path("sources/", views.sources_view, name="inventory-sources"),
    path("refresh/", views.refresh_view, name="inventory-refresh"),
    path("items/", views.item_create_view, name="inventory-item-create"),
    path("items/<int:item_id>/", views.item_view, name="inventory-item"),
    path("snapshots/", views.snapshots_view, name="inventory-snapshots"),
    path("snapshots/save/", views.snapshot_create_view, name="inventory-snapshot-save"),
    path("snapshots/<int:snapshot_id>/", views.snapshot_view, name="inventory-snapshot"),
]
