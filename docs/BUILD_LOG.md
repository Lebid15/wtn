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

#### [3.1] الكتالوج — الألعاب والمنتجات (Catalog)
- تطبيق `catalog`: نماذج `Game`, `Product`, `PriceGroup` (معزولة بالمستأجر).
  - `Product`: Maliyet/Tavsiye + `profit` محسوب + الحالة + نوع التنفيذ + Parçalı.
  - `Game`: Zorunlu Oyuncu ID، ترتيب، حالة.
- API (DRF ViewSets + router): `catalog/games/` و `catalog/products/`
  (CRUD + فلترة `?game=`).
- أمر `seed_catalog`: 5 ألعاب + 12 منتج + 5 مجموعات أسعار.
- الواجهة: صفحة `Games` (قسم OyunPin) — شبكة بطاقات الألعاب + عند الاختيار
  جدول منتجات اللعبة (التكلفة/الموصى/الربح/التنفيذ/الحالة).
- **تحقّق (فيديو + لقطة):** التنقّل للألعاب وفتح PUBG/Free Fire يعرض المنتجات ✅.

#### [3.2] صفحة تفاصيل اللعبة (Oyun-Pin Detay) — إعادة هيكلة UX
- **ملاحظة المالك:** الضغط على لعبة يجب أن **ينقل لصفحة مستقلة** (لا تمدّد
  أسفل الشبكة — مع مئات الألعاب يصير غير عملي). راجعت صور المرجع
  (`oyunpin/02_oyun_listesi.png` + `02b_oyun_detay.png`) قبل التنفيذ.
- الشبكة (`Games`): بطاقات فقط (صورة + اسم + تاريخ + زر تعطيل) تنقل لـ
  `/oyunpin/:id` عبر router.
- صفحة `GameDetail` مطابقة للمرجع بقسمين:
  - **تعديل تفاصيل اللعبة:** اسم، ملاحظة وكيل، وصف، حالة، البيع بالحزم
    (Kurulu), البيع بالكمية (Toplu), إجبار معرّف اللاعب، قالب SMS + حفظ (PATCH).
  - **عمليات المنتجات:** نموذج إضافة منتج (POST) + جدول (المنتج/التكلفة/الموصى/
    الربح/Küpür/الحالة/Parçalı/التاريخ/إجراء).
- حقول جديدة في `Game`: `kurulu_sale`, `toplu_sale`, `sms_template`.

#### [3.3] Pin Listesi + قوائم فرعية خاصة بكل قسم
- راجعت `oyunpin/03_pin_listesi.png` قبل البناء.
- صفحة `PinList` (`/oyunpin/pin-list`): جدول منتجات موحّد **مجمّع حسب اللعبة**
  (رؤوس صفراء) + بحث + أعمدة توجيه API بثلاثة مستويات (رئيسي + بديلين، عنصر
  نائب حتى بناء قسم المزوّدين). أضيف `game_name` لـ ProductSerializer.
- **القائمة الفرعية صارت ديناميكية حسب القسم النشط** (OyunPin ≠ Ayarlar ≠
  Raporlar) — مطابق للمرجع. تبويبات OyunPin السبعة + تمييز التبويب الرئيسي.
- أُضيفت مسارات نائبة (Placeholder) لكل تبويبات الأقسام حتى لا تنكسر الروابط.

#### [3.4] مجموعات الأسعار (Fiyat Grupları) — مصفوفة تسعير
- راجعت `oyunpin/04_fiyat_gruplari.png` (قُصّت من الأعلى لطولها) قبل البناء.
- نموذج `ProductPrice` (منتج × مجموعة → سعر) + migration.
- API: `PriceGroupViewSet` (CRUD) · `GET price-matrix/` (مصفوفة كاملة) ·
  `POST set-price/` (تعيين خلية).
- صفحة `PriceGroups` (`/oyunpin/price-groups`): مصفوفة أعمدة ديناميكية لكل
  مجموعة، صفوف مجمّعة حسب اللعبة (رؤوس صفراء)، **خلايا قابلة للتعديل بالنقر**
  (المخصّص ملوّن، الافتراضي = الموصى). شريط أدوات (إنشاء مجموعة يعمل + بقية
  الأزرار placeholder).
- **اختبار:** تعيين سعر مخصّص (30.50) + إنشاء مجموعة جديدة عبر API ✅.

#### [3.5] أسعار الوكلاء (Bayi Fiyat Ayarları)
- راجعت `oyunpin/05_bayi_fiyat_ayarlari.png` قبل البناء.
- حقول جديدة في `User`: `oyun_load_limit` + `price_group` (FK→PriceGroup).
- API: `GET dealer-prices/` (قائمة) · `POST dealer-prices/<id>/` (تحديث فردي) ·
  `POST dealer-prices/bulk-group/` (تعيين جماعي).
- صفحة `DealerPrices` (`/oyunpin/dealer-prices`): تعيين جماعي بالأعلى + تحذير +
  بحث + جدول (رقم/اسم/حد التحميل/إذن IP خارجي نعم-لا/مجموعة الأسعار/تفاصيل)،
  كل تغيير يُحفظ فوراً.
- **اختبار:** تحديث فردي (مجموعة+حد+IP) + قائمة ✅.

### حالة الجلسة 1
✅ نظام شغّال end-to-end: دخول (JWT) → لوحة مطابقة → قائمة وكلاء → محفظة
(شحن/خصم + حماية ائتمانية + دفتر أستاذ) → **كتالوج ألعاب ومنتجات بأسعار وأرباح**.
كله على PostgreSQL حقيقي، مطابق لبنية المرجع، عربي RTL، بنظام ثيمات.
التالي: مجموعات الأسعار لكل وكيل · الطلبات (Orders) · التبديل اللحظي (WebSockets).

