# نظام الإعلانات والإشعارات - Announcements & Notifications System
## عرض الأخبار والتحديثات في Dashboard

---

## 1. نظرة عامة (Overview)

### 1.1 المفهوم

نظام متعدد المستويات للإعلانات:

```
المستويات:
├─ Super Admin → جميع المستأجرين
│  └─ أخبار النظام، تحديثات، صيانة
│
└─ Tenant → وكلاءه فقط
   └─ إعلانات خاصة، عروض، تعليمات
```

### 1.2 الميزات

✅ **Super Admin:**
- إنشاء إعلانات عامة لجميع المستأجرين
- تنسيق نص غني (Rich Text Editor)
- إضافة صور/أيقونات
- جدولة الظهور (من-إلى)
- تحديث/حذف الإعلانات

✅ **Tenant:**
- إنشاء إعلانات لوكلائه فقط
- نفس محرر النصوص الغني
- صور وأيقونات
- جدولة وأرشفة

✅ **العرض:**
- كاردات أفقية في Dashboard
- ترتيب حسب الأهمية/التاريخ
- دعم الصور والأيقونات
- تنسيق HTML

---

## 2. هيكل قاعدة البيانات

### 2.1 جدول `announcements`

```sql
Table announcements {
  id int [pk, increment]
  
  // المصدر
  created_by_type varchar(20) [not null]  // "super_admin", "tenant"
  super_admin_id int [ref: > super_admins.id]
  tenant_id int [ref: > tenants.id]
  
  // المحتوى
  title varchar(255) [not null]
  content text [not null]  // HTML content
  icon varchar(50)  // "📢", "🎉", "⚠️", "ℹ️", "🔔"
  image_url varchar(500)  // رابط الصورة
  
  // النوع والأهمية
  type varchar(20) [default: 'info']  // "info", "warning", "success", "error", "promotion"
  priority int [default: 0]  // 0 = عادي، 1 = مهم، 2 = عاجل
  
  // الجدولة
  start_date timestamp  // متى يبدأ العرض (null = فوراً)
  end_date timestamp  // متى ينتهي (null = دائماً)
  
  // الحالة
  is_active boolean [default: true]
  is_pinned boolean [default: false]  // تثبيت في الأعلى
  
  // إحصائيات
  views_count int [default: 0]
  
  created_at timestamp [default: `now()`]
  updated_at timestamp [default: `now()`]
  
  indexes {
    (created_by_type, tenant_id, is_active)
    (is_active, priority, created_at)
    (start_date, end_date)
  }
}
```

### 2.2 جدول `announcement_views`

```sql
Table announcement_views {
  id int [pk, increment]
  announcement_id int [ref: > announcements.id, not null]
  
  // من شاهد
  viewer_type varchar(20) [not null]  // "tenant", "agent"
  tenant_id int [ref: > tenants.id]
  agent_id int [ref: > agents.id]
  
  viewed_at timestamp [default: `now()`]
  
  indexes {
    (announcement_id, viewer_type, tenant_id, agent_id) [unique]
    (announcement_id, viewed_at)
  }
}
```

### 2.3 جدول `about_pages`

```sql
Table about_pages {
  id int [pk, increment]
  tenant_id int [ref: > tenants.id, not null, unique]
  
  // المحتوى
  title varchar(255) [default: 'من نحن']
  content text [not null]  // HTML content
  logo_url varchar(500)
  cover_image_url varchar(500)
  
  // معلومات الاتصال
  contact_email varchar(255)
  contact_phone varchar(50)
  social_links json  // {"facebook": "...", "twitter": "...", "telegram": "..."}
  
  // الحالة
  is_published boolean [default: true]
  
  created_at timestamp [default: `now()`]
  updated_at timestamp [default: `now()`]
  
  indexes {
    tenant_id
  }
}
```

---

## 3. واجهة Super Admin

### 3.1 إدارة الإعلانات العامة

