from django.contrib import admin

from .models import Tenant, User, Wallet, WalletTransaction


@admin.register(Tenant)
class TenantAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "subdomain", "status", "theme", "created_at")
    search_fields = ("name", "subdomain")


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ("id", "login_id", "name", "role", "tenant", "status")
    list_filter = ("role", "status", "tenant")
    search_fields = ("login_id", "name")


@admin.register(Wallet)
class WalletAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "balance", "credit_limit", "currency")


@admin.register(WalletTransaction)
class WalletTransactionAdmin(admin.ModelAdmin):
    list_display = ("id", "wallet", "type", "amount", "balance_after", "created_at")
    list_filter = ("type",)
