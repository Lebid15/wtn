# النظام المالي - Financial System
## وثائق المحفظة والدفعات المالية

---

## 1. نظرة عامة (Overview)

النظام المالي يتكون من 3 أجزاء رئيسية:

```
النظام المالي:
├─ 💰 محفظة الوكيل (Agent Wallet)
│  └─ جدول transactions
│
├─ 💳 الدفعات المالية (Deposit Requests)
│  ├─ جدول payment_methods
│  └─ جدول deposit_requests
│
└─ 📊 اشتراكات المستأجر (Tenant Subscriptions)
   ├─ جدول subscription_payments
   └─ جدول subscription_grace_periods
```

---

## 2. محفظة الوكيل (Agent Wallet)

### 2.1 المفهوم

كل وكيل لديه محفظة بالدولار الأمريكي (USD):
- **الرصيد** محفوظ في `agents.balance_usd`
- **كل حركة** على المحفظة تُسجل في `transactions`

### 2.2 أنواع الحركات

| النوع | الوصف | أمثلة |
|------|-------|-------|
| **order** | خصم مقابل طلب | -2.50 USD (شراء PUBG 60 UC) |
| **deposit** | شحن من دفعة مالية | +133.33 USD (تحويل بنكي) |
| **withdrawal** | سحب من المحفظة | -100.00 USD (طلب سحب) |
| **refund** | استرجاع طلب فاشل | +2.50 USD (طلب فشل) |
| **adjustment** | تعديل من المستأجر | +50.00 USD (هدية/خصم) |

### 2.3 جدول `transactions`

```sql
Table transactions {
  id int [pk, increment]
  uuid varchar [unique, not null]
  tenant_id int [ref: > tenants.id, not null]
  agent_id int [ref: > agents.id]  // null = معاملة للمستأجر نفسه
  
  // نوع المعاملة
  type varchar [not null]  // order, deposit, withdrawal, refund, adjustment
  
  // المبلغ
  amount_usd decimal(18,3) [not null]  // سالب = خصم، موجب = إضافة
  
  // الأرصدة
  balance_before_usd decimal(18,3) [not null]  // الرصيد قبل المعاملة
  balance_after_usd decimal(18,3) [not null]   // الرصيد بعد المعاملة
  
  // الربط
  reference_type varchar  // order, deposit_request, manual, system
  reference_id int        // ID للطلب أو الدفعة
  
  // التتبع
  notes text              // ملاحظات توضيحية
  created_by_type varchar // super_admin, tenant, agent, system
  created_by_id int       // من قام بالعملية
  
  created_at timestamp [default: `now()`]
}
```

### 2.4 أمثلة واقعية

#### مثال 1: طلب ببجي

```
الوكيل محمد يشتري PUBG 60 UC بسعر 2.50 USD

السجل:
┌─────────────────────────────────────────┐
│ 🎮 طلب: PUBG 60 UC                     │
│ -2.50 USD                               │
│ الرصيد: 1000.00 → 997.50 USD           │
│ ملاحظات: Order #12345                 │
│ التاريخ: 2025-10-31 12:15              │
└─────────────────────────────────────────┘

في قاعدة البيانات:
{
  type: 'order',
  amount_usd: -2.50,
  balance_before_usd: 1000.00,
  balance_after_usd: 997.50,
  reference_type: 'order',
  reference_id: 12345,
  notes: 'PUBG 60 UC - Order #12345',
  created_by_type: 'system'
}
```

#### مثال 2: شحن من دفعة مالية

```
الوكيل محمد يشحن 500 SAR (= 133.33 USD)

السجل:
┌─────────────────────────────────────────┐
│ 💳 شحن المحفظة                         │
│ +133.33 USD                             │
│ الرصيد: 997.50 → 1130.83 USD           │
│ ملاحظات: حوالة بنكية - 500 SAR        │
│ التاريخ: 2025-10-31 13:30              │
└─────────────────────────────────────────┘

في قاعدة البيانات:
{
  type: 'deposit',
  amount_usd: 133.33,
  balance_before_usd: 997.50,
  balance_after_usd: 1130.83,
  reference_type: 'deposit_request',
  reference_id: 789,
  notes: 'Bank Transfer - 500 SAR',
  created_by_type: 'tenant'
}
```