```
┌────────────────────────────────────────────────────────────────┐
│ 📢 الإعلانات والأخبار العامة                                 │
├────────────────────────────────────────────────────────────────┤
│ [+ إعلان جديد]  [📊 الإحصائيات]  [🗂 الأرشيف]              │
│                                                                │
│ ┌──────────────────────────────────────────────────────┐      │
│ │ 🔔 الإعلانات النشطة (5)                             │      │
│ ├──────────────────────────────────────────────────────┤      │
│ │                                                      │      │
│ │ ┌────────────────────────────────────────────┐      │      │
│ │ │ 📌 مثبت                             [⚙] [🗑]     │      │
│ │ │ ⚠️ صيانة مجدولة - 5 نوفمبر 2025          │      │
│ │ │ ────────────────────────────────────────  │      │
│ │ │ سيتم إجراء صيانة دورية على السيرفرات    │      │
│ │ │ يوم الجمعة 5 نوفمبر من الساعة 2 صباحاً   │      │
│ │ │ إلى 6 صباحاً. قد تتأثر بعض الخدمات.     │      │
│ │ │                                            │      │
│ │ │ 👁 1,245 مشاهدة | منذ 3 أيام            │      │
│ │ │ 📅 يظهر حتى: 5 نوفمبر 2025              │      │
│ │ └────────────────────────────────────────────┘      │      │
│ │                                                      │      │
│ │ ┌────────────────────────────────────────────┐      │      │
│ │ │                                     [⚙] [🗑]     │      │
│ │ │ 🎉 تحديث جديد - الإصدار 2.5.0            │      │
│ │ │ ────────────────────────────────────────  │      │
│ │ │ ميزات جديدة:                              │      │
│ │ │ • نظام الشرائح والأهداف                  │      │
│ │ │ • API للتكامل الخارجي                    │      │
│ │ │ • تحسينات في الأداء                      │      │
│ │ │                                            │      │
│ │ │ [صورة: screenshot.png]                    │      │
│ │ │                                            │      │
│ │ │ 👁 856 مشاهدة | منذ 5 أيام               │      │
│ │ └────────────────────────────────────────────┘      │      │
│ │                                                      │      │
│ │ ┌────────────────────────────────────────────┐      │      │
│ │ │                                     [⚙] [🗑]     │      │
│ │ │ ℹ️ تحسين الأمان - تفعيل 2FA              │      │
│ │ │ ────────────────────────────────────────  │      │
│ │ │ ننصح جميع المستخدمين بتفعيل المصادقة     │      │
│ │ │ الثنائية لحماية حساباتهم.                │      │
│ │ │                                            │      │
│ │ │ 👁 432 مشاهدة | منذ أسبوع                │      │
│ │ └────────────────────────────────────────────┘      │      │
│ └──────────────────────────────────────────────────────┘      │
└────────────────────────────────────────────────────────────────┘
```

### 3.2 إنشاء إعلان جديد

```
┌────────────────────────────────────────────────────────────────┐
│ + إنشاء إعلان عام جديد                                        │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│ العنوان: *                                                    │
│ ┌──────────────────────────────────────────────────┐          │
│ │ صيانة مجدولة - 5 نوفمبر 2025                    │          │
│ └──────────────────────────────────────────────────┘          │
│                                                                │
│ الأيقونة:                                                      │
│ [⚠️ ▼]  أو  [📤 رفع صورة]                                    │
│ الأيقونات المتاحة: 📢 🎉 ⚠️ ℹ️ 🔔 ✅ ❌ 💡 🚀 ⭐              │
│                                                                │
│ النوع:                                                         │
│ ● معلومة    ○ تحذير    ○ نجاح    ○ خطأ    ○ عرض ترويجي     │
│                                                                │
│ الأولوية:                                                      │
│ ○ عادي (0)    ● مهم (1)    ○ عاجل (2)                        │
│                                                                │
│ المحتوى: *                                                     │
│ ┌──────────────────────────────────────────────────┐          │
│ │ [B] [I] [U] [🔗] [📷] [📋] [⚙️]                  │          │
│ │ ──────────────────────────────────────────────── │          │
│ │ سيتم إجراء صيانة دورية على السيرفرات           │          │
│ │ يوم الجمعة <b>5 نوفمبر</b> من الساعة           │          │
│ │ <span style="color: red;">2 صباحاً</span> إلى   │          │
│ │ 6 صباحاً.                                        │          │
│ │                                                  │          │
│ │ قد تتأثر بعض الخدمات خلال هذه الفترة.          │          │
│ │                                                  │          │
│ │ نعتذر عن أي إزعاج.                             │          │
│ └──────────────────────────────────────────────────┘          │
│ دعم HTML كامل - معاينة مباشرة                                │
│                                                                │
│ الصورة (اختياري):                                             │
│ ┌──────────────────────────────────────────────────┐          │
│ │ [📤 رفع صورة] أو [🔗 رابط صورة]                │          │
│ └──────────────────────────────────────────────────┘          │
│                                                                │
│ الجدولة:                                                       │
│ تاريخ البدء:                                                   │
│ [31-10-2025 ▼] [14:30 ▼]  ☑ ابدأ فوراً                      │
│                                                                │
│ تاريخ الانتهاء:                                                │
│ [05-11-2025 ▼] [23:59 ▼]  ☑ بدون انتهاء                     │
│                                                                │
│ الخيارات:                                                      │
│ ☑ نشط (ظاهر للجميع)                                          │
│ ☑ مثبت في الأعلى                                             │
│ ☐ إرسال إشعار بريد إلكتروني للمستأجرين                      │
│                                                                │
│ المعاينة:                                                      │
│ ┌──────────────────────────────────────────────────┐          │
│ │ ⚠️ صيانة مجدولة - 5 نوفمبر 2025                │          │
│ │ ────────────────────────────────────────────────  │          │
│ │ سيتم إجراء صيانة دورية على السيرفرات           │          │
│ │ يوم الجمعة 5 نوفمبر من الساعة 2 صباحاً إلى     │          │
│ │ 6 صباحاً.                                        │          │
│ │                                                  │          │
│ │ قد تتأثر بعض الخدمات خلال هذه الفترة.          │          │
│ │                                                  │          │
│ │ نعتذر عن أي إزعاج.                             │          │
│ │                                                  │          │
│ │ منذ لحظات                                       │          │
│ └──────────────────────────────────────────────────┘          │
│                                                                │
│                   [إلغاء]        [نشر الإعلان]                │
└────────────────────────────────────────────────────────────────┘
```

