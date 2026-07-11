"""روابط لوحة الوكيل الكبير."""
from django.urls import path

from . import views

urlpatterns = [
    path("summary/", views.summary_view, name="agent-summary"),
    path("dealers/", views.dealers_view, name="agent-dealers"),
    path("orders/", views.orders_view, name="agent-orders"),
    path("margins/", views.margins_view, name="agent-margins"),
    path("set-margin/", views.set_margin_view, name="agent-set-margin"),
]