#### مثال 3: شحن مباشر من المستأجر

```
المستأجر يضيف 50 USD هدية للوكيل محمد

السجل:
┌─────────────────────────────────────────┐
│ 🎁 شحن من الإدارة                     │
│ +50.00 USD                              │
│ الرصيد: 1130.83 → 1180.83 USD          │
│ ملاحظات: هدية - عيد ميلاد             │
│ التاريخ: 2025-10-31 14:00              │
└─────────────────────────────────────────┘

في قاعدة البيانات:
{
  type: 'adjustment',
  amount_usd: 50.00,
  balance_before_usd: 1130.83,
  balance_after_usd: 1180.83,
  reference_type: 'manual',
  reference_id: null,
  notes: 'هدية من الإدارة - عيد ميلاد',
  created_by_type: 'tenant',
  created_by_id: 10
}
```

#### مثال 4: استرجاع طلب فاشل

```
طلب PUBG فشل، يُرجع المبلغ للوكيل

السجل:
┌─────────────────────────────────────────┐
│ 📤 استرجاع طلب                         │
│ +2.50 USD                               │
│ الرصيد: 1180.83 → 1183.33 USD          │
│ ملاحظات: Refund - Order #12345 failed │
│ التاريخ: 2025-10-31 15:45              │
└─────────────────────────────────────────┘

في قاعدة البيانات:
{
  type: 'refund',
  amount_usd: 2.50,
  balance_before_usd: 1180.83,
  balance_after_usd: 1183.33,
  reference_type: 'order',
  reference_id: 12345,
  notes: 'Refund - Order #12345 failed',
  created_by_type: 'system'
}
```

### 2.5 واجهة المستخدم - الحركات المالية

```
┌───────────────────────────────────────────────────────────────┐
│ 💰 الحركات المالية                                          │
├───────────────────────────────────────────────────────────────┤
│ الرصيد الحالي: 1,183.33 USD                                  │
│ [اليوم] [الأسبوع] [الشهر] [مخصص]                            │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│ ┌─────────────────────────────────────────────────────┐      │
│ │ 📤 استرجاع طلب              2025-10-31 15:45      │      │
│ │ +2.50 USD                                           │      │
│ │ الرصيد: 1180.83 → 1183.33 USD                      │      │
│ │ ملاحظات: Refund - Order #12345 failed             │      │
│ │ [عرض الطلب]                                        │      │
│ └─────────────────────────────────────────────────────┘      │
│                                                               │
│ ┌─────────────────────────────────────────────────────┐      │
│ │ 🎁 شحن من الإدارة           2025-10-31 14:00      │      │
│ │ +50.00 USD                                          │      │
│ │ الرصيد: 1130.83 → 1180.83 USD                      │      │
│ │ ملاحظات: هدية من الإدارة - عيد ميلاد             │      │
│ └─────────────────────────────────────────────────────┘      │
│                                                               │
│ ┌─────────────────────────────────────────────────────┐      │
│ │ 💳 شحن المحفظة             2025-10-31 13:30       │      │
│ │ +133.33 USD                                         │      │
│ │ الرصيد: 997.50 → 1130.83 USD                       │      │
│ │ ملاحظات: حوالة بنكية - 500 SAR                    │      │
│ │ [عرض الدفعة]                                       │      │
│ └─────────────────────────────────────────────────────┘      │
│                                                               │
│ ┌─────────────────────────────────────────────────────┐      │
│ │ 🎮 طلب: PUBG 60 UC          2025-10-31 12:15       │      │
│ │ -2.50 USD                                           │      │
│ │ الرصيد: 1000.00 → 997.50 USD                       │      │
│ │ ملاحظات: PUBG 60 UC - Order #12345                │      │
│ │ [عرض الطلب]                                        │      │
│ └─────────────────────────────────────────────────────┘      │
│                                                               │
│              [تحميل المزيد]                                   │
└───────────────────────────────────────────────────────────────┘
```

---

## 3. الدفعات المالية (Deposit System)

### 3.1 المفهوم

الوكيل يشحن محفظته عن طريق:
1. اختيار وسيلة دفع
2. إدخال المبلغ بعملته
3. رفع إيصال (اختياري)
4. المستأجر يوافق أو يرفض