---

## 4. واجهة Tenant (المستأجر)

### 4.1 Dashboard - عرض الإعلانات

```
┌────────────────────────────────────────────────────────────────┐
│ 🏠 Dashboard - الشام                                           │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│ ┌──────────────────────────────────────────────────────┐      │
│ │ 📢 الإعلانات والأخبار                               │      │
│ └──────────────────────────────────────────────────────┘      │
│                                                                │
│ ┌────────────────────────────────────────────────────────┐    │
│ │ 📌 من إدارة النظام                                    │    │
│ │ ⚠️ صيانة مجدولة - 5 نوفمبر 2025                      │    │
│ │ ──────────────────────────────────────────────────────│    │
│ │ سيتم إجراء صيانة دورية على السيرفرات يوم الجمعة     │    │
│ │ 5 نوفمبر من الساعة 2 صباحاً إلى 6 صباحاً.           │    │
│ │ قد تتأثر بعض الخدمات خلال هذه الفترة.               │    │
│ │                                                        │    │
│ │ منذ 3 أيام                                            │    │
│ └────────────────────────────────────────────────────────┘    │
│                                                                │
│ ┌────────────────────────────────────────────────────────┐    │
│ │ 🎉 تحديث جديد - الإصدار 2.5.0                         │    │
│ │ ──────────────────────────────────────────────────────│    │
│ │ ميزات جديدة:                                          │    │
│ │ • نظام الشرائح والأهداف                              │    │
│ │ • API للتكامل الخارجي                                │    │
│ │ • تحسينات في الأداء                                  │    │
│ │                                                        │    │
│ │ [صورة: screenshot.png]                                │    │
│ │                                                        │    │
│ │ منذ 5 أيام                                            │    │
│ └────────────────────────────────────────────────────────┘    │
│                                                                │
│ ┌──────────────────────────────────────────────────────┐      │
│ │ 📊 الإحصائيات السريعة                               │      │
│ │ ┌────────────┬────────────┬────────────┬───────────┐ │      │
│ │ │ الرصيد     │ الوكلاء    │ الطلبات    │ الأرباح  │ │      │
│ │ │ 15,234 USD │ 45 نشط    │ 1,234      │ 8,456 USD│ │      │
│ │ └────────────┴────────────┴────────────┴───────────┘ │      │
│ └──────────────────────────────────────────────────────┘      │
└────────────────────────────────────────────────────────────────┘
```

### 4.2 إدارة إعلانات الوكلاء

