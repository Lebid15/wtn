"""مسارات الواجهة الخارجية — أسماؤها منسوخة عن ZDK حرفاً فلا يُعدّل كود العميل."""
from django.urls import path

from . import views

urlpatterns = [
    path("profile", views.profile_view, name="client-profile"),
    path("products", views.products_view, name="client-products"),
    path("newOrder/<str:product_id>/params", views.new_order_view, name="client-new-order"),
    path("check", views.check_view, name="client-check"),
]
