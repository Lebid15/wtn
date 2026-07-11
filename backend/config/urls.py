"""
URL configuration for config project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""

from django.contrib import admin
from django.urls import include, path

from orders import views as order_views

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/store/catalog/", order_views.store_catalog_view, name="store-catalog"),
    path("api/store/buy/", order_views.store_buy_view, name="store-buy"),
    path("api/store/orders/", order_views.store_orders_view, name="store-orders"),
    path("api/store/summary/", order_views.store_summary_view, name="store-summary"),
    path("api/store/report/", order_views.store_report_view, name="store-report"),
    path("api/store/wallet/", order_views.store_wallet_view, name="store-wallet"),
    path("api/store/change-password/", order_views.store_change_password_view, name="store-change-password"),
    path("api/", include("core.urls")),
    path("api/catalog/", include("catalog.urls")),
    path("api/providers/", include("providers.urls")),
    path("api/orders/", include("orders.urls")),
    path("api/pool/", include("pool.urls")),
    path("api/payments/", include("payments.urls")),
    path("api/platform/", include("superadmin.urls")),
    path("api/agent/", include("agent.urls")),
]
