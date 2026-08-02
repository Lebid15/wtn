"""روابط واتساب — قسمان: لصاحب المتجر (JWT) وللبوت (سرّ مشترك)."""
from django.urls import path

from . import internal, views

urlpatterns = [
    # لصاحب المتجر
    path("settings/", views.settings_view, name="wa-settings"),
    path("status/", views.status_view, name="wa-status"),
    path("connect/", views.connect_view, name="wa-connect"),
    path("logout/", views.logout_view, name="wa-logout"),
    path("preview/", views.preview_view, name="wa-preview"),
    path("targets/", views.targets_view, name="wa-targets"),
    path("send/", views.send_view, name="wa-send"),
    path("send-bulk/", views.send_bulk_view, name="wa-send-bulk"),
    path("queue/", views.queue_view, name="wa-queue"),
    path("cancel-pending/", views.cancel_pending_view, name="wa-cancel"),
    # للبوت
    path("internal/poll/", internal.poll_view, name="wa-internal-poll"),
    path("internal/session/", internal.session_view, name="wa-internal-session"),
    path("internal/result/", internal.result_view, name="wa-internal-result"),
    path("internal/auth/", internal.auth_view, name="wa-internal-auth"),
]
