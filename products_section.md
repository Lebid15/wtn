# Products Section Documentation
## وثائق قسم المنتجات

---

## 1. المفهوم الأساسي

### 1.1 المشكلة

**التحديات:**
- المستأجر يحتاج لإضافة مئات المنتجات
- كل منتج يحتوي على عشرات الباقات
- الحصول على صور عالية الجودة
- كتابة أسماء وأوصاف دقيقة
- دعم 3 لغات (عربي، تركي، إنجليزي)

**النتيجة:**
- عملية مُرهقة ومستهلكة للوقت
- احتمالية أخطاء عالية
- صعوبة في التوحيد بين المستأجرين

### 1.2 الحل: المكتبة المركزية

**الفكرة:**
- Super Admin يُنشئ مكتبة مركزية شاملة
- المستأجر **يستورد** من المكتبة (لا يُضيف يدوياً)
- يستطيع **التعديل** على البيانات المستوردة
- **الالتزام الإجباري** بأرقام الربط

---

## 2. المكتبة المركزية (Global Library)

### 2.1 من يُدير المكتبة؟

**Super Admin فقط:**
- إضافة منتجات جديدة
- إضافة باقات للمنتجات
- رفع الصور
- كتابة الأوصاف بـ 3 لغات
- تحديد أرقام الربط (Package Link Numbers)

### 2.2 هيكلية المكتبة

```
المكتبة المركزية:
├─ 🎮 الألعاب
│  ├─ PUBG Mobile
│  │  ├─ PUBG 60 UC (رقم ربط: 60)
│  │  ├─ PUBG 325 UC (رقم ربط: 325)
│  │  ├─ PUBG 660 UC (رقم ربط: 660)
│  │  └─ PUBG 1800 UC (رقم ربط: 1800)
│  │
│  ├─ Free Fire
│  │  ├─ FF 100 Diamonds (رقم ربط: 100)
│  │  ├─ FF 310 Diamonds (رقم ربط: 310)
│  │  └─ FF 520 Diamonds (رقم ربط: 520)
│  │
│  └─ Mobile Legends
│     ├─ ML 86 Diamonds (رقم ربط: 86)
│     └─ ML 172 Diamonds (رقم ربط: 172)
│
├─ 🎵 بطاقات الهدايا
│  ├─ iTunes
│  │  ├─ iTunes $10 (رقم ربط: 10)
│  │  ├─ iTunes $25 (رقم ربط: 25)
│  │  └─ iTunes $50 (رقم ربط: 50)
│  │
│  └─ Google Play
│     ├─ Google Play $10 (رقم ربط: 10)
│     └─ Google Play $25 (رقم ربط: 25)
│
└─ 📱 شحن الجوال
   ├─ STC Saudi
   │  ├─ STC 50 SAR (رقم ربط: 50)
   │  └─ STC 100 SAR (رقم ربط: 100)
   │
   └─ Turkcell
      ├─ Turkcell 50 TRY (رقم ربط: 50)
      └─ Turkcell 100 TRY (رقم ربط: 100)
```

### 2.3 بيانات المنتج في المكتبة

```sql
global_products:
  - id
  - uuid
  - category (Games, Gift Cards, Mobile Credit, ...)
  - product_code (PUBG_MOBILE, FREE_FIRE, ITUNES, ...)
  - default_name_ar (ببجي موبايل)
  - default_name_tr (PUBG Mobile)
  - default_name_en (PUBG Mobile)
  - description_ar
  - description_tr
  - description_en
  - image_url (صورة مركزية على CDN)
  - icon_url (أيقونة صغيرة)
  - is_active
  - sort_order
  - created_at
  - updated_at
```

### 2.4 بيانات الباقة في المكتبة

```sql
global_packages:
  - id
  - uuid
  - global_product_id (FK → global_products)
  - package_link_number (60, 325, 660, ...) ← الأهم!
  - default_name_ar (60 شدة)
  - default_name_tr (60 UC)
  - default_name_en (60 UC)
  - description_ar
  - description_tr
  - description_en
  - suggested_price_usd (سعر مقترح - اختياري)
  - is_active
  - sort_order
  - created_at
  - updated_at
```

---

## 3. استيراد المنتجات للمستأجر

### 3.1 واجهة المكتبة للمستأجر

```
┌─────────────────────────────────────────────────────┐
│ 📚 المكتبة المركزية                               │
│ (اختر المنتجات التي تريد إضافتها لمتجرك)         │
├─────────────────────────────────────────────────────┤
│ البحث: [____________________] 🔍                   │
│ التصنيف: [الكل ▼]                                  │
├─────────────────────────────────────────────────────┤
│                                                     │
│ ┌───────────────────────────────────────────┐      │
│ │ ☑ 🎮 PUBG Mobile                          │      │
│ │    4 باقات (60, 325, 660, 1800 UC)       │      │
│ │    [معاينة الباقات]                      │      │
│ └───────────────────────────────────────────┘      │
│                                                     │
│ ┌───────────────────────────────────────────┐      │
│ │ ☑ 🎮 Free Fire                            │      │
│ │    3 باقات (100, 310, 520 Diamonds)      │      │
│ │    [معاينة الباقات]                      │      │
│ └───────────────────────────────────────────┘      │
│                                                     │
│ ┌───────────────────────────────────────────┐      │
│ │ ☐ 🎵 iTunes                               │      │
│ │    3 باقات ($10, $25, $50)               │      │
│ │    [معاينة الباقات]                      │      │
│ └───────────────────────────────────────────┘      │
│                                                     │
│           [إلغاء]    [استيراد المحدد (2)]         │
└─────────────────────────────────────────────────────┘
```

### 3.2 آلية الاستيراد

**عند الضغط على "استيراد المحدد":**

```
1. النظام ينسخ البيانات من المكتبة المركزية:
   ↓
2. إنشاء سجل في جدول products (الخاص بالمستأجر):
   - tenant_id = المستأجر الحالي
   - global_product_id = رابط للمنتج المركزي
   - display_name = نسخة من default_name (حسب اللغة)
   - description = نسخة من الوصف
   - image_url = نفس الصورة المركزية
   - price_usd = NULL (المستأجر يحدده لاحقاً)
   ↓
3. إنشاء سجلات في جدول packages:
   - tenant_id = المستأجر الحالي
   - product_id = المنتج المُنشأ للتو
   - global_package_id = رابط للباقة المركزية
   - package_link_number = نفس الرقم من المكتبة ← إجباري!
   - display_name = نسخة من default_name
   - price_usd = NULL (المستأجر يحدده)
   ↓
4. رسالة نجاح:
   "تم استيراد 2 منتجات بـ 7 باقات ✅"
```

---

## 4. صلاحيات المستأجر

### 4.1 ما يستطيع فعله ✅

**على مستوى المنتج:**
1. **تغيير الاسم الظاهر:**
   - "ببجي موبايل" → "بطاقات ببجي" أو أي اسم مخصص

2. **تغيير الوصف:**
   - إضافة/تعديل الوصف بالكامل

