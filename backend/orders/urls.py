"""روابط الطلبات."""
from django.urls import path

from . import views

urlpatterns = [
    path("", views.orders_view, name="orders"),
    path("reports/summary/", views.report_summary_view, name="report-summary"),
    path("reports/dealers/", views.report_dealers_view, name="report-dealers"),
    path("sync-pending/", views.orders_sync_pending_view, name="orders-sync-pending"),
    path("<int:order_id>/sync/", views.order_sync_view, name="order-sync"),
    path("<int:order_id>/trace/", views.order_trace_view, name="order-trace"),
    path("<int:order_id>/execute/", views.order_execute_view, name="order-execute"),
    path("<int:order_id>/cancel/", views.order_cancel_view, name="order-cancel"),
]
