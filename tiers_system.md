# نظام الشرائح والأهداف - Tiers & Goals System
## ميزة الترقيات التلقائية للوكلاء

---

## 1. نظرة عامة (Overview)

### 1.1 المفهوم

نظام الشرائح = مجموعات الأسعار مع نظام أهداف وترقيات تلقائية:

```
الفكرة الأساسية:
├─ كل وكيل يبدأ في مجموعة سعر افتراضية (Default)
├─ عند تحقيق هدف معين من المبيعات → ينتقل تلقائياً لمجموعة أفضل
├─ المجموعة الأفضل = أسعار أقل = ربح أعلى للوكيل
└─ كل شهر يبدأ من جديد (تحفيز مستمر)
```

### 1.2 مثال واقعي

```
المستأجر "الشام" لديه 4 مجموعات أسعار:

📦 Default (الافتراضي)
   - سعر PUBG 60 UC: 2.50 USD
   - الهدف: بيع 1,000 USD شهرياً
   - عند التحقيق → انتقل لـ VIP1

🥈 VIP1
   - سعر PUBG 60 UC: 2.35 USD (خصم 6%)
   - الهدف: بيع 3,000 USD شهرياً
   - عند التحقيق → انتقل لـ VIP2

💎 VIP2
   - سعر PUBG 60 UC: 2.20 USD (خصم 12%)
   - الهدف: بيع 5,000 USD شهرياً
   - عند التحقيق → انتقل لـ Gold

👑 Gold (أعلى مستوى)
   - سعر PUBG 60 UC: 2.00 USD (خصم 20%)
   - لا يوجد هدف آخر (أعلى شريحة)
```

---

## 2. هيكل قاعدة البيانات

### 2.1 جدول `price_groups` (مجموعات الأسعار)

```sql
Table price_groups {
  id int [pk, increment]
  tenant_id int [ref: > tenants.id, not null]
  
  // المعلومات الأساسية
  group_name varchar(100) [not null]  // "Default", "VIP1", "VIP2", "Gold"
  is_default boolean [default: false]  // المجموعة الافتراضية للوكلاء الجدد
  
  // للعرض (اختياري)
  tier_icon varchar       // "🥉", "🥈", "💎", "👑"
  tier_color varchar      // "#FFD700", "#C0C0C0", "#4169E1"
  
  // نظام الأهداف
  target_sales_usd decimal(18,3)  // الهدف للوصول لهذه المجموعة (1000, 3000, 5000)
  next_tier_id int [ref: > price_groups.id]  // المجموعة التالية بعد تحقيق الهدف
  
  created_at timestamp [default: `now()`]
  updated_at timestamp [default: `now()`]
  
  indexes {
    (tenant_id, group_name) [unique]
  }
}
```

**الحقول المضافة:**
- `tier_icon`: أيقونة للعرض في الواجهة (🥉, 🥈, 💎, 👑)
- `tier_color`: لون للتمييز البصري
- `target_sales_usd`: الهدف الشهري للوصول لهذه المجموعة
- `next_tier_id`: المجموعة التالية (null = أعلى مستوى)

### 2.2 جدول `agents` (تحديث)

```sql
Table agents {
  ...
  
  // المجموعة الحالية
  price_group_id int [ref: > price_groups.id]
  
  // للأهداف
  current_month_sales_usd decimal(18,3) [default: 0]  // مبيعات الشهر الحالي
  last_tier_update timestamp  // آخر تحديث للمجموعة
  
  ...
}
```

**الحقول المضافة:**
- `current_month_sales_usd`: إجمالي مبيعات الشهر الحالي (تُحدث تلقائياً)
- `last_tier_update`: تاريخ آخر تغيير في المجموعة

### 2.3 جدول `agent_tier_history` (سجل التنقلات)

```sql
Table agent_tier_history {
  id int [pk, increment]
  agent_id int [ref: > agents.id, not null]
  
  old_price_group_id int [ref: > price_groups.id]  // المجموعة القديمة
  new_price_group_id int [ref: > price_groups.id, not null]  // المجموعة الجديدة
  
  sales_amount_usd decimal(18,3)  // المبيعات التي أدت للترقية
  month_year varchar              // "2025-10", "2025-11"
  
  changed_at timestamp [default: `now()`]
  
  indexes {
    (agent_id, changed_at)
  }
}
```

