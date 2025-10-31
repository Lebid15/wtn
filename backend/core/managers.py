"""
Custom managers for models.
"""

from django.db import models
from django.utils import timezone


class ActiveManager(models.Manager):
    """Manager for active objects only."""
    
    def get_queryset(self):
        return super().get_queryset().filter(is_active=True)


class TenantScopedManager(models.Manager):
    """Manager that automatically filters by tenant_id."""
    
    def get_queryset(self):
        return super().get_queryset()
    
    def for_tenant(self, tenant_id):
        """Filter queryset for specific tenant."""
        return self.get_queryset().filter(tenant_id=tenant_id)


class RecentManager(models.Manager):
    """Manager for recent objects (last 30 days)."""
    
    def get_queryset(self):
        thirty_days_ago = timezone.now() - timezone.timedelta(days=30)
        return super().get_queryset().filter(created_at__gte=thirty_days_ago)

