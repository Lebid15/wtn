"""روابط الجرد النهائي."""
from django.urls import path

from . import views

urlpatterns = [
    path("live/", views.live_view, name="inventory-live"),
]