3. **رفع صورة مخصصة:**
   - استبدال الصورة المركزية بصورة خاصة

4. **تفعيل/تعطيل المنتج:**
   - `is_active = true/false`

5. **حذف المنتج بالكامل:**
   - حذف المنتج مع كل باقاته (soft delete أو hard delete)

6. **تفعيل ميزة العداد:**
   - تتبع عدد المبيعات

7. **تفعيل ميزة الأكواد الرقمية:**
   - `supports_codes = true` → يظهر في قسم المخزون

**على مستوى الباقة:**
1. **إضافة باقة جديدة:**
   - اختيار رقم ربط من القائمة المتاحة للمنتج
   - تسمية الباقة كما يشاء
   - تحديد السعر

2. **تعديل الباقة:**
   - تغيير الاسم الظاهر
   - تغيير السعر
   - تغيير رقم الربط (من القائمة المتاحة فقط)
   - الحفظ تلقائياً عند الخروج من الحقل

3. **حذف الباقة:**
   - حذف باقة معينة (مع التحقق من عدم وجود طلبات معلقة)

### 4.2 القيود المطبقة ⚠️

**أرقام الربط (Package Link Numbers):**
- ✅ يستطيع الاختيار من قائمة منسدلة
- ✅ القائمة تحتوي على أرقام الربط الخاصة بالمنتج فقط
- ❌ لا يستطيع إضافة رقم ربط جديد
- ❌ لا يستطيع استخدام أرقام من منتج آخر

**مثال:**
```
PUBG Mobile → أرقام الربط المتاحة: [60, 90, 100]
  ✅ يستطيع: إضافة باقة برقم 90
  ❌ لا يستطيع: إضافة باقة برقم 350 (لأنه خاص بـ Free Fire)

Free Fire → أرقام الربط المتاحة: [60, 350]
  ✅ يستطيع: إضافة باقة برقم 60
  ❌ لا يستطيع: إضافة باقة برقم 90 (لأنه خاص بـ PUBG)
```

**الربط بالمكتبة:**
- ❌ لا يمكن إنشاء منتج خارج المكتبة المركزية
- ✅ يجب الاستيراد من المكتبة أولاً

---

## 5. مثال عملي كامل

### 5.1 السيناريو

**المستأجر "الشام" يريد إضافة PUBG:**

```
الخطوة 1: الدخول للمكتبة
┌─────────────────────────────────────┐
│ ☑ PUBG Mobile                      │
│    4 باقات                          │
│    [معاينة الباقات]                │
└─────────────────────────────────────┘
         ↓ [استيراد]

الخطوة 2: الاستيراد
✅ تم استيراد: PUBG Mobile (4 باقات)

الخطوة 3: تحديد الأسعار
┌─────────────────────────────────────────┐
│ PUBG Mobile                            │
├─────────────────────────────────────────┤
│ PUBG 60 UC                             │
│ رقم الربط: 60 (لا يمكن التعديل)      │
│ السعر: [2.00] USD                     │
│ ☑ نشط                                 │
├─────────────────────────────────────────┤
│ PUBG 325 UC                            │
│ رقم الربط: 325 (لا يمكن التعديل)     │
│ السعر: [8.50] USD                     │
│ ☑ نشط                                 │
└─────────────────────────────────────────┘
         ↓ [حفظ]

الخطوة 4: ربط المزودين
"الشام" يذهب لقسم ربط المزودين:
┌───────────────────────────────────────┐
│ ربط باقات PUBG مع ZNET              │
├───────────────────────────────────────┤
│ PUBG 60 UC (رقم ربط: 60)            │
│ ↓ يُربط تلقائياً مع                 │
│ ZNET → Product 15, Package 60        │
│        (₺45.00)                       │
└───────────────────────────────────────┘

السبب: نفس رقم الربط (60) ✅
```

---

## 6. التحديثات من المكتبة المركزية

### 6.1 سيناريو التحديث

**Super Admin يضيف باقة جديدة للمكتبة:**

```
PUBG Mobile → باقة جديدة: PUBG 3850 UC (رقم ربط: 3850)
```

**ماذا يحدث للمستأجرين؟**

```
┌────────────────────────────────────────┐
│ 🔔 تحديث متاح للمكتبة               │
│                                        │
│ المنتج: PUBG Mobile                   │
│ الجديد: باقة PUBG 3850 UC            │
│                                        │
│    [تجاهل]    [استيراد الباقة]       │
└────────────────────────────────────────┘
```

**إذا اختار "استيراد الباقة":**
- تُضاف الباقة تلقائياً لمنتج PUBG الخاص به
- مع الاحتفاظ بـ `package_link_number = 3850`
- المستأجر يحدد السعر

### 6.2 تحديث الصور والأوصاف

**Super Admin يُحدّث صورة منتج في المكتبة:**

```
خيارات للمستأجر:
┌────────────────────────────────────────┐
│ 🔔 تحديث متاح: صورة PUBG جديدة      │
│                                        │
│ [عرض الصورة القديمة | الصورة الجديدة] │
│                                        │
│    [تجاهل]    [تطبيق التحديث]        │
└────────────────────────────────────────┘
```

**ملاحظة:**
- إذا المستأجر رفع صورة مخصصة → لا يُطبق التحديث تلقائياً
- إذا يستخدم الصورة المركزية → يُطبق التحديث

---

## 9. واجهة المستخدم للمستأجر (UI Flow)

### 9.1 قسم المنتجات - الصفحة الرئيسية

