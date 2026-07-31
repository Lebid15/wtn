"""روابط المدفوعات."""
from django.urls import path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register("accounts", views.ReceivingAccountViewSet, basename="account")
router.register("methods", views.PaymentMethodViewSet, basename="payment-method")

urlpatterns = [
    path("accounts-total/", views.accounts_total_view, name="accounts-total"),
    path("notifications/", views.payment_notifications_view, name="payment-notifications"),
    path("notifications/bulk-action/", views.payment_bulk_action_view, name="payment-bulk-action"),
    path("notifications/<int:notif_id>/<str:action>/", views.payment_decide_view, name="payment-decide"),
    # جانب الوكيل — قسم «إضافة رصيد»
    path("store/methods/", views.store_methods_view, name="store-payment-methods"),
    path("store/deposits/", views.store_deposits_view, name="store-deposits"),
    path("store/deposits/create/", views.store_deposit_create_view, name="store-deposit-create"),
] + router.urls
