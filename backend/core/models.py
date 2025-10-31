"""
Core models and base classes shared across all apps.
"""

import secrets
import string
from django.db import models
from django.core.validators import RegexValidator, MinValueValidator
from django.utils import timezone


class TimestampedModel(models.Model):
    """Base model with created_at and updated_at timestamps."""
    
    created_at = models.DateTimeField(default=timezone.now, db_index=True)
    updated_at = models.DateTimeField(auto_now=True, db_index=True)
    
    class Meta:
        abstract = True


class UUIDModel(models.Model):
    """Base model with UUID field following WTN pattern: wtn-{role}-{unique_6_chars}."""
    
    uuid = models.CharField(
        max_length=20,
        unique=True,
        db_index=True,
        editable=False,
        help_text="UUID following pattern: wtn-{role}-{unique_6_chars}"
    )
    
    class Meta:
        abstract = True
    
    @staticmethod
    def generate_unique_suffix(length=6):
        """Generate unique alphanumeric suffix for UUID."""
        characters = string.ascii_lowercase + string.digits
        return ''.join(secrets.choice(characters) for _ in range(length))
    
    @classmethod
    def generate_uuid(cls, role_prefix):
        """Generate UUID with pattern: wtn-{role}-{unique_6_chars}."""
        while True:
            suffix = cls.generate_unique_suffix()
            uuid = f"wtn-{role_prefix}-{suffix}"
            if not cls.objects.filter(uuid=uuid).exists():
                return uuid
    
    def save(self, *args, **kwargs):
        if not self.uuid:
            # Get role prefix from class name
            role_prefix = self.__class__.__name__.lower().replace('model', '')
            if hasattr(self, '_role_prefix'):
                role_prefix = self._role_prefix
            self.uuid = self.generate_uuid(role_prefix)
        super().save(*args, **kwargs)


class BaseModel(TimestampedModel, UUIDModel):
    """Combined base model with UUID and timestamps."""
    
    class Meta:
        abstract = True


# Decimal validators for financial fields
DECIMAL_MAX_DIGITS = 18
DECIMAL_PLACES = 3

# Tenant Code Validator
TENANT_CODE_VALIDATOR = RegexValidator(
    regex=r'^[A-Z0-9]{3,12}$',
    message='Tenant code must be 3-12 uppercase alphanumeric characters.',
    code='invalid_tenant_code'
)