**الغرض:**
- تسجيل كل تنقل بين المجموعات
- تتبع تاريخ الوكيل
- إحصائيات وتقارير

---

## 3. إعداد النظام (Setup)

### 3.1 واجهة المستأجر - إعدادات مجموعات الأسعار

```
┌─────────────────────────────────────────────────────────────┐
│ ⚙️ إعدادات مجموعات الأسعار والأهداف                       │
├─────────────────────────────────────────────────────────────┤
│ ☑ تفعيل نظام الأهداف والترقيات التلقائية                 │
│                                                             │
│ ┌───────────────────────────────────────────────────┐      │
│ │ 📦 Default (افتراضي)                   ✓ نشط    │      │
│ │ ┌─────────────────────────────────────────────┐  │      │
│ │ │ الأيقونة: [🥉___]  اللون: [#CD7F32_____] │  │      │
│ │ │                                             │  │      │
│ │ │ ☑ مجموعة افتراضية (للوكلاء الجدد)        │  │      │
│ │ │                                             │  │      │
│ │ │ الهدف الشهري:                              │  │      │
│ │ │ عند تحقيق [1,000___] USD شهرياً           │  │      │
│ │ │ انتقل تلقائياً إلى: [VIP1         ▼]      │  │      │
│ │ │                                             │  │      │
│ │ │                   [حفظ التغييرات]          │  │      │
│ │ └─────────────────────────────────────────────┘  │      │
│ └───────────────────────────────────────────────────┘      │
│                                                             │
│ ┌───────────────────────────────────────────────────┐      │
│ │ 🥈 VIP1                                 ✓ نشط    │      │
│ │ ┌─────────────────────────────────────────────┐  │      │
│ │ │ الأيقونة: [🥈___]  اللون: [#C0C0C0_____] │  │      │
│ │ │                                             │  │      │
│ │ │ الهدف للوصول: [1,000___] USD              │  │      │
│ │ │                                             │  │      │
│ │ │ الهدف للترقية:                             │  │      │
│ │ │ عند تحقيق [3,000___] USD شهرياً           │  │      │
│ │ │ انتقل تلقائياً إلى: [VIP2         ▼]      │  │      │
│ │ │                                             │  │      │
│ │ │                   [حفظ التغييرات]          │  │      │
│ │ └─────────────────────────────────────────────┘  │      │
│ └───────────────────────────────────────────────────┘      │
│                                                             │
│ ┌───────────────────────────────────────────────────┐      │
│ │ 💎 VIP2                                 ✓ نشط    │      │
│ │ ┌─────────────────────────────────────────────┐  │      │
│ │ │ الأيقونة: [💎___]  اللون: [#4169E1_____] │  │      │
│ │ │                                             │  │      │
│ │ │ الهدف للوصول: [3,000___] USD              │  │      │
│ │ │                                             │  │      │
│ │ │ الهدف للترقية:                             │  │      │
│ │ │ عند تحقيق [5,000___] USD شهرياً           │  │      │
│ │ │ انتقل تلقائياً إلى: [Gold         ▼]      │  │      │
│ │ │                                             │  │      │
│ │ │                   [حفظ التغييرات]          │  │      │
│ │ └─────────────────────────────────────────────┘  │      │
│ └───────────────────────────────────────────────────┘      │
│                                                             │
│ ┌───────────────────────────────────────────────────┐      │
│ │ 👑 Gold (أعلى مستوى)                   ✓ نشط    │      │
│ │ ┌─────────────────────────────────────────────┐  │      │
│ │ │ الأيقونة: [👑___]  اللون: [#FFD700_____] │  │      │
│ │ │                                             │  │      │
│ │ │ الهدف للوصول: [5,000___] USD              │  │      │
│ │ │                                             │  │      │
│ │ │ ☑ أعلى شريحة (لا يوجد ترقية بعدها)       │  │      │
│ │ │                                             │  │      │
│ │ │                   [حفظ التغييرات]          │  │      │
│ │ └─────────────────────────────────────────────┘  │      │
│ └───────────────────────────────────────────────────┘      │
│                                                             │
│ ملاحظات:                                                   │
│ • يتم فحص المبيعات وترقية الوكلاء تلقائياً يومياً         │
│ • في بداية كل شهر، يعود الوكيل للمجموعة الافتراضية       │
│ • الأسعار لكل مجموعة تُحدد في قسم "الباقات"               │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 مثال على البيانات

```sql
-- المجموعة الافتراضية
INSERT INTO price_groups VALUES (
  tenant_id: 10,
  group_name: 'Default',
  is_default: true,
  tier_icon: '🥉',
  tier_color: '#CD7F32',
  target_sales_usd: null,  -- البداية، لا يوجد هدف للوصول
  next_tier_id: 2  -- VIP1
);

