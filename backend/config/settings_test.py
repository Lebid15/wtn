"""
إعدادات الفحص: نفس إعدادات الإنتاج مع SQLite في الذاكرة.

Postgres المحلّي غير مشغَّل غالباً، فبدون هذا الملفّ تتجمّد أوامر الفحص على
مهلة الاتصال. الاستعمال:

    python manage.py test --settings=config.settings_test
"""
from .settings import *  # noqa: F401,F403

DATABASES = {"default": {"ENGINE": "django.db.backends.sqlite3", "NAME": ":memory:"}}

# WhiteNoise يقدّم الواجهة المبنية في الإنتاج — لا شأن له بالفحص، وقد لا يكون
# مثبّتاً في البيئة المحلّية.
MIDDLEWARE = [m for m in MIDDLEWARE if "whitenoise" not in m.lower()]  # noqa: F405

PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]  # أسرع في الفحص