```
┌─────────────────────────────────────────────────────────┐
│ 📦 المنتجات                        [+ إضافة منتج]    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ ┌─────────────────────────────────────────────────┐    │
│ │ 🎮 PUBG Mobile                                  │    │
│ │ 4 باقات • 125 طلب هذا الشهر                    │    │
│ │ [تفاصيل]                                        │    │
│ └─────────────────────────────────────────────────┘    │
│                                                         │
│ ┌─────────────────────────────────────────────────┐    │
│ │ 🎮 Free Fire                                    │    │
│ │ 3 باقات • 89 طلب هذا الشهر                     │    │
│ │ [تفاصيل]                                        │    │
│ └─────────────────────────────────────────────────┘    │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 9.2 نافذة إضافة منتج (Modal)

**عند الضغط على [+ إضافة منتج]:**

```
┌──────────────────────────────────────────────────────────┐
│ استيراد منتج من المكتبة                         [✕]    │
├──────────────────────────────────────────────────────────┤
│ البحث: [____________] 🔍                                │
├──────────────────────────────────────────────────────────┤
│ ┌──────┬───────────────┬────────┬──────────┬──────────┐ │
│ │ شعار │ المنتج        │ الباقات│ رأس المال│ إجراء   │ │
│ ├──────┼───────────────┼────────┼──────────┼──────────┤ │
│ │ 🎮   │ PUBG Mobile   │ 4      │ $1.20    │ [إضافة] │ │
│ │ 🎮   │ Free Fire     │ 3      │ $0.90    │ [إضافة] │ │
│ │ 🎵   │ iTunes        │ 5      │ $9.50    │ [مضاف ✓]│ │
│ │ 🎵   │ Google Play   │ 4      │ $9.80    │ [إضافة] │ │
│ │ 📱   │ STC Saudi     │ 6      │ 48 SAR   │ [إضافة] │ │
│ └──────┴───────────────┴────────┴──────────┴──────────┘ │
│                                                          │
│                                    [إغلاق]              │
└──────────────────────────────────────────────────────────┘
```

**ملاحظات:**
- "رأس المال" = متوسط التكلفة من المزودين (للمعلومة فقط)
- "مضاف ✓" = المنتج موجود مسبقاً في متجر المستأجر
- بعد الضغط على [إضافة] → يُستورد المنتج مع باقاته

### 9.3 تفاصيل المنتج - Tab System

**عند الضغط على [تفاصيل] على منتج:**

```
┌─────────────────────────────────────────────────────────┐
│ ← رجوع                                                  │
├─────────────────────────────────────────────────────────┤
│ 🎮 PUBG Mobile                                          │
│                                                         │
│ ┌───────────────┬───────────────┐                      │
│ │  المنتج  ●   │   الباقات     │                      │
│ └───────────────┴───────────────┘                      │
├─────────────────────────────────────────────────────────┤
│ الاسم الظاهر:                                          │
│ [ببجي موبايل_____________________________]            │
│                                                         │
│ الوصف:                                                 │
│ ┌─────────────────────────────────────────────────┐    │
│ │ بطاقات شحن لعبة ببجي موبايل...                 │    │
│ └─────────────────────────────────────────────────┘    │
│                                                         │
│ الصورة:                                                │
│ ┌──────────┐                                           │
│ │  🖼️      │  [تغيير الصورة]                         │
│ └──────────┘                                           │
│                                                         │
│ الخيارات:                                              │
│ ☑ نشط                                                  │
│ ☑ تفعيل العداد (عرض عدد المبيعات)                    │
│ ☑ يدعم الأكواد الرقمية (ظهور في قسم المخزون)         │
│                                                         │
│ خطر:                                                   │
│ [🗑️ حذف المنتج بالكامل]                              │
│ (سيتم حذف كل الباقات - لا يمكن التراجع)               │
│                                                         │
│                            [حفظ التغييرات]             │
└─────────────────────────────────────────────────────────┘
```

### 9.4 تفاصيل المنتج - تبويب الباقات

**عند الضغط على تبويب "الباقات":**

```
┌─────────────────────────────────────────────────────────┐
│ ← رجوع                                                  │
├─────────────────────────────────────────────────────────┤
│ 🎮 PUBG Mobile                                          │
│                                                         │
│ ┌───────────────┬───────────────┐                      │
│ │    المنتج     │  الباقات  ●  │                      │
│ └───────────────┴───────────────┘                      │
├─────────────────────────────────────────────────────────┤
│                                        [+ إضافة باقة]  │
│                                                         │
│ ┌───────────────────────────────────────────────────┐  │
│ │ الاسم         │ رقم الربط  │ السعر    │ نشط │ 🗑️│  │
│ ├───────────────┼─────────────┼──────────┼─────┼───┤  │
│ │ [60 شدة____]  │ [60 ▼]      │ [2.00]   │ ☑   │ 🗑️│  │
│ │ [120 شدة___]  │ [90 ▼]      │ [3.50]   │ ☑   │ 🗑️│  │
│ │ [325 شدة___]  │ [100 ▼]     │ [8.00]   │ ☑   │ 🗑️│  │
│ │ [660 شدة___]  │ [660 ▼]     │ [15.00]  │ ☐   │ 🗑️│  │
│ └───────────────┴─────────────┴──────────┴─────┴───┘  │
│                                                         │
│ ملاحظة: التعديلات تُحفظ تلقائياً عند الخروج من الحقل  │
└─────────────────────────────────────────────────────────┘
```

**القائمة المنسدلة لرقم الربط:**

```
عند الضغط على [60 ▼]:
┌──────────────┐
│ 60  ✓        │ ← المختار حالياً
│ 90           │
│ 100          │
│ 660          │
│ 1800         │
└──────────────┘

الأرقام المتاحة = أرقام الربط الخاصة بـ PUBG من المكتبة
```

### 9.5 إضافة باقة جديدة

**عند الضغط على [+ إضافة باقة]:**

```
┌─────────────────────────────────────────────────────┐
│ إضافة باقة جديدة لـ PUBG Mobile                    │
├─────────────────────────────────────────────────────┤
│ اسم الباقة:                                        │
│ [1800 شدة_____________________________]            │
│                                                     │
│ رقم الربط:                                         │
│ [اختر رقم الربط ▼]                                │
│   60                                                │
│   90                                                │
│   100                                               │
│   660                                               │
│   1800  ✓                                           │
│                                                     │
│ السعر (USD):                                        │
│ [30.00_]                                            │
│                                                     │
│ ☑ نشط                                              │
│                                                     │
│              [إلغاء]    [إضافة الباقة]            │
└─────────────────────────────────────────────────────┘
```

### 9.6 الحفظ التلقائي

**آلية الحفظ:**

```javascript
// عند الخروج من أي حقل في جدول الباقات:
onBlur(field) {
  if (hasChanges(field)) {
    autoSave(field);
    showToast("✓ تم الحفظ");
  }
}

// مثال:
المستأجر يغير السعر من 2.00 → 2.50
  ↓ يضغط Tab أو يضغط خارج الحقل
  ↓ تظهر رسالة صغيرة: "✓ تم الحفظ"
  ↓ تختفي بعد 2 ثانية
```

### 9.7 حذف الباقة

**عند الضغط على 🗑️:**

```
┌─────────────────────────────────────────────────────┐
│ ⚠️ تأكيد الحذف                                     │
├─────────────────────────────────────────────────────┤
│ هل تريد حذف الباقة "60 شدة"؟                       │
│                                                     │
│ ملاحظة:                                            │
│ • لا يمكن التراجع عن هذا الإجراء                  │
│ • سيتم حذف كل الروابط مع المزودين                │
│ • الطلبات السابقة ستبقى في السجل                 │
│                                                     │
│              [إلغاء]    [حذف نهائياً]              │
└─────────────────────────────────────────────────────┘
```

### 9.8 حذف المنتج بالكامل

**عند الضغط على [🗑️ حذف المنتج بالكامل]:**

```
┌─────────────────────────────────────────────────────┐
│ ⚠️ تحذير: حذف نهائي                               │
├─────────────────────────────────────────────────────┤
│ أنت على وشك حذف منتج "PUBG Mobile" بالكامل        │
│                                                     │
│ سيتم حذف:                                          │
│ ✓ المنتج نفسه                                      │
│ ✓ كل الباقات (4 باقات)                            │
│ ✓ كل الروابط مع المزودين (12 ربط)                │
│ ✓ قواعد التوجيه التلقائي                          │
│ ✓ الأكواد في المخزون (إن وجدت)                   │
│                                                     │
│ لن يتم حذف:                                        │
│ ✓ الطلبات السابقة (ستبقى في السجل)                │
│                                                     │
│ للتأكيد، اكتب اسم المنتج:                          │
│ [____________________]                              │
│                                                     │
│              [إلغاء]    [حذف نهائياً]              │
└─────────────────────────────────────────────────────┘
```

---

## 10. تحديثات هيكل قاعدة البيانات

## 10. تحديثات هيكل قاعدة البيانات

### 10.1 الجداول المركزية (Global)

```sql
Table global_products {
  id int [pk, increment]
  uuid varchar [unique, not null]
  product_code varchar [unique, not null]  // PUBG_MOBILE, FREE_FIRE
  category varchar  // Games, Gift Cards, Mobile Credit
  
  default_name_ar varchar
  default_name_tr varchar
  default_name_en varchar
  
  description_ar text
  description_tr text
  description_en text
  
  image_url varchar
  icon_url varchar
  
  suggested_capital_usd decimal(18,3) [null]  // متوسط رأس المال (للعرض فقط)
  
  is_active boolean [default: true]
  sort_order int [default: 0]
  
  created_at timestamp [default: `now()`]
  updated_at timestamp [default: `now()`]
}