-- VIP1
INSERT INTO price_groups VALUES (
  tenant_id: 10,
  group_name: 'VIP1',
  is_default: false,
  tier_icon: '🥈',
  tier_color: '#C0C0C0',
  target_sales_usd: 1000,  -- يحتاج 1000 USD للوصول
  next_tier_id: 3  -- VIP2
);

-- VIP2
INSERT INTO price_groups VALUES (
  tenant_id: 10,
  group_name: 'VIP2',
  is_default: false,
  tier_icon: '💎',
  tier_color: '#4169E1',
  target_sales_usd: 3000,  -- يحتاج 3000 USD للوصول
  next_tier_id: 4  -- Gold
);

-- Gold
INSERT INTO price_groups VALUES (
  tenant_id: 10,
  group_name: 'Gold',
  is_default: false,
  tier_icon: '👑',
  tier_color: '#FFD700',
  target_sales_usd: 5000,  -- يحتاج 5000 USD للوصول
  next_tier_id: null  -- أعلى مستوى
);
```

---

## 4. واجهة الوكيل

### 4.1 الشريحة في الـ Header

```
┌─────────────────────────────────────────────────────────┐
│ 🏠 الرئيسية  📦 المنتجات  📊 التقارير     💎 VIP2   │
└─────────────────────────────────────────────────────────┘
                                                    ↑
                                            قابل للضغط
```

### 4.2 نافذة تفاصيل الشريحة

```
عند الضغط على 💎 VIP2:

┌─────────────────────────────────────────────────────────┐
│ 💎 شريحتك الحالية: VIP2                               │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ إذا كنت ترغب بترقية حسابك إلى شريحة أعلى والحصول    │
│ على حسومات مميزة ما عليك إلا زيادة مبيعاتك           │
│                                                         │
│ ┌───────────────────────────────────────────────┐      │
│ │ التقدم نحو 👑 GOLD                           │      │
│ │                                               │      │
│ │ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░ 75%                     │      │
│ │                                               │      │
│ │ 3,750 USD / 5,000 USD                         │      │
│ │                                               │      │
│ │ المتبقي: 1,250 USD                           │      │
│ │ الوقت المتبقي: 12 يوم (حتى نهاية الشهر)     │      │
│ └───────────────────────────────────────────────┘      │
│                                                         │
│ ┌───────────────────────────────────────────────┐      │
│ │ 📊 مبيعات هذا الشهر (أكتوبر 2025)           │      │
│ │                                               │      │
│ │ • الإجمالي: 3,750 USD                        │      │
│ │ • عدد الطلبات: 168                           │      │
│ │ • متوسط الطلب: 22.32 USD                     │      │
│ │ • أفضل يوم: 15 أكتوبر (280 USD)             │      │
│ └───────────────────────────────────────────────┘      │
│                                                         │
│ ┌───────────────────────────────────────────────┐      │
│ │ 🎁 المزايا عند الوصول لـ 👑 GOLD:           │      │
│ │                                               │      │
│ │ ✅ خصومات أعلى على جميع المنتجات (20%)     │      │
│ │ ✅ أولوية في الدعم الفني                    │      │
│ │ ✅ عمولات إضافية على الإحالات              │      │
│ │ ✅ وصول مبكر للمنتجات الجديدة              │      │
│ └───────────────────────────────────────────────┘      │
│                                                         │
│ ┌───────────────────────────────────────────────┐      │
│ │ 📈 سجل شرائحك                                │      │
│ │                                               │      │
│ │ • سبتمبر 2025: 🥈 VIP1 (2,100 USD)          │      │
│ │ • أغسطس 2025: 🥉 Default (850 USD)          │      │
│ │ • يوليو 2025: 🥉 Default (650 USD)          │      │
│ └───────────────────────────────────────────────┘      │
│                                                         │
│                                    [إغلاق]              │
└─────────────────────────────────────────────────────────┘
```

### 4.3 إشعار عند الترقية

```
┌─────────────────────────────────────────────┐
│ 🎉 مبروك! تمت ترقيتك                      │
├─────────────────────────────────────────────┤
│                                             │
│ تم ترقيتك من 💎 VIP2 إلى 👑 Gold          │
│                                             │
│ بفضل مبيعاتك المميزة (5,200 USD)          │
│                                             │
│ الآن تحصل على:                             │
│ • خصومات أعلى على جميع المنتجات          │
│ • أولوية في الدعم الفني                   │
│ • عمولات إضافية                           │
│                                             │
│ استمر بالتميز! 🚀                          │
│                                             │
│                  [رائع!]                    │
└─────────────────────────────────────────────┘
```

---

## 5. كيف يعمل النظام؟

### 5.1 حساب المبيعات الشهرية

**Cron Job يومي (كل ليلة 00:00):**

```sql
-- تحديث مبيعات كل وكيل للشهر الحالي
UPDATE agents a
SET current_month_sales_usd = (
  SELECT COALESCE(SUM(ABS(amount_usd)), 0)
  FROM transactions t
  WHERE t.agent_id = a.id
    AND t.type = 'order'
    AND t.created_at >= DATE_TRUNC('month', CURRENT_DATE)
    AND t.created_at < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
)
WHERE a.tenant_id = ?;
```

### 5.2 الترقية التلقائية

**Cron Job يومي (بعد حساب المبيعات):**

```sql
-- فحص كل وكيل هل حقق الهدف؟
UPDATE agents a
SET 
  price_group_id = (
    SELECT pg_next.id
    FROM price_groups pg_current
    LEFT JOIN price_groups pg_next ON pg_current.next_tier_id = pg_next.id
    WHERE pg_current.id = a.price_group_id
      AND pg_next.id IS NOT NULL  -- يوجد مستوى أعلى
      AND a.current_month_sales_usd >= pg_next.target_sales_usd  -- حقق الهدف
    LIMIT 1
  ),
  last_tier_update = NOW()