### 3.2 جدول `payment_methods` (وسائل الدفع)

```sql
Table payment_methods {
  id int [pk, increment]
  tenant_id int [ref: > tenants.id, not null]
  
  method_type varchar [not null]  // bank_transfer, vodafone_cash, usdt, etc
  method_name varchar [not null]  // "حوالة الراجحي", "فودافون كاش"
  
  details jsonb  // بيانات مفصلة حسب النوع
  instructions text  // تعليمات للوكيل
  
  is_active boolean [default: true]
  sort_order int [default: 0]
  
  created_at timestamp [default: `now()`]
  updated_at timestamp [default: `now()`]
}
```

#### أمثلة على `details`:

**حوالة بنكية:**
```json
{
  "bank_name": "بنك الراجحي",
  "account_number": "123456789",
  "iban": "SA1234567890123456789012",
  "account_holder": "شركة الشام للتجارة"
}
```

**فودافون كاش:**
```json
{
  "phone": "+201234567890",
  "account_name": "محمد أحمد"
}
```

**USDT:**
```json
{
  "wallet_address": "TRXabc123...",
  "network": "TRC20"
}
```

### 3.3 جدول `deposit_requests` (طلبات الشحن)

```sql
Table deposit_requests {
  id int [pk, increment]
  uuid varchar [unique, not null]
  tenant_id int [ref: > tenants.id, not null]
  agent_id int [ref: > agents.id, not null]
  payment_method_id int [ref: > payment_methods.id, not null]
  
  // المبلغ بعملة الوكيل
  amount_local decimal(18,3) [not null]  // 500 SAR
  currency_code varchar [not null]       // SAR, EGP, TRY
  
  // التحويل للدولار
  exchange_rate decimal(18,6) [not null]  // 3.75
  amount_usd decimal(18,3) [not null]     // 133.33 USD
  
  // الحالة
  status varchar [default: 'pending']  // pending, approved, rejected
  
  // الملاحظات
  agent_notes text   // من الوكيل: "حولت من حسابي الشخصي"
  tenant_notes text  // من المستأجر: "تم التحويل - رقم العملية: 987654"
  
  // الإيصال
  receipt_url varchar  // رابط صورة الإيصال
  
  // التواريخ
  submitted_at timestamp [default: `now()`]
  reviewed_at timestamp
  reviewed_by int [ref: > tenants.id]
  
  // الربط
  transaction_id int [ref: > transactions.id]  // يُضاف بعد الموافقة
  
  created_at timestamp [default: `now()`]
  updated_at timestamp [default: `now()`]
}
```

### 3.4 التدفق الكامل (Workflow)

#### الخطوة 1: المستأجر يضيف وسائل دفع