Table global_package_link_numbers {
  id int [pk, increment]
  global_product_id int [ref: > global_products.id, not null]
  link_number int [not null]  // 60, 90, 100, 325, 660, ...
  
  is_active boolean [default: true]
  created_at timestamp [default: `now()`]
  
  indexes {
    (global_product_id, link_number) [unique]
  }
}
Note: "هذا الجدول يحفظ كل أرقام الربط المتاحة لكل منتج"

Table global_packages {
  id int [pk, increment]
  uuid varchar [unique, not null]
  global_product_id int [ref: > global_products.id, not null]
  package_link_number int [not null]  // FK → global_package_link_numbers
  
  default_name_ar varchar
  default_name_tr varchar
  default_name_en varchar
  
  description_ar text
  description_tr text
  description_en text
  
  suggested_price_usd decimal(18,3) [null]
  
  is_active boolean [default: true]
  sort_order int [default: 0]
  
  created_at timestamp [default: `now()`]
  updated_at timestamp [default: `now()`]
  
  indexes {
    (global_product_id, package_link_number) [unique]
  }
}
```

### 10.2 الجداول الخاصة بالمستأجر

```sql
Table products {
  id int [pk, increment]
  uuid varchar [unique, not null]
  tenant_id int [ref: > tenants.id, not null]
  global_product_id int [ref: > global_products.id, not null]
  
  display_name varchar [not null]  // يمكن التعديل
  description text
  category varchar
  
  image_url varchar
  uses_custom_image boolean [default: false]
  
  supports_codes boolean [default: false]  // دعم المخزون
  enable_counter boolean [default: false]  // تفعيل العداد
  
  is_active boolean [default: true]
  sort_order int [default: 0]
  
  created_at timestamp [default: `now()`]
  updated_at timestamp [default: `now()`]
  
  indexes {
    (tenant_id, global_product_id) [unique]
    (tenant_id, is_active)
  }
}

Table packages {
  id int [pk, increment]
  uuid varchar [unique, not null]
  tenant_id int [ref: > tenants.id, not null]
  product_id int [ref: > products.id, not null]
  global_package_id int [ref: > global_packages.id, null]  // null للباقات المضافة يدوياً
  
  package_link_number int [not null]  // من القائمة المتاحة في global_package_link_numbers
  
  display_name varchar [not null]  // يمكن التعديل
  description text
  
  price_usd decimal(18,3) [not null]
  
  is_active boolean [default: true]
  sort_order int [default: 0]
  
  created_at timestamp [default: `now()`]
  updated_at timestamp [default: `now()`]
  
  indexes {
    (tenant_id, product_id, package_link_number) [unique]
    (product_id, is_active)
  }
}
```

### 10.3 Constraints & Validations

**في الـ Backend (Django):**

```python
# عند إضافة/تعديل باقة
def validate_package_link_number(package):
    # التحقق: رقم الربط موجود في القائمة المتاحة للمنتج
    available_numbers = GlobalPackageLinkNumber.objects.filter(
        global_product_id=package.product.global_product_id,
        is_active=True
    ).values_list('link_number', flat=True)
    
    if package.package_link_number not in available_numbers:
        raise ValidationError(
            f"رقم الربط {package.package_link_number} غير متاح لهذا المنتج. "
            f"الأرقام المتاحة: {list(available_numbers)}"
        )

# عند حذف منتج
def delete_product_cascade(product):
    # حذف كل الباقات
    packages = Package.objects.filter(product=product)
    
    # حذف روابط المزودين
    PackageProviderMapping.objects.filter(package__in=packages).delete()
    
    # حذف قواعد التوجيه
    RoutingRule.objects.filter(package__in=packages).delete()
    
    # حذف الأكواد من المخزون
    StockCode.objects.filter(package__in=packages).delete()
    
    # حذف الباقات
    packages.delete()
    
    # حذف المنتج
    product.delete()
```

---

## 11. API Endpoints

### 11.1 للمستأجر

**المكتبة:**
- `GET /api/tenant/library/products` - قائمة المنتجات في المكتبة المركزية
- `GET /api/tenant/library/products/{id}` - تفاصيل منتج من المكتبة
- `POST /api/tenant/products/import` - استيراد منتج من المكتبة

**المنتجات:**
- `GET /api/tenant/products` - قائمة منتجات المستأجر
- `GET /api/tenant/products/{id}` - تفاصيل منتج
- `PATCH /api/tenant/products/{id}` - تعديل منتج
- `DELETE /api/tenant/products/{id}` - حذف منتج

**الباقات:**
- `GET /api/tenant/products/{product_id}/packages` - قائمة باقات منتج
- `GET /api/tenant/products/{product_id}/available-link-numbers` - أرقام الربط المتاحة
- `POST /api/tenant/products/{product_id}/packages` - إضافة باقة
- `PATCH /api/tenant/packages/{id}` - تعديل باقة (حفظ تلقائي)
- `DELETE /api/tenant/packages/{id}` - حذف باقة

### 11.2 للـ Super Admin

**المكتبة المركزية:**
- `GET /api/super-admin/global-products` - قائمة المنتجات المركزية
- `POST /api/super-admin/global-products` - إضافة منتج للمكتبة
- `PATCH /api/super-admin/global-products/{id}` - تعديل منتج
- `DELETE /api/super-admin/global-products/{id}` - حذف منتج

**أرقام الربط:**
- `GET /api/super-admin/global-products/{id}/link-numbers` - أرقام الربط المتاحة
- `POST /api/super-admin/global-products/{id}/link-numbers` - إضافة رقم ربط جديد
- `DELETE /api/super-admin/link-numbers/{id}` - حذف رقم ربط

**الباقات المركزية:**
- `GET /api/super-admin/global-products/{id}/packages` - باقات منتج
- `POST /api/super-admin/global-products/{id}/packages` - إضافة باقة
- `PATCH /api/super-admin/global-packages/{id}` - تعديل باقة
- `DELETE /api/super-admin/global-packages/{id}` - حذف باقة

---

## 12. نقاط مهمة للتطوير

### 12.1 الحفظ التلقائي (Auto-Save)

**Frontend (React):**
```javascript
// استخدام debounce لتجنب الطلبات الكثيرة
const autoSave = debounce(async (fieldName, value) => {
  try {
    await api.patch(`/packages/${packageId}`, {
      [fieldName]: value
    });
    toast.success("✓ تم الحفظ");
  } catch (error) {
    toast.error("❌ فشل الحفظ");
  }
}, 1000);

