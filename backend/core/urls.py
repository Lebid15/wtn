"""روابط الـ API للقلب."""
from django.urls import path

from . import alerts, tickets, views

urlpatterns = [
    path("auth/login/", views.login_view, name="login"),
    path("auth/me/", views.me_view, name="me"),
    path("settings/site/", views.site_settings_view, name="site-settings"),
    path("settings/sms/", views.sms_settings_view, name="sms-settings"),
    path("settings/theme/", views.theme_config_view, name="theme-config"),
    path("settings/exchange/", views.exchange_rates_view, name="exchange-rates"),
    path("ledger/", views.ledger_view, name="ledger"),
    path("dealers/", views.dealers_view, name="dealers"),
    path("dealers/hierarchy/", views.dealers_hierarchy_view, name="dealers-hierarchy"),
    path("dealers/<int:dealer_id>/transactions/", views.wallet_transactions_view, name="wallet-txns"),
    # قبل مسار <str:action> وإلا ابتلعه
    path("dealers/<int:dealer_id>/settings/", views.dealer_settings_view, name="dealer-settings"),
    path("dealers/<int:dealer_id>/<str:action>/", views.wallet_operation_view, name="wallet-op"),
    # التذاكر / الرسائل
    path("tickets/", tickets.tickets_view, name="tickets"),
    path("tickets/unread-count/", tickets.unread_count_view, name="tickets-unread"),
    path("tickets/<int:ticket_id>/", tickets.ticket_thread_view, name="ticket-thread"),
    path("tickets/<int:ticket_id>/reply/", tickets.ticket_reply_view, name="ticket-reply"),
    path("tickets/<int:ticket_id>/close/", tickets.ticket_close_view, name="ticket-close"),
    path("announcement/", views.announcement_view, name="announcement"),
    path("alerts/", alerts.alerts_view, name="alerts"),
    # فواتير المستأجر الحالي
    path("invoices/", views.my_invoices_view, name="my-invoices"),
]
