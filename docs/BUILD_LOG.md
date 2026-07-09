# سجل البناء — Build Log

> توثيق حي لكل خطوة في بناء النظام. المرجع الوظيفي: `reference/FEATURE_MAP.md`.
> الحزمة: Django + DRF + Channels + Celery (backend) · React/Vite (frontend).

---

## الجلسة 1 — التأسيس والقلب (Phase 0 + 1)

### البيئة المتاحة
- Python 3.11 · Node 22 · PostgreSQL 16 · Redis 7 — كلها جاهزة.

### الخطوات

#### [0.1] هيكل المشروع (Monorepo)
```
wtn/
 ├─ backend/     Django + DRF
 ├─ frontend/    React (Vite) SPA
 ├─ docs/        التوثيق
 └─ reference/   المرجع
```

#### [0.2] البيئة الخلفية (Backend)
- venv + تثبيت: Django 5.1, DRF, SimpleJWT, psycopg, corsheaders, pyotp.
- مشروع `config` + تطبيق `core`.
- PostgreSQL: قاعدة `wtn_db` + مستخدم `wtn`.
- إعدادات: PostgreSQL, DRF, JWT (8h/7d), CORS, مستخدم مخصّص، عربي + توقيت.

#### [1.1] نماذج القلب (Models)
- `Tenant` (المستأجر + النطاق + الثيم).
- `User` مخصّص (login_id، الأدوار الهرمية، 2FA، الموديولات).
- `Wallet` (رصيد موقّع ± + حد ائتماني + `available`).
- `WalletTransaction` (دفتر أستاذ before/after).
- Migration أولى مطبّقة ✅.

#### [1.2] المصادقة (Auth API)
- `POST /api/auth/login/` → JWT + بيانات المستخدم + الرصيد. يدعم 2FA (TOTP).
- `GET /api/auth/me/` → المستخدم الحالي.
- أمر `seed_demo`: مستأجر + أدمن (`5550000007 / admin123`) + 8 وكلاء بمحافظ.
- **اختبار ناجح:** الدخول يرجّع التوكن، والباسورد الخطأ مرفوض ✅.

