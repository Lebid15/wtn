#!/usr/bin/env bash
# سكربت الإقلاع في الإنتاج (Render): ترحيلات + بذور أوّلية (مرة واحدة) + gunicorn.
set -e

python manage.py migrate --noinput

# البذور: seed_demo متسامح (get_or_create) فيُشغَّل دائماً ليُنشئ أي حسابات ناقصة
# (مثل الوكيل الكبير)؛ أما بذور الكتالوج الثقيلة فتُزرع مرّة واحدة فقط (قاعدة فارغة).
python - <<'PY'
import os, django, subprocess
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()
from catalog.models import Product

subprocess.run(["python", "manage.py", "seed_demo"], check=False)

if not Product.objects.exists():
    for cmd in ["seed_catalog", "seed_providers",
                "seed_pools", "seed_payments", "seed_platform"]:
        print(f"seeding: {cmd}")
        subprocess.run(["python", "manage.py", cmd], check=False)
else:
    print("catalog seeds skipped (data already present)")

# المكتبة العالمية + عرض التنفيذ التلقائي idempotent — تُشغَّل دائماً
subprocess.run(["python", "manage.py", "seed_library"], check=False)
subprocess.run(["python", "manage.py", "seed_auto"], check=False)
PY

exec gunicorn config.wsgi:application \
  --bind "0.0.0.0:${PORT:-8000}" \
  --workers 2 --timeout 120