```
┌────────────────────────────────────────────────────────────────┐
│ 🔔 إعلانات الوكلاء                                            │
├────────────────────────────────────────────────────────────────┤
│ [+ إعلان جديد]  [📊 الإحصائيات]  [🗂 الأرشيف]              │
│                                                                │
│ ┌──────────────────────────────────────────────────────┐      │
│ │ 🔔 الإعلانات النشطة (3)                             │      │
│ ├──────────────────────────────────────────────────────┤      │
│ │                                                      │      │
│ │ ┌────────────────────────────────────────────┐      │      │
│ │ │ 📌 مثبت                             [⚙] [🗑]     │      │
│ │ │ 🎁 عرض خاص - خصم 10% على PUBG             │      │
│ │ │ ────────────────────────────────────────  │      │
│ │ │ عرض محدود لمدة 3 أيام فقط!               │      │
│ │ │ احصل على خصم 10% على جميع باقات PUBG    │      │
│ │ │ عند استخدام كود: PUBG10                   │      │
│ │ │                                            │      │
│ │ │ [صورة: pubg-offer.png]                    │      │
│ │ │                                            │      │
│ │ │ 👁 234 مشاهدة (78 وكيل) | منذ يومين      │      │
│ │ │ 📅 ينتهي: 3 نوفمبر 2025                  │      │
│ │ └────────────────────────────────────────────┘      │      │
│ │                                                      │      │
│ │ ┌────────────────────────────────────────────┐      │      │
│ │ │                                     [⚙] [🗑]     │      │
│ │ │ 💡 تعليمات مهمة                           │      │
│ │ │ ────────────────────────────────────────  │      │
│ │ │ الرجاء التأكد من إدخال Player ID          │      │
│ │ │ بشكل صحيح لتجنب تأخير الطلبات.           │      │
│ │ │                                            │      │
│ │ │ في حالة وجود مشكلة، تواصل معنا فوراً.    │      │
│ │ │                                            │      │
│ │ │ 👁 128 مشاهدة (45 وكيل) | منذ 4 أيام     │      │
│ │ └────────────────────────────────────────────┘      │      │
│ └──────────────────────────────────────────────────────┘      │
└────────────────────────────────────────────────────────────────┘
```

### 4.3 إعداد صفحة "من نحن"

```
┌────────────────────────────────────────────────────────────────┐
│ ℹ️ صفحة "من نحن"                                              │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│ العنوان:                                                       │
│ ┌──────────────────────────────────────────────────┐          │
│ │ من نحن - الشام للألعاب الرقمية                 │          │
│ └──────────────────────────────────────────────────┘          │
│                                                                │
│ الشعار:                                                        │
│ [📤 رفع شعار]  [معاينة: logo.png]                            │
│                                                                │
│ صورة الغلاف:                                                   │
│ [📤 رفع صورة]  [معاينة: cover.jpg]                           │
│                                                                │
│ المحتوى: *                                                     │
│ ┌──────────────────────────────────────────────────┐          │
│ │ [B] [I] [U] [🔗] [📷] [📋] [⚙️]                  │          │
│ │ ──────────────────────────────────────────────── │          │
│ │ <h2>مرحباً بكم في الشام للألعاب الرقمية</h2>   │          │
│ │                                                  │          │
│ │ نحن منصة رائدة في توفير الشحن الرقمي           │          │
│ │ للألعاب الإلكترونية بأفضل الأسعار وأسرع خدمة.   │          │
│ │                                                  │          │
│ │ <h3>لماذا نحن؟</h3>                             │          │
│ │ <ul>                                             │          │
│ │   <li>⚡ شحن فوري خلال ثوانٍ</li>               │          │
│ │   <li>💰 أسعار تنافسية</li>                     │          │
│ │   <li>🔒 أمان ومصداقية</li>                     │          │
│ │   <li>🎁 عروض وخصومات مستمرة</li>               │          │
│ │ </ul>                                            │          │
│ │                                                  │          │
│ │ <h3>خبرة تمتد لأكثر من 5 سنوات</h3>            │          │
│ │ خدمنا أكثر من 100,000 عميل راضٍ.               │          │
│ └──────────────────────────────────────────────────┘          │
│                                                                │
│ معلومات الاتصال:                                              │
│ البريد الإلكتروني:                                            │
│ ┌──────────────────────────────────────────────────┐          │
│ │ info@alsham-games.com                            │          │
│ └──────────────────────────────────────────────────┘          │
│                                                                │
│ رقم الهاتف:                                                    │
│ ┌──────────────────────────────────────────────────┐          │
│ │ +963 123 456 789                                 │          │
│ └──────────────────────────────────────────────────┘          │
│                                                                │
│ وسائل التواصل الاجتماعي:                                      │
│ Facebook:                                                      │
│ ┌──────────────────────────────────────────────────┐          │
│ │ https://facebook.com/alsham.games                │          │
│ └──────────────────────────────────────────────────┘          │
│                                                                │
│ Telegram:                                                      │
│ ┌──────────────────────────────────────────────────┐          │
│ │ @AlshamGames                                     │          │
│ └──────────────────────────────────────────────────┘          │
│                                                                │
│ Instagram:                                                     │
│ ┌──────────────────────────────────────────────────┐          │
│ │ @alsham_games                                    │          │
│ └──────────────────────────────────────────────────┘          │
│                                                                │
│ الحالة:                                                        │
│ ☑ منشور (ظاهر للوكلاء)                                       │
│                                                                │
│ المعاينة:                                                      │
│ ┌──────────────────────────────────────────────────┐          │
│ │ [معاينة الصفحة كما يراها الوكيل]               │          │
│ └──────────────────────────────────────────────────┘          │
│                                                                │
│                   [إلغاء]        [حفظ التغييرات]              │
└────────────────────────────────────────────────────────────────┘
```