// في Input Component
<input
  value={displayName}
  onChange={(e) => setDisplayName(e.target.value)}
  onBlur={() => autoSave('display_name', displayName)}
/>
```

### 12.2 التحقق من الحذف

**قبل حذف باقة:**
```python
def can_delete_package(package):
    # فحص الطلبات المعلقة
    pending_orders = Order.objects.filter(
        package=package,
        status__in=['pending', 'processing']
    ).count()
    
    if pending_orders > 0:
        raise ValidationError(
            f"لا يمكن حذف الباقة. يوجد {pending_orders} طلب معلق"
        )
    
    return True
```

### 12.3 البحث في المكتبة

**Frontend:**
```javascript
// بحث في المنتجات
const searchLibrary = (query) => {
  return globalProducts.filter(product => 
    product.default_name_ar.includes(query) ||
    product.default_name_en.includes(query) ||
    product.category.includes(query)
  );
};
```

### 12.4 الصور (CDN)

**استراتيجية الصور:**
- المكتبة المركزية: AWS S3 / Cloudflare R2
- صور المستأجرين المخصصة: مجلد منفصل بـ tenant_id
- Lazy Loading للصور
- WebP format للضغط

```
https://cdn.wtn.com/global/products/pubg_mobile.webp
https://cdn.wtn.com/tenants/123/products/custom_pubg.webp
```

---

## 13. TODO: نقاط للمناقشة

### ✅ تم الحل:
1. ~~إضافة باقات مخصصة~~ → يستطيع، من القائمة المتاحة
2. ~~حذف المنتجات~~ → يستطيع حذف كامل
3. ~~أرقام الربط~~ → من قائمة ثابتة لكل منتج في المكتبة

### ⏳ بانتظار المناقشة:
1. ~~**الفئات (Categories)**~~ ✅ تم الحل
   - لا يوجد فئات منفصلة
   - كل شيء يُعتبر "منتج" (PUBG, iTunes, بطاقات، تطبيقات)
   - المنتج يحتوي على باقات

2. ~~**العداد (Counter)**~~ ✅ تم الحل
   - ميزة اختيارية لكل منتج
   - المستأجر يحدد سعر الوحدة (مثلاً: $0.0002 لكل شدة)
   - الوكيل يدخل الكمية المطلوبة
   - يُنشأ طلب برقم ربط خاص بالعداد
   - التفاصيل أدناه ↓

3. ~~**الباقات غير المرتبطة بالمكتبة**~~ ✅ تم الحل
   - يستطيع إضافة أي عدد من الباقات
   - شرط: اختيار رقم ربط من القائمة المتاحة (إجباري)

---

## 14. ميزة العداد (Counter Feature)

### 14.1 المفهوم

**العداد = باقة ديناميكية:**
- بدلاً من اختيار باقة ثابتة (60 شدة، 325 شدة)
- الوكيل يُدخل الكمية التي يريدها
- السعر يُحسب تلقائياً: `الكمية × سعر الوحدة`

**مثال:**
```
PUBG Mobile - العداد مفعّل:
- سعر الشدة الواحدة: $0.0002
- الوكيل يطلب: 500 شدة
- السعر: 500 × $0.0002 = $0.10
```

### 14.2 الإعداد من قبل Super Admin

**في المكتبة المركزية:**

```
PUBG Mobile:
├─ PUBG 60 UC (رقم ربط: 60)
├─ PUBG 325 UC (رقم ربط: 325)
├─ PUBG 660 UC (رقم ربط: 660)
├─ PUBG 1800 UC (رقم ربط: 1800)
└─ عداد PUBG (رقم ربط: 9999) ← باقة خاصة للعداد
   - is_counter: true
   - default_name_ar: "عداد"
   - default_name_en: "Counter"
```

**ملاحظة:**
- كل منتج له رقم ربط ثابت للعداد (مثلاً: 9999)
- Super Admin يُضيف باقة "العداد" مع رقم الربط
- هذه الباقة **لا تُستورد** تلقائياً - يجب تفعيلها من المستأجر

### 14.3 تفعيل العداد من المستأجر

**في تفاصيل المنتج - تبويب "المنتج":**

```
┌─────────────────────────────────────────────────────────┐
│ 🎮 PUBG Mobile                                          │
│                                                         │
│ الخيارات:                                              │
│ ☑ نشط                                                  │
│ ☑ تفعيل العداد                                        │ ← checkbox
│   └─ سعر الوحدة (USD): [0.0002____]                   │
│      الدقة: [4] خانات عشرية                           │
│      الحد الأدنى: [10] وحدة                            │
│      الحد الأقصى: [10000] وحدة                         │
│                                                         │
│ ☐ يدعم الأكواد الرقمية                                │
└─────────────────────────────────────────────────────────┘
```

**عند تفعيل العداد:**
```
1. النظام يفحص: هل باقة "العداد" موجودة في المكتبة؟
   ✅ نعم → يستوردها تلقائياً
   ❌ لا → رسالة خطأ: "العداد غير متوفر لهذا المنتج"

2. تُضاف باقة "العداد" لجدول packages:
   - package_link_number = 9999
   - display_name = "عداد"
   - is_counter = true
   - unit_price_usd = 0.0002
   - min_quantity = 10
   - max_quantity = 10000
   - decimal_precision = 4
