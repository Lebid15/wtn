"""روابط المدفوعات."""
from django.urls import path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register("accounts", views.ReceivingAccountViewSet, basename="account")

urlpatterns = [
    path("accounts-total/", views.accounts_total_view, name="accounts-total"),
    path("notifications/", views.payment_notifications_view, name="payment-notifications"),
    path("notifications/<int:notif_id>/<str:action>/", views.payment_decide_view, name="payment-decide"),
] + router.urls