WHERE a.tenant_id = ?
  AND EXISTS (
    SELECT 1
    FROM price_groups pg_current
    LEFT JOIN price_groups pg_next ON pg_current.next_tier_id = pg_next.id
    WHERE pg_current.id = a.price_group_id
      AND pg_next.id IS NOT NULL
      AND a.current_month_sales_usd >= pg_next.target_sales_usd
  );

-- تسجيل الترقية في السجل
INSERT INTO agent_tier_history (agent_id, old_price_group_id, new_price_group_id, sales_amount_usd, month_year)
SELECT 
  a.id,
  a.price_group_id AS old_price_group_id,
  pg_next.id AS new_price_group_id,
  a.current_month_sales_usd,
  TO_CHAR(CURRENT_DATE, 'YYYY-MM')
FROM agents a
JOIN price_groups pg_current ON a.price_group_id = pg_current.id
JOIN price_groups pg_next ON pg_current.next_tier_id = pg_next.id
WHERE a.tenant_id = ?
  AND a.current_month_sales_usd >= pg_next.target_sales_usd
  AND a.last_tier_update >= CURRENT_DATE - INTERVAL '1 day';  -- تم التحديث اليوم
```

### 5.3 إعادة التعيين الشهرية

**Cron Job شهري (1 من كل شهر - 00:01):**

```sql
-- إعادة كل الوكلاء للمجموعة الافتراضية
UPDATE agents a
SET 
  price_group_id = (
    SELECT id 
    FROM price_groups 
    WHERE tenant_id = a.tenant_id 
      AND is_default = true 
    LIMIT 1
  ),
  current_month_sales_usd = 0,
  last_tier_update = NOW()
WHERE a.tenant_id = ?;
```

---

## 6. مثال عملي كامل

### السيناريو: رحلة الوكيل محمد خلال أكتوبر 2025

#### 1 أكتوبر (بداية الشهر):
```
محمد ينضم للنظام:
- price_group_id: 1 (Default)
- current_month_sales_usd: 0 USD
- tier_icon: 🥉
```

#### 5 أكتوبر:
```
محمد يبيع 1,200 USD