```

### 14.4 واجهة الوكيل

**في صفحة المنتجات للوكيل:**

```
┌──────────────────────────────────────────┐
│ 🎮 PUBG Mobile                           │
│                                          │
│ الباقات:                                │
│ ┌──────────────────────┐                │
│ │ 60 شدة              │ $2.00  [شراء]  │
│ │ 325 شدة             │ $8.00  [شراء]  │
│ │ 660 شدة             │ $15.00 [شراء]  │
│ └──────────────────────┘                │
│                                          │
│ ⚡ [العداد - اختر الكمية]              │ ← زر مميز
└──────────────────────────────────────────┘
```

**عند الضغط على [العداد]:**

```
┌──────────────────────────────────────────┐
│ ⚡ عداد PUBG Mobile                     │
├──────────────────────────────────────────┤
│ كم شدة تريد؟                            │
│                                          │
│ ┌────────────────────────────┐          │
│ │ [500______] شدة            │          │
│ └────────────────────────────┘          │
│                                          │
│ الحد الأدنى: 10                         │
│ الحد الأقصى: 10,000                     │
│                                          │
│ ┌────────────────────────────┐          │
│ │ السعر: $0.1000            │          │
│ │ (500 × $0.0002)           │          │
│ └────────────────────────────┘          │
│                                          │
│ بيانات الحساب:                          │
│ Player ID: [__________]                 │
│                                          │
│       [إلغاء]    [تأكيد الطلب]         │
└──────────────────────────────────────────┘
```

**الحساب الديناميكي:**
```javascript
// عند تغيير الكمية
onChange(quantity) {
  if (quantity < minQuantity) {
    error("الحد الأدنى: " + minQuantity);
  } else if (quantity > maxQuantity) {
    error("الحد الأقصى: " + maxQuantity);
  } else {
    const price = (quantity * unitPrice).toFixed(decimalPrecision);
    updatePrice(price);
  }
}
```

### 14.5 معالجة الطلب

**إنشاء الطلب:**

```sql
INSERT INTO orders (
  tenant_id,
  agent_id,
  product_id,
  package_id,  -- باقة "العداد"
  package_link_number,  -- 9999
  
  quantity,  -- 500 ← جديد للعداد فقط
  unit_price_usd,  -- 0.0002
  price_usd,  -- 0.1000
  
  customer_data,  -- {"player_id": "ABC123"}
  status  -- 'pending'
)
```

**التوجيه:**

```
الطلب: 500 شدة PUBG (رقم ربط: 9999)
  ↓
Priority 1: ZNET
  - هل ZNET يدعم العداد (رقم ربط 9999)? ✅
  - API call:
    POST /api/order
    {
      "product_id": 15,
      "package_link": 9999,
      "quantity": 500
    }
  - ZNET يرد: السعر $0.095 (تكلفتهم)
  - يُكمل الطلب ✅

Priority 2: شام تيك (وسيط داخلي)
  - يظهر الطلب في لوحة شام تيك:
    "طلب من الشام: 500 شدة PUBG"
  - شام تيك يدخل لحساب الوسيط لديه (ZDK مثلاً)
  - يضغط زر العداد
  - يُدخل: 500
  - السعر يُحسب: $0.10
  - يُخصم من محفظة الوسيط
  - يوافق على الطلب ✅
```

### 14.6 قاعدة البيانات

**حقول إضافية في جدول packages:**

```sql
Table packages {
  -- ... الحقول الموجودة
  
  -- حقول العداد
  is_counter boolean [default: false]
  unit_price_usd decimal(18,3) [null]  -- سعر الوحدة
  min_quantity int [null]              -- الحد الأدنى
  max_quantity int [null]              -- الحد الأقصى
  decimal_precision int [default: 2]   -- عدد الخانات العشرية للسعر
}
```

**حقول إضافية في جدول orders:**

```sql
Table orders {
  -- ... الحقول الموجودة
  
  -- حقول العداد
  quantity int [null]  -- الكمية (للعداد فقط)
  unit_price_usd decimal(18,3) [null]  -- سعر الوحدة (للعداد)
  
  Note: "إذا package.is_counter = true، يجب ملء quantity و unit_price_usd"
}
```

### 14.7 Validation

**Backend (Django):**

```python
def validate_counter_order(order):
    package = order.package
    
    if not package.is_counter:
        return  # ليس عداد - تخطي
    
    # التحقق من الحقول المطلوبة
    if not order.quantity:
        raise ValidationError("الكمية مطلوبة للعداد")
    
    if not order.unit_price_usd:
        raise ValidationError("سعر الوحدة مطلوب للعداد")
    
    # التحقق من الحدود
    if order.quantity < package.min_quantity:
        raise ValidationError(
            f"الحد الأدنى: {package.min_quantity}"
        )
    
    if order.quantity > package.max_quantity:
        raise ValidationError(
            f"الحد الأقصى: {package.max_quantity}"
        )
    
    # التحقق من السعر
    expected_price = order.quantity * package.unit_price_usd
    if abs(order.price_usd - expected_price) > 0.001:
        raise ValidationError("السعر المحسوب غير صحيح")
```

### 14.8 أمثلة واقعية

**مثال 1: PUBG Mobile**
```
- سعر الوحدة: $0.0002
- الحد الأدنى: 10 شدة
- الحد الأقصى: 10,000 شدة
- الدقة: 4 خانات

الوكيل يطلب 1,250 شدة:
  السعر = 1250 × 0.0002 = $0.2500
```

**مثال 2: iTunes (بالدولار)**
```
- سعر الوحدة: $1.00 (دولار كامل)
- الحد الأدنى: 1 دولار
- الحد الأقصى: 100 دولار
- الدقة: 2 خانة

الوكيل يطلب 15 دولار:
  السعر = 15 × 1.00 = $15.00
```

---

## 15. هيكل قاعدة البيانات النهائي

### 15.1 الجداول المركزية (Global) - نهائي

```sql
Table global_products {
  id int [pk, increment]
  uuid varchar [unique, not null]
  product_code varchar [unique, not null]  // PUBG_MOBILE, FREE_FIRE
  product_name varchar [not null]  // PUBG Mobile, Free Fire (إنجليزي)
  display_name varchar [null]  // اختياري - للـ Super Admin والمستأجر
  
  description text [null]  // اختياري - بلغة واحدة
  
  image_url varchar
  icon_url varchar
  
  suggested_capital_usd decimal(18,3) [null]  // متوسط رأس المال للعرض
  
  is_active boolean [default: true]
  sort_order int [default: 0]
  
  created_at timestamp [default: `now()`]
  updated_at timestamp [default: `now()`]
}

Table price_groups {
  id int [pk, increment]
  tenant_id int [ref: > tenants.id, not null]
  group_name varchar(100) [not null]  // "VIP1", "VIP2", "Default"
  is_default boolean [default: false]
  created_at timestamp [default: `now()`]
  updated_at timestamp [default: `now()`]
  
  indexes {
    (tenant_id, group_name) [unique]
  }
}

Table global_package_link_numbers {
  id int [pk, increment]
  global_product_id int [ref: > global_products.id, not null]
  link_number int [not null]  // 60, 90, 100, 325, 660, 9999 (للعداد)
  
  is_counter boolean [default: false]  // true فقط لرقم العداد (9999)
  is_active boolean [default: true]
  
  created_at timestamp [default: `now()`]
  
  indexes {
    (global_product_id, link_number) [unique]
  }
}