```
┌─────────────────────────────────────────┐
│ ⚙️ إعدادات وسائل الدفع                │
├─────────────────────────────────────────┤
│                         [+ إضافة وسيلة]│
│                                         │
│ ┌─────────────────────────────────┐    │
│ │ 🏦 حوالة الراجحي        ● نشط │    │
│ │ IBAN: SA12***************       │    │
│ │ [تعديل] [حذف]                  │    │
│ └─────────────────────────────────┘    │
│                                         │
│ ┌─────────────────────────────────┐    │
│ │ 💵 فودافون كاش          ● نشط │    │
│ │ +20123*******                   │    │
│ │ [تعديل] [حذف]                  │    │
│ └─────────────────────────────────┘    │
│                                         │
│ ┌─────────────────────────────────┐    │
│ │ ₿ USDT (TRC20)           ○ معطل│    │
│ │ TRXabc...                       │    │
│ │ [تعديل] [حذف]                  │    │
│ └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

#### الخطوة 2: الوكيل يطلب شحن

```
┌─────────────────────────────────────────┐
│ 💳 شحن المحفظة                         │
├─────────────────────────────────────────┤
│ اختر وسيلة الدفع:                      │
│ ┌─────────────────────────────────┐    │
│ │ ● حوالة الراجحي                │    │
│ │   IBAN: SA12***************     │    │
│ │   التعليمات: احول ثم أرسل صورة │    │
│ │                                 │    │
│ │ ○ فودافون كاش                  │    │
│ │ ○ USDT (TRC20)                  │    │
│ └─────────────────────────────────┘    │
│                                         │
│ المبلغ (بعملتك):                       │
│ [500_] SAR                              │
│                                         │
│ سعر الصرف الحالي:                      │
│ 1 USD = 3.75 SAR                        │
│                                         │
│ المبلغ المضاف للمحفظة:                 │
│ 133.33 USD                              │
│                                         │
│ ملاحظات (اختياري):                    │
│ [حولت من حسابي الشخصي_______]         │
│                                         │
│ رفع الإيصال (اختياري):                │
│ [📎 اختر ملف]                          │
│                                         │
│              [إرسال الطلب]              │
└─────────────────────────────────────────┘
```

#### الخطوة 3: المستأجر يراجع

```
┌─────────────────────────────────────────────────────┐
│ 💵 طلبات الشحن                                     │
├─────────────────────────────────────────────────────┤
│ [معلق: 3] [مقبول: 25] [مرفوض: 2]                  │
├─────────────────────────────────────────────────────┤
│                                                     │
│ ┌───────────────────────────────────────────┐      │
│ │ الوكيل: محمد               ⏳ معلق       │      │
│ │ الوسيلة: حوالة الراجحي                  │      │
│ │ المبلغ: 500 SAR → 133.33 USD             │      │
│ │ سعر الصرف: 3.75                          │      │
│ │ التاريخ: 2025-10-31 13:30                │      │
│ │                                           │      │
│ │ ملاحظات الوكيل:                          │      │
│ │ "حولت من حسابي الشخصي"                  │      │
│ │                                           │      │
│ │ الإيصال: [📄 عرض الصورة]                │      │
│ │                                           │      │
│ │ ملاحظات المستأجر:                        │      │
│ │ [تم التحويل - رقم العملية: 987654____] │      │
│ │                                           │      │
│ │        [رفض]    [قبول وإضافة للمحفظة]   │      │
│ └───────────────────────────────────────────┘      │
│                                                     │
└─────────────────────────────────────────────────────┘
```

#### الخطوة 4أ: الموافقة

```
عند الضغط على [قبول]:

1. إنشاء معاملة في transactions:
   - type: 'deposit'
   - amount_usd: 133.33
   - balance_before_usd: 997.50
   - balance_after_usd: 1130.83
   - reference_type: 'deposit_request'
   - reference_id: deposit_request.id

2. تحديث رصيد الوكيل:
   - agents.balance_usd = 997.50 + 133.33 = 1130.83

3. تحديث حالة الطلب:
   - deposit_requests.status = 'approved'
   - deposit_requests.reviewed_at = now()
   - deposit_requests.reviewed_by = tenant_id
   - deposit_requests.transaction_id = transaction.id

4. إشعار للوكيل:
   "تم شحن محفظتك بنجاح! +133.33 USD"
```

#### الخطوة 4ب: الرفض

```
عند الضغط على [رفض]:

1. تحديث حالة الطلب:
   - deposit_requests.status = 'rejected'
   - deposit_requests.reviewed_at = now()
   - deposit_requests.reviewed_by = tenant_id
   - deposit_requests.tenant_notes = "الإيصال غير واضح"

2. إشعار للوكيل:
   "طلب الشحن مرفوض: الإيصال غير واضح"
```

### 3.5 تعديل حالة طلب سابق

**السيناريو:**
المستأجر وافق على طلب، ثم اكتشف خطأ

```
الحالة الأصلية: approved
الحالة الجديدة: rejected

الإجراءات:
1. عكس المعاملة:
   - إنشاء transaction جديد:
     * type: 'adjustment'
     * amount_usd: -133.33 (سالب)
     * notes: "Reversal - Deposit Request #789 rejected"
   
2. تحديث الرصيد:
   - agents.balance_usd = 1130.83 - 133.33 = 997.50

3. تحديث الطلب:
   - deposit_requests.status = 'rejected'
   - deposit_requests.updated_at = now()

4. إشعار للوكيل:
   "تم رفض طلب الشحن #789 - تم خصم 133.33 USD"
