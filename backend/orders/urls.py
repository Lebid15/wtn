"""روابط الطلبات."""
from django.urls import path

from . import views

urlpatterns = [
    path("", views.orders_view, name="orders"),
    path("reports/summary/", views.report_summary_view, name="report-summary"),
    path("reports/dealers/", views.report_dealers_view, name="report-dealers"),
    path("<int:order_id>/execute/", views.order_execute_view, name="order-execute"),
    path("<int:order_id>/cancel/", views.order_cancel_view, name="order-cancel"),
]