Cron Job (ليلة 5-6 أكتوبر):
1. تحديث المبيعات:
   current_month_sales_usd = 1,200 USD

2. فحص الترقية:
   - المجموعة الحالية: Default
   - المجموعة التالية: VIP1 (target: 1,000 USD)
   - المبيعات: 1,200 >= 1,000 ✅
   
3. الترقية:
   price_group_id = 2 (VIP1)
   last_tier_update = 2025-10-06 00:00:00
   
4. السجل:
   INSERT INTO agent_tier_history:
   - old: Default (1)
   - new: VIP1 (2)
   - sales: 1,200 USD
   - month: "2025-10"

5. إشعار للوكيل:
   "🎉 مبروك! تمت ترقيتك من 🥉 Default إلى 🥈 VIP1"
```

#### 15 أكتوبر:
```
محمد يبيع إجمالي 3,500 USD

Cron Job (ليلة 15-16 أكتوبر):
1. تحديث المبيعات:
   current_month_sales_usd = 3,500 USD

2. فحص الترقية:
   - المجموعة الحالية: VIP1
   - المجموعة التالية: VIP2 (target: 3,000 USD)
   - المبيعات: 3,500 >= 3,000 ✅
   
3. الترقية:
   price_group_id = 3 (VIP2)
   
4. السجل + إشعار
   "🎉 مبروك! تمت ترقيتك من 🥈 VIP1 إلى 💎 VIP2"
```

#### 28 أكتوبر:
```
محمد يبيع إجمالي 5,800 USD

Cron Job (ليلة 28-29 أكتوبر):
1. تحديث المبيعات:
   current_month_sales_usd = 5,800 USD

2. فحص الترقية:
   - المجموعة الحالية: VIP2
   - المجموعة التالية: Gold (target: 5,000 USD)
   - المبيعات: 5,800 >= 5,000 ✅
   
3. الترقية:
   price_group_id = 4 (Gold)
   
4. السجل + إشعار
   "🎉 مبروك! تمت ترقيتك من 💎 VIP2 إلى 👑 Gold"
   "أنت الآن في أعلى شريحة!"
```

#### 1 نوفمبر (بداية شهر جديد):
```
Cron Job (00:01):

إعادة تعيين شهرية:
- price_group_id = 1 (Default) ← العودة للبداية
- current_month_sales_usd = 0 USD
- tier_icon: 🥉

إشعار:
"🔄 بداية شهر جديد!
تم إعادة تعيين شريحتك إلى 🥉 Default
ابدأ رحلتك نحو القمة مرة أخرى! 💪"
```

---

## 7. قائمة الوكلاء (للمستأجر)

```
┌───────────────────────────────────────────────────────────────────┐
│ 👥 الوكلاء                                  [تصدير] [فلترة]    │
├───────────────────────────────────────────────────────────────────┤
│ الاسم     │ الشريحة  │ المبيعات │ التقدم    │ الحالة │ إجراءات │
├───────────┼──────────┼──────────┼───────────┼────────┼──────────┤
│ محمد      │ 👑 Gold  │ 5,800    │ أعلى     │ ● نشط │ [تفاصيل]│
│           │          │ USD      │ مستوى     │        │          │
├───────────┼──────────┼──────────┼───────────┼────────┼──────────┤
│ علي       │ 💎 VIP2  │ 3,200    │ 64% →👑   │ ● نشط │ [تفاصيل]│
│           │          │ USD      │ 1,800 USD │        │          │
├───────────┼──────────┼──────────┼───────────┼────────┼──────────┤
│ خالد      │ 🥈 VIP1  │ 1,500    │ 50% →💎   │ ● نشط │ [تفاصيل]│
│           │          │ USD      │ 1,500 USD │        │          │
├───────────┼──────────┼──────────┼───────────┼────────┼──────────┤
│ أحمد      │ 🥉 Def.  │   850    │ 85% →🥈   │ ● نشط │ [تفاصيل]│
│           │          │ USD      │   150 USD │        │          │
├───────────┼──────────┼──────────┼───────────┼────────┼──────────┤
│ سالم      │ 🥉 Def.  │   320    │ 32% →🥈   │ ○ معطل│ [تفاصيل]│
│           │          │ USD      │   680 USD │        │          │
└───────────────────────────────────────────────────────────────────┘

