"""روابط الـ API للقلب."""
from django.urls import path

from . import views

urlpatterns = [
    path("auth/login/", views.login_view, name="login"),
    path("auth/me/", views.me_view, name="me"),
    path("dealers/", views.dealers_view, name="dealers"),
    path("dealers/<int:dealer_id>/transactions/", views.wallet_transactions_view, name="wallet-txns"),
    path("dealers/<int:dealer_id>/<str:action>/", views.wallet_operation_view, name="wallet-op"),
]
