"""روابط الـ API للقلب."""
from django.urls import path

from . import views

urlpatterns = [
    path("auth/login/", views.login_view, name="login"),
    path("auth/me/", views.me_view, name="me"),
    path("dealers/", views.dealers_view, name="dealers"),
]