Table global_packages {
  id int [pk, increment]
  uuid varchar [unique, not null]
  global_product_id int [ref: > global_products.id, not null]
  package_link_number int [not null]
  
  package_name varchar [not null]  // إنجليزي
  display_name varchar [null]  // اختياري
  description text [null]  // اختياري - بلغة واحدة
  
  suggested_price_usd decimal(18,3) [null]
  
  is_counter boolean [default: false]  // true للعداد
  
  is_active boolean [default: true]
  sort_order int [default: 0]
  
  created_at timestamp [default: `now()`]
  updated_at timestamp [default: `now()`]
  
  indexes {
    (global_product_id, package_link_number) [unique]
  }
}
```

### 15.2 الجداول الخاصة بالمستأجر - نهائي

```sql
Table products {
  id int [pk, increment]
  uuid varchar [unique, not null]
  tenant_id int [ref: > tenants.id, not null]
  global_product_id int [ref: > global_products.id, not null]
  
  display_name varchar [not null]  // قابل للتعديل
  description text
  
  image_url varchar
  uses_custom_image boolean [default: false]
  
  supports_codes boolean [default: false]  // دعم المخزون
  
  // حقول العداد
  counter_enabled boolean [default: false]
  counter_unit_price_usd decimal(18,3) [null]
  counter_min_quantity int [null]
  counter_max_quantity int [null]
  counter_decimal_precision int [default: 2]
  
  is_active boolean [default: true]
  sort_order int [default: 0]
  
  created_at timestamp [default: `now()`]
  updated_at timestamp [default: `now()`]
  
  indexes {
    (tenant_id, global_product_id) [unique]
    (tenant_id, is_active)
  }
}

Table packages {
  id int [pk, increment]
  uuid varchar [unique, not null]
  tenant_id int [ref: > tenants.id, not null]
  product_id int [ref: > products.id, not null]
  global_package_id int [ref: > global_packages.id, null]  // null للباقات المضافة يدوياً
  
  package_link_number int [not null]  // من global_package_link_numbers فقط
  
  display_name varchar [not null]
  description text
  
  capital_usd decimal(18,3) [not null, default: 0]  // رأس المال (التكلفة الأساسية)
  
  // حقول العداد (تُملأ من product.counter_* عند التفعيل)
  is_counter boolean [default: false]
  unit_price_usd decimal(18,3) [null]
  min_quantity int [null]
  max_quantity int [null]
  decimal_precision int [null]
  
  is_active boolean [default: true]
  sort_order int [default: 0]
  
  created_at timestamp [default: `now()`]
  updated_at timestamp [default: `now()`]
  
  indexes {
    (tenant_id, product_id, package_link_number) [unique]
    (product_id, is_active)
    (product_id, is_counter)
  }
  
  Note: "CHECK (capital_usd >= 0)"
}

Table package_prices {
  id int [pk, increment]
  package_id int [ref: > packages.id, not null]
  price_group_id int [ref: > price_groups.id, not null]
  price_usd decimal(18,3) [not null, default: 0]
  created_at timestamp [default: `now()`]
  updated_at timestamp [default: `now()`]
  
  indexes {
    (package_id, price_group_id) [unique]
  }
  
  Note: "CHECK (price_usd >= capital_usd)"  // السعر يجب أن يكون >= رأس المال
}

Table orders {
  id int [pk, increment]
  uuid varchar [unique, not null]
  tenant_id int [ref: > tenants.id, not null]
  agent_id int [ref: > agents.id, not null]
  product_id int [ref: > products.id, not null]
  package_id int [ref: > packages.id, not null]
  
  package_link_number int [not null]  // نسخة للحفظ التاريخي
  
  // الأسعار والتكاليف
  cost_usd decimal(18,3) [not null]           // رأس المال (التكلفة من المزود)
  price_usd decimal(18,3) [not null]          // سعر البيع بالدولار
  profit_usd decimal(18,3) [not null]         // الربح = price_usd - cost_usd
  
  agent_currency_id int [ref: > tenant_currencies.id, not null]
  price_local decimal(18,3) [not null]        // السعر بعملة الوكيل
  exchange_rate decimal(18,6) [not null]      // سعر الصرف المستخدم
  
  price_group_id int [ref: > price_groups.id]  // مجموعة السعر المستخدمة
  
  // سعر البيع للزبون (للتقارير فقط - لا يُرسل للمستأجر)
  customer_price_local decimal(18,3) [null]    // ما دفعه الزبون النهائي
  customer_profit_local decimal(18,3) [null]   // ربح الوكيل من الزبون
  
  // حقول العداد (null للباقات العادية)
  quantity int [null]                          // الكمية المطلوبة (500 شدة)
  unit_price_usd decimal(18,3) [null]          // سعر الوحدة وقت الطلب
  unit_cost_usd decimal(18,3) [null]           // تكلفة الوحدة من المزود
  
  // سلسلة التوجيه
  parent_order_id int [ref: > orders.id, null]
  child_order_id int [ref: > orders.id, null]
  routing_level int [default: 1]
  
  // بيانات الطلب
  customer_data jsonb
  provider_response jsonb
  
  status varchar [default: 'pending']
  error_message text
  
  // الوقت
  duration_seconds int [null]                  // مدة تنفيذ الطلب بالثواني
  completed_at timestamp
  failed_at timestamp
  created_at timestamp [default: `now()`]
  updated_at timestamp [default: `now()`]
  
  indexes {
    (tenant_id, created_at)
    (agent_id, created_at)
    (status)
    (parent_order_id)
    (child_order_id)
  }
}
```

### 15.3 ملاحظات على التصميم

**1. العداد في products vs packages:**
```
products.counter_enabled = true
  ↓ يُنشئ تلقائياً
packages (is_counter = true)
  - ينسخ القيم من product.counter_*
  - يظهر للوكيل كخيار منفصل
```

**2. package_link_number في orders:**
```
لماذا نحفظه رغم وجود package_id؟
- لو المستأجر حذف الباقة لاحقاً
- نحتاج رقم الربط للسجلات التاريخية
- ضروري لإعادة التوجيه
```

**3. quantity و unit_price في orders:**
```
للباقات العادية:
  quantity = NULL
  unit_price_usd = NULL
  price_usd = السعر الثابت

للعداد:
  quantity = 500
  unit_price_usd = 0.0002
  price_usd = 500 × 0.0002 = 0.10
```

### 15.4 Constraints & Triggers

**Constraint 1: العداد يتطلب القيم**
```sql
ALTER TABLE packages
ADD CONSTRAINT check_counter_fields
CHECK (
  (is_counter = false) OR
  (is_counter = true AND 
   unit_price_usd IS NOT NULL AND
   min_quantity IS NOT NULL AND
   max_quantity IS NOT NULL AND
   decimal_precision IS NOT NULL)
);
```

**Constraint 2: الطلبات للعداد**
```sql
ALTER TABLE orders
ADD CONSTRAINT check_counter_order_fields
CHECK (
  (package.is_counter = false AND quantity IS NULL) OR
  (package.is_counter = true AND quantity IS NOT NULL AND unit_price_usd IS NOT NULL)
);
```

**Trigger: تفعيل العداد تلقائياً**
```sql
CREATE TRIGGER auto_create_counter_package
AFTER UPDATE ON products
FOR EACH ROW
WHEN (NEW.counter_enabled = true AND OLD.counter_enabled = false)
BEGIN
  -- البحث عن رقم ربط العداد في المكتبة
  SELECT link_number INTO counter_link
  FROM global_package_link_numbers
  WHERE global_product_id = NEW.global_product_id
    AND is_counter = true;
  
  -- إنشاء باقة العداد
  INSERT INTO packages (
    tenant_id, product_id, package_link_number,
    display_name, is_counter,
    unit_price_usd, min_quantity, max_quantity, decimal_precision
  ) VALUES (
    NEW.tenant_id, NEW.id, counter_link,
    'عداد', true,
    NEW.counter_unit_price_usd, NEW.counter_min_quantity,
    NEW.counter_max_quantity, NEW.counter_decimal_precision
  );