الإحصائيات:
├─ 👑 Gold: 1 وكيل
├─ 💎 VIP2: 1 وكيل
├─ 🥈 VIP1: 1 وكيل
└─ 🥉 Default: 2 وكيل

متوسط المبيعات: 2,334 USD/وكيل
```

---

## 8. التقارير والإحصائيات

### 8.1 تقرير الوكيل الشخصي

```sql
-- مبيعات الوكيل هذا الشهر
SELECT 
  a.display_name,
  pg.group_name,
  pg.tier_icon,
  a.current_month_sales_usd,
  pg.target_sales_usd AS current_target,
  pg_next.group_name AS next_tier,
  pg_next.target_sales_usd AS next_target,
  (pg_next.target_sales_usd - a.current_month_sales_usd) AS remaining
FROM agents a
JOIN price_groups pg ON a.price_group_id = pg.id
LEFT JOIN price_groups pg_next ON pg.next_tier_id = pg_next.id
WHERE a.id = ?;
```

### 8.2 تقرير المستأجر

```sql
-- توزيع الوكلاء حسب الشرائح
SELECT 
  pg.group_name,
  pg.tier_icon,
  COUNT(a.id) AS agent_count,
  AVG(a.current_month_sales_usd) AS avg_sales
FROM price_groups pg
LEFT JOIN agents a ON a.price_group_id = pg.id AND a.status = 'active'
WHERE pg.tenant_id = ?
GROUP BY pg.id, pg.group_name, pg.tier_icon
ORDER BY pg.target_sales_usd ASC;
```

### 8.3 أفضل الوكلاء

```sql
-- أعلى 10 وكلاء في المبيعات
SELECT 
  a.display_name,
  pg.group_name,
  pg.tier_icon,
  a.current_month_sales_usd,
  COUNT(t.id) AS order_count
FROM agents a
JOIN price_groups pg ON a.price_group_id = pg.id
LEFT JOIN transactions t ON t.agent_id = a.id 
  AND t.type = 'order'
  AND t.created_at >= DATE_TRUNC('month', CURRENT_DATE)
WHERE a.tenant_id = ?
  AND a.status = 'active'
GROUP BY a.id, a.display_name, pg.group_name, pg.tier_icon, a.current_month_sales_usd
ORDER BY a.current_month_sales_usd DESC
LIMIT 10;
```

---

## 9. الأمان والتحقق

### 9.1 منع التلاعب

```python
# Backend Validation
def update_agent_tier(agent_id):
    # التحقق: المبيعات حقيقية
    sales = calculate_real_sales(agent_id, current_month())
    
    # التحقق: لا يمكن ترقية يدوية (فقط تلقائية)
    if sales < next_tier.target_sales_usd:
        raise ValidationError("المبيعات غير كافية للترقية")
    
    # التحقق: الشهر الصحيح
    if last_tier_update.month == current_date.month:
        raise ValidationError("تم الترقية بالفعل هذا الشهر")
    
    # الترقية
    agent.price_group_id = next_tier.id
    agent.last_tier_update = now()
    agent.save()
```

### 9.2 Audit Log

كل ترقية تُسجل في `agent_tier_history`:
- من قام بها (system)
- متى
- المبيعات التي أدت لها
- الشهر

---

## 10. المزايا والفوائد

### 10.1 للمستأجر:
✅ تحفيز الوكلاء على زيادة المبيعات
✅ نظام عادل وشفاف
✅ سهولة الإدارة (تلقائي بالكامل)
✅ زيادة الإيرادات

### 10.2 للوكيل:
✅ أسعار أفضل مع زيادة المبيعات
✅ أرباح أعلى
✅ تحفيز واضح ومباشر
✅ تتبع التقدم بسهولة

---

## 11. TODO: تحسينات مستقبلية

- [ ] **شارات (Badges)**: شارات إنجاز عند الوصول لمستويات معينة
- [ ] **لوحة المتصدرين**: منافسة بين الوكلاء
- [ ] **مكافآت إضافية**: هدايا عند الوصول لـ Gold
- [ ] **إشعارات Push**: تنبيهات عند الاقتراب من الهدف
- [ ] **تقارير متقدمة**: Excel/PDF export
- [ ] **أهداف مخصصة**: المستأجر يحدد أهداف فردية لكل وكيل

---

**تم بحمد الله!** 🎉