---

## 5. واجهة Agent (الوكيل)

### 5.1 Dashboard - الإعلانات

```
┌────────────────────────────────────────────────────────────────┐
│ 🏠 Dashboard                                      💎 VIP2      │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│ مرحباً محمد! 👋                                                │
│                                                                │
│ ┌──────────────────────────────────────────────────────┐      │
│ │ 📢 الإعلانات المهمة                                  │      │
│ └──────────────────────────────────────────────────────┘      │
│                                                                │
│ ┌────────────────────────────────────────────────────────┐    │
│ │ 📌 مثبت                                                │    │
│ │ 🎁 عرض خاص - خصم 10% على PUBG                        │    │
│ │ ──────────────────────────────────────────────────────│    │
│ │ عرض محدود لمدة 3 أيام فقط!                           │    │
│ │ احصل على خصم 10% على جميع باقات PUBG                │    │
│ │ عند استخدام كود: PUBG10                               │    │
│ │                                                        │    │
│ │ [صورة: pubg-offer.png]                                │    │
│ │                                                        │    │
│ │ ينتهي خلال: 1 يوم و 8 ساعات ⏰                        │    │
│ └────────────────────────────────────────────────────────┘    │
│                                                                │
│ ┌────────────────────────────────────────────────────────┐    │
│ │ 💡 تعليمات مهمة                                       │    │
│ │ ──────────────────────────────────────────────────────│    │
│ │ الرجاء التأكد من إدخال Player ID بشكل صحيح           │    │
│ │ لتجنب تأخير الطلبات.                                 │    │
│ │                                                        │    │
│ │ في حالة وجود مشكلة، تواصل معنا فوراً.                │    │
│ │                                                        │    │
│ │ منذ 4 أيام                                            │    │
│ └────────────────────────────────────────────────────────┘    │
│                                                                │
│ ┌────────────────────────────────────────────────────────┐    │
│ │ ⚠️ من إدارة النظام                                    │    │
│ │ صيانة مجدولة - 5 نوفمبر 2025                         │    │
│ │ ──────────────────────────────────────────────────────│    │
│ │ سيتم إجراء صيانة دورية على السيرفرات يوم الجمعة     │    │
│ │ 5 نوفمبر من الساعة 2 صباحاً إلى 6 صباحاً.           │    │
│ │ قد تتأثر بعض الخدمات خلال هذه الفترة.               │    │
│ │                                                        │    │
│ │ منذ 3 أيام                                            │    │
│ └────────────────────────────────────────────────────────┘    │
│                                                                │
│ [عرض جميع الإعلانات (8)]                                     │
│                                                                │
│ ┌──────────────────────────────────────────────────────┐      │
│ │ 📊 نشاطك اليوم                                       │      │
│ │ ┌────────────┬────────────┬────────────┬───────────┐ │      │
│ │ │ المبيعات   │ الطلبات    │ الرصيد     │ الشريحة  │ │      │
│ │ │ 245 USD    │ 12 طلب    │ 1,856 USD  │ 💎 VIP2  │ │      │
│ │ └────────────┴────────────┴────────────┴───────────┘ │      │
│ └──────────────────────────────────────────────────────┘      │
└────────────────────────────────────────────────────────────────┘
```

### 5.2 صفحة "من نحن" للوكيل

