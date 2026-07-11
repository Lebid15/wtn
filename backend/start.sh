#!/usr/bin/env bash
# سكربت الإقلاع في الإنتاج (Render): ترحيلات + بذور أوّلية (مرة واحدة) + gunicorn.
set -e

python manage.py migrate --noinput

# البذور تُزرع فقط إن كانت القاعدة فارغة (لا تتكرر عند كل نشر).
python - <<'PY'
import os, django, subprocess
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()
from core.models import Tenant
if not Tenant.objects.exists():
    for cmd in ["seed_demo", "seed_catalog", "seed_providers",
                "seed_pools", "seed_payments", "seed_platform"]:
        print(f"seeding: {cmd}")
        subprocess.run(["python", "manage.py", cmd], check=False)
else:
    print("seed skipped (data already present)")
PY

exec gunicorn config.wsgi:application \
  --bind "0.0.0.0:${PORT:-8000}" \
  --workers 2 --timeout 120