```

---

## 4. اشتراكات المستأجر (Tenant Subscriptions)

### 4.1 جدول `subscription_payments`

```sql
Table subscription_payments {
  id int [pk, increment]
  uuid varchar [unique, not null]
  tenant_id int [ref: > tenants.id, not null]
  
  amount_usd decimal(18,3) [not null]  // المبلغ المدفوع
  period_start timestamp [not null]    // بداية فترة الاشتراك
  period_end timestamp [not null]      // نهاية فترة الاشتراك (30 يوم)
  
  payment_proof_url varchar  // رابط صورة الإيصال
  payment_method varchar     // bank_transfer, cash, other
  notes text                 // ملاحظات من المستأجر
  
  status varchar [default: 'pending']  // pending, approved, rejected
  
  submitted_at timestamp     // وقت الإرسال
  approved_by int [ref: > super_admins.id]
  approved_at timestamp
  rejection_reason text
  
  created_at timestamp [default: `now()`]
}
```

### 4.2 جدول `subscription_grace_periods`

```sql
Table subscription_grace_periods {
  id int [pk, increment]
  tenant_id int [ref: > tenants.id, not null]
  
  hours_granted int [not null]  // 48 ساعة مثلاً
  granted_by int [ref: > super_admins.id, not null]
  
  start_time timestamp [not null]
  end_time timestamp [not null]
  
  reason text  // "متأخر بالدفع - مسافر"
  
  created_at timestamp [default: `now()`]
}
```

---

## 5. ملخص الجداول

| الجدول | الغرض | من يستخدمه |
|--------|-------|------------|
| `transactions` | سجل كل حركة على المحفظة | الوكيل (للمراجعة) |
| `payment_methods` | وسائل الدفع المتاحة | المستأجر (الإعدادات) |
| `deposit_requests` | طلبات شحن المحفظة | الوكيل → المستأجر |
| `subscription_payments` | دفعات اشتراك المستأجر | المستأجر → Super Admin |
| `subscription_grace_periods` | فترات سماح للمستأجر | Super Admin |

---

## 6. التقارير المالية

### 6.1 تقرير الوكيل

```sql
-- إجمالي الإيداعات اليوم
SELECT SUM(amount_usd) 
FROM transactions 
WHERE agent_id = ? 
  AND type = 'deposit' 
  AND DATE(created_at) = CURRENT_DATE;

-- إجمالي الطلبات اليوم
SELECT SUM(ABS(amount_usd)) 
FROM transactions 
WHERE agent_id = ? 
  AND type = 'order' 
  AND DATE(created_at) = CURRENT_DATE;

-- صافي الحركة اليوم
SELECT SUM(amount_usd) 
FROM transactions 
WHERE agent_id = ? 
  AND DATE(created_at) = CURRENT_DATE;
```

### 6.2 تقرير المستأجر

```sql
-- طلبات الشحن المعلقة
SELECT COUNT(*) 
FROM deposit_requests 
WHERE tenant_id = ? 
  AND status = 'pending';

-- إجمالي الشحن المقبول هذا الشهر
SELECT SUM(amount_usd) 
FROM deposit_requests 
WHERE tenant_id = ? 
  AND status = 'approved' 
  AND MONTH(reviewed_at) = MONTH(CURRENT_DATE);
```

---

## 7. الأمان (Security)

### 7.1 التشفير
- كل كلمات السر: `bcrypt` أو `argon2`
- التوكنات: تشفير AES-256
- بيانات البنوك الحساسة: تشفير في الـ `details` jsonb

### 7.2 الصلاحيات
- **الوكيل**: يرى معاملاته فقط
- **المستأجر**: يرى معاملات وكلائه فقط
- **Super Admin**: يرى كل شيء

### 7.3 Audit Log
كل عملية حساسة تُسجل:
- من قام بها (`created_by_type` + `created_by_id`)
- متى (`created_at`)
- ماذا (`type` + `notes`)

---

## 8. TODO: نقاط للمستقبل

- [ ] **السحب (Withdrawal)**: الوكيل يطلب سحب رصيد
- [ ] **العمولات**: نسبة للمستأجر من كل طلب
- [ ] **الخصومات التلقائية**: خصم رسوم شهرية
- [ ] **تقارير متقدمة**: Excel/PDF export
- [ ] **الإشعارات**: عند كل حركة مالية

---

**تم بحمد الله!** 🎉