```
┌────────────────────────────────────────────────────────────────┐
│ ℹ️ من نحن                                                      │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│ [صورة غلاف: cover.jpg]                                        │
│                                                                │
│ ┌────────────────────────────────────────────────────┐        │
│ │         [شعار: logo.png]                          │        │
│ │                                                    │        │
│ │   من نحن - الشام للألعاب الرقمية                 │        │
│ │                                                    │        │
│ │ ────────────────────────────────────────────────── │        │
│ │                                                    │        │
│ │ مرحباً بكم في الشام للألعاب الرقمية              │        │
│ │                                                    │        │
│ │ نحن منصة رائدة في توفير الشحن الرقمي             │        │
│ │ للألعاب الإلكترونية بأفضل الأسعار وأسرع خدمة.     │        │
│ │                                                    │        │
│ │ لماذا نحن؟                                        │        │
│ │ • ⚡ شحن فوري خلال ثوانٍ                         │        │
│ │ • 💰 أسعار تنافسية                               │        │
│ │ • 🔒 أمان ومصداقية                               │        │
│ │ • 🎁 عروض وخصومات مستمرة                         │        │
│ │                                                    │        │
│ │ خبرة تمتد لأكثر من 5 سنوات                       │        │
│ │ خدمنا أكثر من 100,000 عميل راضٍ.                 │        │
│ │                                                    │        │
│ │ ────────────────────────────────────────────────── │        │
│ │                                                    │        │
│ │ 📞 تواصل معنا                                     │        │
│ │                                                    │        │
│ │ 📧 info@alsham-games.com                          │        │
│ │ ☎️ +963 123 456 789                               │        │
│ │                                                    │        │
│ │ 🌐 تابعنا على                                    │        │
│ │ [Facebook] [Telegram] [Instagram]                 │        │
│ └────────────────────────────────────────────────────┘        │
│                                                                │
│                              [العودة للرئيسية]                │
└────────────────────────────────────────────────────────────────┘
```

---

## 6. Rich Text Editor

### 6.1 مكتبات مقترحة

**1. TinyMCE** (الأفضل)
```javascript
import { Editor } from '@tinymce/tinymce-react';

<Editor
  apiKey="your-api-key"
  init={{
    height: 500,
    menubar: true,
    language: 'ar',
    directionality: 'rtl',
    plugins: [
      'advlist', 'autolink', 'lists', 'link', 'image', 'charmap',
      'preview', 'anchor', 'searchreplace', 'visualblocks', 'code',
      'fullscreen', 'insertdatetime', 'media', 'table', 'code',
      'help', 'wordcount', 'emoticons'
    ],
    toolbar: 'undo redo | blocks | ' +
      'bold italic forecolor | alignleft aligncenter ' +
      'alignright alignjustify | bullist numlist outdent indent | ' +
      'image media link | removeformat | help',
    content_style: 'body { font-family: Arial, sans-serif; font-size:14px }',
    images_upload_url: '/api/upload-image',
    automatic_uploads: true,
    file_picker_types: 'image',
    paste_data_images: true
  }}
  value={content}
  onEditorChange={(newValue) => setContent(newValue)}
/>
```

**2. Quill** (خفيف)
```javascript
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

const modules = {
  toolbar: [
    [{ 'header': [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ 'color': [] }, { 'background': [] }],
    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
    [{ 'align': [] }],
    ['link', 'image'],
    ['clean']
  ]
};

<ReactQuill 
  theme="snow" 
  value={content} 
  onChange={setContent}
  modules={modules}
  placeholder="اكتب المحتوى هنا..."
/>
```

### 6.2 رفع الصور

```javascript
// Backend: Image Upload Endpoint
app.post('/api/upload-announcement-image', 
  apiAuth, 
  upload.single('image'), 
  async (req, res) => {
    try {
      const file = req.file;
      
      // Validation
      if (!file) {
        return res.status(400).json({ error: 'No image provided' });
      }
      
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.mimetype)) {
        return res.status(400).json({ error: 'Invalid file type' });
      }
      
      const maxSize = 5 * 1024 * 1024; // 5 MB
      if (file.size > maxSize) {
        return res.status(400).json({ error: 'File too large (max 5MB)' });
      }
      
      // Upload to cloud storage (AWS S3, Cloudinary, etc.)
      const imageUrl = await uploadToStorage(file, 'announcements');
      
      res.json({ 
        location: imageUrl // TinyMCE expects 'location'
      });
      
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ error: 'Upload failed' });
    }
  }
);
```

---

## 7. API Endpoints

### 7.1 Super Admin Announcements