END;
```

---

## 16. ملخص القرارات النهائية

### ✅ تم الحسم:

1. **لا يوجد فئات منفصلة**
   - كل شيء "منتج" (PUBG, iTunes, بطاقات)
   - المنتج يحتوي على باقات

2. **أرقام الربط**
   - يجب اختيارها من القائمة المتاحة (إجباري)
   - لكل منتج قائمة خاصة به
   - Super Admin فقط يضيف أرقام جديدة

3. **العداد**
   - باقة خاصة برقم ربط ثابت (مثلاً: 9999)
   - المستأجر يفعّلها ويحدد سعر الوحدة
   - تُنشأ تلقائياً عند التفعيل
   - الوكيل يدخل الكمية المطلوبة

4. **الصلاحيات**
   - المستأجر: تعديل الأسماء والأسعار، حذف المنتجات/الباقات
   - لا يستطيع: تعديل أرقام الربط، إضافة منتج خارج المكتبة

5. **الحذف**
   - يستطيع حذف منتج بالكامل (مع تأكيد)
   - يستطيع حذف باقات فردية
   - مع فحص الطلبات المعلقة

### 📝 جاهز للتطوير:

- ✅ هيكل قاعدة البيانات كامل
- ✅ واجهات المستخدم محددة
- ✅ API Endpoints واضحة
- ✅ Validations معرّفة

**التالي: مناقشة تفاصيل الحقول إذا لزم الأمر** 🚀

```sql
Table global_products {
  id int [pk, increment]
  uuid varchar [unique, not null]
  product_code varchar [unique, not null]  // PUBG_MOBILE, FREE_FIRE
  category varchar  // Games, Gift Cards, Mobile Credit
  
  default_name_ar varchar
  default_name_tr varchar
  default_name_en varchar
  
  description_ar text
  description_tr text
  description_en text
  
  image_url varchar
  icon_url varchar
  
  is_active boolean [default: true]
  sort_order int [default: 0]
  
  created_at timestamp [default: `now()`]
  updated_at timestamp [default: `now()`]
}

Table global_packages {
  id int [pk, increment]
  uuid varchar [unique, not null]
  global_product_id int [ref: > global_products.id, not null]
  
  package_link_number int [not null]  // ← الأهم! (60, 325, 660, ...)
  
  default_name_ar varchar
  default_name_tr varchar
  default_name_en varchar
  
  description_ar text
  description_tr text
  description_en text
  
  suggested_price_usd decimal(18,3) [null]
  
  is_active boolean [default: true]
  sort_order int [default: 0]
  
  created_at timestamp [default: `now()`]
  updated_at timestamp [default: `now()`]
  
  indexes {
    (global_product_id, package_link_number) [unique]
  }
}
```

### 7.2 الجداول الخاصة بالمستأجر

```sql
Table products {
  id int [pk, increment]
  uuid varchar [unique, not null]
  tenant_id int [ref: > tenants.id, not null]
  global_product_id int [ref: > global_products.id, not null]  // الربط بالمكتبة
  
  display_name varchar [not null]  // ← يمكن التعديل
  description text                  // ← يمكن التعديل
  category varchar
  
  image_url varchar                 // ← يمكن التعديل (رفع صورة مخصصة)
  uses_custom_image boolean [default: false]  // لو true = لا يُحدث من المكتبة
  
  supports_codes boolean [default: false]  // ← دعم المخزون
  
  is_active boolean [default: true]
  sort_order int [default: 0]
  
  created_at timestamp [default: `now()`]
  updated_at timestamp [default: `now()`]
  
  indexes {
    (tenant_id, global_product_id) [unique]  // مستأجر لا يستورد نفس المنتج مرتين
  }
}

Table packages {
  id int [pk, increment]
  uuid varchar [unique, not null]
  tenant_id int [ref: > tenants.id, not null]
  product_id int [ref: > products.id, not null]
  global_package_id int [ref: > global_packages.id, not null]  // الربط بالمكتبة
  
  package_link_number int [not null]  // ← من المكتبة، لا يمكن التعديل!
  
  display_name varchar [not null]  // ← يمكن التعديل
  description text                  // ← يمكن التعديل
  
  price_usd decimal(18,3) [not null]  // ← يحدده المستأجر
  
  is_active boolean [default: true]
  sort_order int [default: 0]
  
  created_at timestamp [default: `now()`]
  updated_at timestamp [default: `now()`]
  
  indexes {
    (tenant_id, product_id, package_link_number) [unique]
    (product_id, is_active)
  }
}
```

---

## 8. نقاط مهمة للتطوير

### 8.1 Super Admin Dashboard

**إدارة المكتبة المركزية:**
- ✅ إضافة/تعديل/حذف منتجات
- ✅ إضافة/تعديل/حذف باقات
- ✅ رفع الصور على CDN
- ✅ كتابة الأوصاف بـ 3 لغات
- ✅ تحديد أرقام الربط
- ✅ تفعيل/تعطيل منتجات
- ✅ إرسال إشعارات التحديثات للمستأجرين

### 8.2 Tenant Dashboard

**استيراد وإدارة المنتجات:**
- ✅ تصفح المكتبة المركزية
- ✅ استيراد منتجات
- ✅ تحديد الأسعار
- ✅ تخصيص الأسماء والأوصاف
- ✅ رفع صور مخصصة
- ✅ تفعيل دعم المخزون
- ✅ استقبال إشعارات التحديثات

### 8.3 التحديات التقنية

**1. أرقام الربط (Package Link Numbers):**
- يجب ضمان عدم تعديلها من المستأجر (validation في الـ backend)
- Unique constraint: `(global_product_id, package_link_number)`

**2. التزامن مع المكتبة:**
- Celery task يفحص التحديثات يومياً
- إشعارات للمستأجرين عند إضافة باقات جديدة

**3. الصور:**
- CDN للصور المركزية (AWS S3, Cloudflare R2)
- رفع الصور المخصصة للمستأجر في مجلد منفصل

**4. الترجمة:**
- عرض الأسماء حسب لغة المستأجر (`default_language`)
- Fallback للإنجليزية إذا الترجمة غير متوفرة

---

## TODO: نقاط للمناقشة

1. **إضافة باقات مخصصة:**
   - هل المستأجر يستطيع إضافة باقة خاصة (غير موجودة في المكتبة)؟
   - إذا نعم، ما رقم الربط الخاص بها؟

2. **حذف المنتجات:**
   - هل المستأجر يستطيع حذف منتج مستورد؟
   - أم فقط تعطيله (`is_active = false`)؟

3. **الفئات (Categories):**
   - هل الفئات ثابتة في المكتبة؟
   - أم المستأجر يستطيع إنشاء فئات مخصصة؟
