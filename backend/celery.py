"""
Celery configuration for WTN Backend.

Two workers:
- Worker 1: Provider webhooks, API calls, status updates
- Worker 2: Secondary tasks (emails, SMS, reports, cleanup)
"""

import os
from celery import Celery
from django.conf import settings

# Set the default Django settings module
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'settings')

app = Celery('wtn_backend')

# Load configuration from Django settings
app.config_from_object('django.conf:settings', namespace='CELERY')

# Auto-discover tasks from all installed apps
app.autodiscover_tasks()


@app.task(bind=True, ignore_result=True)
def debug_task(self):
    print(f'Request: {self.request!r}')

