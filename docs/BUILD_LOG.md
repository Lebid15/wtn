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
- `GET /api/dealers/` → قائمة الوكلاء + بحث.

#### [1.3] الواجهة (Frontend — React/Vite)
- Vite + React + TypeScript + react-router + axios.
- **التصميم غير المتجاوب:** `index.html` بـ viewport ثابت `width=1366`.
- **نظام الثيمات:** `theme.css` بمتغيّرات CSS (teal افتراضي + blue + orange)،
  يتبدّل بـ `data-theme` — يُطبّق تلقائياً من ثيم المستأجر.
- `auth.tsx`: سياق مصادقة (تخزين JWT، استعادة الجلسة، تطبيق الثيم).
- **صفحة الدخول:** login_id + كلمة السر + دعم 2FA.
- **AdminLayout:** Navbar (الرئيسية/الألعاب/الإعدادات/التقارير + أيقونات
  تنبيه + خروج آمن) + Sub-nav + Footer — مطابق لبنية المرجع، RTL عربي.
- **صفحة قائمة الوكلاء (Bayi Listesi):** جدول متصل بالـ backend فعلياً،
  رصيد موقّع (السالب أحمر)، حالة، مجموعة، أزرار شحن/خصم.
- **تحقّق بصري (لقطات):** الدخول + قائمة الوكلاء تعمل بالبيانات الحقيقية ✅.

#### [2.1] المحفظة — شحن/خصم (Wallet Operations)
- `services.py`: `apply_transaction` ذرّي (select_for_update) + `topup`/`deduct`.
  - يحترم الحد الائتماني (يرفض الخصم تحت `credit_limit`).
  - كل حركة تُسجَّل في دفتر الأستاذ (before/after) داخل معاملة واحدة.
- API: `POST /dealers/<id>/topup|deduct/` + `GET /dealers/<id>/transactions/`.
- **اختبار:** شحن 500→513.57، خصم 100→413.57، خصم ضخم مرفوض (حد ائتماني) ✅.
- الواجهة: `WalletModal` (شحن/خصم بمبلغ + ملاحظة) على قائمة الوكلاء،
  الرصيد يتحدّث فوراً في الجدول بعد العملية.
- **فيديو تحقّق:** شحن وخصم فعلي على الواجهة ✅.

### حالة الجلسة 1
✅ نظام شغّال end-to-end: دخول (JWT) → لوحة مطابقة → قائمة وكلاء → **محفظة تعمل
(شحن/خصم مع حماية الحد الائتماني ودفتر أستاذ)** — كله على PostgreSQL حقيقي.
التالي: كشف حركات الوكيل في الواجهة · قسم الألعاب (Catalog) · التبديل اللحظي (WebSockets).