```javascript
// GET /api/super-admin/announcements
router.get('/announcements', superAdminAuth, async (req, res) => {
  const { status = 'active', page = 1, limit = 10 } = req.query;
  
  const announcements = await db.query(`
    SELECT 
      a.*,
      (SELECT COUNT(*) FROM announcement_views WHERE announcement_id = a.id) as views_count
    FROM announcements a
    WHERE a.created_by_type = 'super_admin'
      AND a.super_admin_id = ?
      ${status === 'active' ? 'AND a.is_active = true' : ''}
      ${status === 'archived' ? 'AND a.is_active = false' : ''}
    ORDER BY a.is_pinned DESC, a.priority DESC, a.created_at DESC
    LIMIT ? OFFSET ?
  `, [req.superAdminId, limit, (page - 1) * limit]);
  
  res.json({ data: announcements });
});

// POST /api/super-admin/announcements
router.post('/announcements', superAdminAuth, async (req, res) => {
  const {
    title, content, icon, image_url, type, priority,
    start_date, end_date, is_active, is_pinned
  } = req.body;
  
  const announcement = await db.query(`
    INSERT INTO announcements 
    (created_by_type, super_admin_id, title, content, icon, image_url, 
     type, priority, start_date, end_date, is_active, is_pinned)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, ['super_admin', req.superAdminId, title, content, icon, image_url,
      type, priority, start_date, end_date, is_active, is_pinned]);
  
  res.json({ 
    message: 'Announcement created successfully',
    data: announcement 
  });
});

// PUT /api/super-admin/announcements/:id
router.put('/announcements/:id', superAdminAuth, async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  
  await db.query(`
    UPDATE announcements 
    SET ? 
    WHERE id = ? AND super_admin_id = ?
  `, [updates, id, req.superAdminId]);
  
  res.json({ message: 'Announcement updated successfully' });
});

// DELETE /api/super-admin/announcements/:id
router.delete('/announcements/:id', superAdminAuth, async (req, res) => {
  const { id } = req.params;
  
  await db.query(`
    DELETE FROM announcements 
    WHERE id = ? AND super_admin_id = ?
  `, [id, req.superAdminId]);
  
  res.json({ message: 'Announcement deleted successfully' });
});
```

### 7.2 Tenant Announcements

```javascript
// GET /api/tenant/announcements
router.get('/announcements', tenantAuth, async (req, res) => {
  const announcements = await db.query(`
    SELECT 
      a.*,
      (SELECT COUNT(*) FROM announcement_views 
       WHERE announcement_id = a.id 
         AND viewer_type = 'agent') as views_count
    FROM announcements a
    WHERE a.created_by_type = 'tenant'
      AND a.tenant_id = ?
      AND a.is_active = true
    ORDER BY a.is_pinned DESC, a.priority DESC, a.created_at DESC
  `, [req.tenantId]);
  
  res.json({ data: announcements });
});

// POST /api/tenant/announcements
router.post('/announcements', tenantAuth, async (req, res) => {
  const {
    title, content, icon, image_url, type, priority,
    start_date, end_date, is_active, is_pinned
  } = req.body;
  
  const announcement = await db.query(`
    INSERT INTO announcements 
    (created_by_type, tenant_id, title, content, icon, image_url, 
     type, priority, start_date, end_date, is_active, is_pinned)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, ['tenant', req.tenantId, title, content, icon, image_url,
      type, priority, start_date, end_date, is_active, is_pinned]);
  
  res.json({ 
    message: 'Announcement created successfully',
    data: announcement 
  });
});
```

### 7.3 Agent View Announcements

```javascript
// GET /api/agent/announcements
router.get('/announcements', agentAuth, async (req, res) => {
  const now = new Date();
  
  // Get all relevant announcements
  const announcements = await db.query(`
    SELECT 
      a.*,
      av.viewed_at,
      CASE 
        WHEN a.created_by_type = 'super_admin' THEN 'من إدارة النظام'
        ELSE 'من إدارتك'
      END as source_label
    FROM announcements a
    LEFT JOIN announcement_views av ON a.id = av.announcement_id 
      AND av.agent_id = ?
    WHERE a.is_active = true
      AND (a.start_date IS NULL OR a.start_date <= ?)
      AND (a.end_date IS NULL OR a.end_date >= ?)
      AND (
        (a.created_by_type = 'super_admin') OR
        (a.created_by_type = 'tenant' AND a.tenant_id = ?)
      )
    ORDER BY a.is_pinned DESC, a.priority DESC, a.created_at DESC
  `, [req.agentId, now, now, req.tenantId]);
  
  res.json({ data: announcements });
});

// POST /api/agent/announcements/:id/view
router.post('/announcements/:id/view', agentAuth, async (req, res) => {
  const { id } = req.params;
  
  // Mark as viewed (ignore if already viewed)
  await db.query(`
    INSERT IGNORE INTO announcement_views 
    (announcement_id, viewer_type, agent_id, tenant_id)
    VALUES (?, 'agent', ?, ?)
  `, [id, req.agentId, req.tenantId]);
  
  res.json({ message: 'Marked as viewed' });
});
```

### 7.4 About Page

```javascript
// GET /api/agent/about
router.get('/about', agentAuth, async (req, res) => {
  const aboutPage = await db.query(`
    SELECT * FROM about_pages 
    WHERE tenant_id = ? AND is_published = true
  `, [req.tenantId]);
  
  if (!aboutPage) {
    return res.status(404).json({ error: 'About page not found' });
  }
  
  res.json({ data: aboutPage });
});

// POST /api/tenant/about (Upsert)
router.post('/about', tenantAuth, async (req, res) => {
  const {
    title, content, logo_url, cover_image_url,
    contact_email, contact_phone, social_links, is_published
  } = req.body;
  
  await db.query(`
    INSERT INTO about_pages 
    (tenant_id, title, content, logo_url, cover_image_url, 
     contact_email, contact_phone, social_links, is_published)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      title = VALUES(title),
      content = VALUES(content),
      logo_url = VALUES(logo_url),
      cover_image_url = VALUES(cover_image_url),
      contact_email = VALUES(contact_email),
      contact_phone = VALUES(contact_phone),
      social_links = VALUES(social_links),
      is_published = VALUES(is_published),
      updated_at = NOW()
  `, [req.tenantId, title, content, logo_url, cover_image_url,
      contact_email, contact_phone, JSON.stringify(social_links), is_published]);
  
  res.json({ message: 'About page saved successfully' });
});
```

---

## 8. إضافة للـ Database Schema

يجب إضافة هذه الجداول إلى `wtn_dbdiagram.md`:

```sql
// الإعلانات
Table announcements {
  id int [pk, increment]
  created_by_type varchar(20) [not null]
  super_admin_id int [ref: > super_admins.id]
  tenant_id int [ref: > tenants.id]
  title varchar(255) [not null]
  content text [not null]
  icon varchar(50)
  image_url varchar(500)
  type varchar(20) [default: 'info']
  priority int [default: 0]
  start_date timestamp
  end_date timestamp
  is_active boolean [default: true]
  is_pinned boolean [default: false]
  views_count int [default: 0]
  created_at timestamp [default: `now()`]
  updated_at timestamp [default: `now()`]
  
  indexes {
    (created_by_type, tenant_id, is_active)
    (is_active, priority, created_at)
    (start_date, end_date)
  }
}

// سجل المشاهدات
Table announcement_views {
  id int [pk, increment]
  announcement_id int [ref: > announcements.id, not null]
  viewer_type varchar(20) [not null]
  tenant_id int [ref: > tenants.id]
  agent_id int [ref: > agents.id]
  viewed_at timestamp [default: `now()`]
  
  indexes {
    (announcement_id, viewer_type, tenant_id, agent_id) [unique]
    (announcement_id, viewed_at)
  }
}

// صفحة من نحن
Table about_pages {
  id int [pk, increment]
  tenant_id int [ref: > tenants.id, not null, unique]
  title varchar(255) [default: 'من نحن']
  content text [not null]
  logo_url varchar(500)
  cover_image_url varchar(500)
  contact_email varchar(255)
  contact_phone varchar(50)
  social_links json
  is_published boolean [default: true]
  created_at timestamp [default: `now()`]
  updated_at timestamp [default: `now()`]
  
  indexes {
    tenant_id
  }
}
```

---

## 9. الخلاصة

### المزايا:

✅ **للـ Super Admin:**
- إعلانات عامة لجميع المستأجرين
- محرر نصوص غني
- جدولة وتثبيت

✅ **للمستأجر:**
- إعلانات خاصة لوكلائه
- صفحة "من نحن" قابلة للتخصيص
- إحصائيات المشاهدات

✅ **للوكيل:**
- عرض واضح في Dashboard
- إعلانات مرتبة حسب الأولوية
- صفحة "من نحن" احترافية

---

**جاهز للتطبيق!** 🎉
