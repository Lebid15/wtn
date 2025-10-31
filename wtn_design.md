# WTN Design System

> نظام التصميم الشامل لمنصة **وطن (WTN)** - منصة SaaS متعددة المستأجرين للشحن الرقمي

---

## فلسفة التصميم (Design Philosophy)

### العزل الكامل (Full Isolation)
كل دور له **تصميم مستقل تمامًا** من حيث:
- Layout (Sidebar, Header, Footer)
- توزيع العناصر على الشاشة
- تجربة المستخدم (UX Flow)
- Responsive Design للموبايل

### المشاركة الذكية (Smart Sharing)
نشارك فقط **الأساسيات** لضمان الاتساق:
- UI Components الأساسية (Buttons, Inputs, Modals...)
- Design Tokens (ألوان، خطوط، مسافات)
- Icons ومجموعة الأيقونات
- Utils/Helpers

---

## الهيكلة العامة (Structure Overview)

### Frontend Architecture:
```
app/
├── (super-admin)/
│   ├── layout.tsx                    # Layout خاص بالـ Super Admin
│   ├── _components/                  # Components مخصصة
│   │   ├── Sidebar.tsx               # Sidebar خاص
│   │   ├── Header.tsx                # Header خاص
│   │   ├── Footer.tsx                # Footer خاص
│   │   ├── StatsCard.tsx
│   │   └── TenantTable.tsx
│   ├── dashboard/
│   ├── tenants/
│   └── settings/
│
├── (tenant)/
│   ├── layout.tsx                    # Layout خاص بالـ Tenant
│   ├── _components/                  # Components مخصصة
│   │   ├── Sidebar.tsx               # تصميم مختلف تمامًا
│   │   ├── Header.tsx                # تصميم مختلف تمامًا
│   │   ├── Footer.tsx                # تصميم مختلف تمامًا
│   │   ├── ProductCard.tsx
│   │   └── AgentList.tsx
│   ├── dashboard/
│   ├── products/
│   ├── agents/
│   └── orders/
│
├── (agent)/
│   ├── layout.tsx                    # Layout خاص بالـ Agent
│   ├── _components/                  # Components مخصصة
│   │   ├── BottomNav.tsx             # Bottom Navigation للموبايل
│   │   ├── Header.tsx                # Header مبسّط
│   │   ├── Footer.tsx                # Footer مختصر
│   │   └── QuickOrderForm.tsx
│   ├── dashboard/
│   ├── new-order/
│   └── history/
│
└── _shared/                          # المشترك فقط
    ├── ui/                           # UI Components الأساسية
    │   ├── button.tsx
    │   ├── input.tsx
    │   ├── select.tsx
    │   ├── card.tsx
    │   ├── modal.tsx
    │   ├── alert.tsx
    │   ├── table.tsx
    │   └── ...
    ├── icons/                        # مجموعة الأيقونات
    │   ├── IconDashboard.tsx
    │   ├── IconProduct.tsx
    │   ├── IconAgent.tsx
    │   └── ...
    ├── theme/                        # Design Tokens
    │   ├── colors.ts
    │   ├── typography.ts
    │   ├── spacing.ts
    │   └── breakpoints.ts
    └── utils/                        # Helpers
        ├── formatCurrency.ts
        ├── formatDate.ts
        └── api-client.ts
```

---

## اللغات المدعومة (Languages)

### اللغات الثلاث:
1. **العربية (Arabic)** - RTL
2. **التركية (Turkish)** - LTR
3. **الإنجليزية (English)** - LTR

### ملاحظات:
- كل دور يدعم اللغات الثلاث
- التبديل بين اللغات من Header/Settings
- RTL/LTR يتم التعامل معه تلقائيًا
- الترجمات في ملفات منفصلة (i18n)

---

## الثيمات (Themes)

### الثيمان المدعومان:
1. **Light Mode** (الوضع الفاتح)
2. **Dark Mode** (الوضع الداكن)

### التطبيق:
- كل دور يدعم الثيمين
- التبديل من Header أو Settings
- الحفظ في localStorage
- CSS Variables للتحويل السلس

---

<!-- ------------------------------------------------- -->
<!-- ------------------------------------------------- -->
<!-- ------------------------------------------------- -->

## Design Tokens (القيم المشتركة)

### الألوان (Colors)

#### Primary Colors (الألوان الرئيسية):
```css
/* Light Mode */
--primary: #3B82F6;           /* أزرق */
--primary-hover: #2563EB;
--primary-light: #DBEAFE;

/* Dark Mode */
--primary-dark: #60A5FA;
--primary-hover-dark: #3B82F6;
```

#### Secondary Colors:
```css
--secondary: #10B981;         /* أخضر */
--warning: #F59E0B;           /* برتقالي */
--danger: #EF4444;            /* أحمر */
--info: #06B6D4;              /* سماوي */
```

#### Neutral Colors:
```css
/* Light Mode */
--background: #F5F7FA;        /* رمادي فاتح جداً */
--surface: #FFFFFF;           /* أبيض نظيف */
--surface-header: #FF8C42;    /* برتقالي فاتح دافئ */
--text-primary: #111827;
--text-secondary: #6B7280;
--border: #E5E7EB;

/* Dark Mode */
--background-dark: #0A0E14;   /* أسود قريب */
--surface-dark: #151922;      /* رمادي داكن جداً */
--surface-header-dark: #0F1419; /* أغمق من الخلفية */
--text-primary-dark: #F9FAFB;
--text-secondary-dark: #9CA3AF;
--border-dark: #1F2937;
```

#### Status Colors:
```css
--success: #10B981;
--error: #EF4444;
--warning: #F59E0B;
--pending: #F59E0B;
```

---

### الخطوط (Typography)

#### Font Families:
```css
/* العربية */
--font-arabic: 'Cairo', sans-serif;

/* التركية والإنجليزية */
--font-latin: 'Inter', 'Segoe UI', sans-serif;

/* الأرقام */
--font-mono: 'JetBrains Mono', monospace;
```

#### Font Sizes:
```css
--text-xs: 0.75rem;      /* 12px */
--text-sm: 0.875rem;     /* 14px */
--text-base: 1rem;       /* 16px */
--text-lg: 1.125rem;     /* 18px */
--text-xl: 1.25rem;      /* 20px */
--text-2xl: 1.5rem;      /* 24px */
--text-3xl: 1.875rem;    /* 30px */
--text-4xl: 2.25rem;     /* 36px */
```

#### Font Weights:
```css
--font-light: 300;
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;
```

---

### المسافات (Spacing)

```css
--spacing-0: 0;
--spacing-1: 0.25rem;    /* 4px */
--spacing-2: 0.5rem;     /* 8px */
--spacing-3: 0.75rem;    /* 12px */
--spacing-4: 1rem;       /* 16px */
--spacing-5: 1.25rem;    /* 20px */
--spacing-6: 1.5rem;     /* 24px */
--spacing-8: 2rem;       /* 32px */
--spacing-10: 2.5rem;    /* 40px */
--spacing-12: 3rem;      /* 48px */
--spacing-16: 4rem;      /* 64px */
```

---

### الحواف (Border Radius)

```css
--radius-none: 0;
--radius-sm: 0.25rem;    /* 4px */
--radius-md: 0.5rem;     /* 8px */
--radius-lg: 0.75rem;    /* 12px */
--radius-xl: 1rem;       /* 16px */
--radius-full: 9999px;   /* دائري */
```

---

### الظلال (Shadows)

```css
/* Light Mode */
--shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
--shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
--shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
--shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1);

/* Dark Mode */
--shadow-sm-dark: 0 1px 2px 0 rgba(0, 0, 0, 0.5);
--shadow-md-dark: 0 4px 6px -1px rgba(0, 0, 0, 0.6);
--shadow-lg-dark: 0 10px 15px -3px rgba(0, 0, 0, 0.7);
```

---

### Breakpoints (نقاط التحول)

```css
--breakpoint-sm: 640px;    /* موبايل كبير */
--breakpoint-md: 768px;    /* تابلت */
--breakpoint-lg: 1024px;   /* لابتوب */
--breakpoint-xl: 1280px;   /* شاشة كبيرة */
--breakpoint-2xl: 1536px;  /* شاشة ضخمة */
```

---

<!-- ------------------------------------------------- -->
<!-- ------------------------------------------------- -->
<!-- ------------------------------------------------- -->

## مكتبة Components المشتركة

### 1. Button (الأزرار)

#### الأنواع (Variants):
- **Primary:** الإجراء الرئيسي
- **Secondary:** إجراء ثانوي
- **Outline:** زر بإطار فقط
- **Ghost:** زر شفاف
- **Danger:** إجراء خطر (حذف، إلغاء...)

#### الأحجام (Sizes):
- **sm:** صغير (32px height)
- **md:** متوسط (40px height)
- **lg:** كبير (48px height)

#### الحالات (States):
- Default
- Hover
- Active
- Disabled
- Loading

#### مثال:
```tsx
<Button variant="primary" size="md">
  حفظ
</Button>

<Button variant="danger" size="sm" disabled>
  حذف
</Button>
```

---

### 2. Input (حقول الإدخال)

#### الأنواع:
- Text
- Number
- Email
- Password
- Search
- Textarea

#### الحالات:
- Default
- Focus
- Error
- Disabled
- Read-only

#### Features:
- Label
- Placeholder
- Helper Text
- Error Message
- Icons (prefix/suffix)

#### مثال:
```tsx
<Input
  type="text"
  label="اسم المنتج"
  placeholder="أدخل اسم المنتج"
  error="هذا الحقل مطلوب"
  required
/>
```

---

### 3. Select (قوائم الاختيار)

#### الأنواع:
- Single Select
- Multi Select
- Searchable Select

#### Features:
- Label
- Placeholder
- Error State
- Disabled State
- Custom Options

---

### 4. Card (البطاقات)

#### الأنواع:
- Default Card
- Interactive Card (clickable)
- Stats Card
- Product Card

#### Features:
- Header
- Body
- Footer
- Border
- Shadow
- Hover Effect

---

### 5. Modal (النوافذ المنبثقة)

#### الأنواع:
- Confirmation Modal
- Form Modal
- Info Modal
- Full Screen Modal

#### Features:
- Title
- Close Button
- Footer Actions
- Overlay
- Animation

---

### 6. Alert/Toast (التنبيهات)

#### الأنواع:
- Success
- Error
- Warning
- Info

#### Positions:
- Top Right
- Top Center
- Bottom Right
- Bottom Center

---

### 7. Table (الجداول)

#### Features:
- Sortable Columns
- Pagination
- Search/Filter
- Row Selection
- Actions Column
- Responsive (Mobile)

---

### 8. Icons (الأيقونات)

#### المجموعة:
- Dashboard
- Products
- Agents
- Orders
- Settings
- Notifications
- Currency
- Language
- Theme Toggle
- Search
- Filter
- Edit
- Delete
- Plus
- Check
- Close
- Arrow (Up/Down/Left/Right)

#### المكتبة المقترحة:
- **Lucide React** (أو Heroicons)
- حجم موحّد: 20px, 24px

---

<!-- ------------------------------------------------- -->
<!-- ------------------------------------------------- -->
<!-- ------------------------------------------------- -->

## تصميم Super Admin

### الخصائص:
- **الهدف:** إدارة المنصة والمستأجرين
- **المستخدم:** مطور/مدير تقني
- **التركيز:** جداول، إحصائيات، إدارة

### Layout Structure:
```
┌──────────────────────────────────────────┐
│           Header (Fixed)                 │
│  [Logo] [Search] [Notifications] [User] │
├────────┬─────────────────────────────────┤
│        │                                 │
│ Side   │        Main Content             │
│ bar    │                                 │
│        │   [Stats Cards]                 │
│ - Dashboard                              │
│ - Tenants  [Tenants Table]               │
│ - Settings                               │
│        │                                 │
│        │   [Pagination]                  │
│        │                                 │
└────────┴─────────────────────────────────┘
```

**ملاحظة مهمة:** لا يوجد Footer في تصميم Super Admin

### Sidebar:
- عرض: 280px (Desktop)
- قابل للطي: نعم
- الموبايل: Drawer (منزلق من اليمين/اليسار)
- محتويات:
  - Dashboard
  - Tenants (إدارة المستأجرين)
  - Settings
  - System Logs

### Header:
- ارتفاع: 64px
- ثابت (Sticky)
- محتويات:
  - شعار المنصة (WTN)
  - بحث عام
  - إشعارات
  - تبديل اللغة
  - تبديل الثيم
  - قائمة المستخدم

### الصفحة الرئيسية (Dashboard):
- Stats Cards (عدد المستأجرين، النشطين، إجمالي الإيرادات...)
- Recent Activity
- System Health
- Quick Actions

### Mobile Responsive:
- Sidebar → Drawer (overlay)
- Stats Cards → تبقى كما هي مع تصغير
- Tables → Responsive (قد تتحول لـ Cards)
- Header → مبسّط (بعض العناصر في قائمة)

---

<!-- ------------------------------------------------- -->
<!-- ------------------------------------------------- -->
<!-- ------------------------------------------------- -->

## تصميم Tenant (المستأجر)

### الخصائص:
- **الهدف:** إدارة المتجر والوكلاء
- **المستخدم:** صاحب متجر
- **التركيز:** منتجات، وكلاء، طلبات، إحصائيات

### Layout Structure:
```
┌──────────────────────────────────────────┐
│           Header (Fixed/Sticky)          │
│ [StoreLogo] [Nav] [Notifications] [User]│
├────────┬─────────────────────────────────┤
│        │                                 │
│ Side   │        Main Content             │
│ bar    │                                 │
│        │   [Revenue Chart]               │
│ 📊 لوحة التحكم                           │
│ 📦 المنتجات [Recent Orders]             │
│ 👥 الوكلاء                               │
│ 📋 الطلبات  [Top Products]              │
│ 💰 العملات                               │
│ ⚙️  الإعدادات                            │
│        │                                 │
├────────┴─────────────────────────────────┤
│         Footer (مختصر)                   │
│  © 2025 | Privacy | Terms | Support     │
└──────────────────────────────────────────┘
```

### Sidebar:
- عرض: 260px (Desktop)
- **مع أيقونات واضحة** لكل قسم
- ألوان: تتماشى مع branding المستأجر
- أقسام:
  - 📊 لوحة التحكم (Dashboard)
  - 📦 المنتجات (Products)
  - 👥 الوكلاء (Agents)
  - 📋 الطلبات (Orders)
  - 💰 العملات (Currencies)
  - ⚙️ الإعدادات (Settings)
  - 📊 التقارير (Reports)

### Header:
- ارتفاع: 64px
- ثابت (Sticky) - يبقى مرئياً عند التمرير
- محتويات:
  - **شعار المستأجر** (قابل للتخصيص)
  - روابط سريعة (Quick Actions)
  - **Balance Display:** رصيد المستأجر بالدولار
  - إشعارات
  - تبديل اللغة
  - تبديل الثيم
  - قائمة المستخدم

### Footer:
- **مختصر جداً**
- ارتفاع: 48px
- محتويات:
  - حقوق النشر (© 2025 WTN)
  - روابط أساسية: Privacy Policy | Terms | Support
  - رقم الإصدار (اختياري)

### Dashboard:
- Revenue Chart (مبيعات آخر 30 يوم)
- Stats Cards:
  - إجمالي المبيعات
  - عدد الوكلاء النشطين
  - الطلبات اليوم
  - الأرباح الشهرية
- Top Agents (أفضل 5 وكلاء)
- Recent Orders (آخر 10 طلبات)
- Quick Actions (إضافة منتج، إضافة وكيل...)

### Mobile Responsive - ⚠️ استراتيجية خاصة:
**هام جداً:** لا Responsive تقليدي!

#### الفلسفة:
- ✅ **نفس تصميم الحاسوب** (مصغّر ليناسب الشاشة)
- ✅ **كل المحتوى يظهر كاملاً** (جداول، charts، cards)
- ✅ **لا Horizontal Scroll** للجداول
- ✅ **المستأجر يستخدم Pinch-to-Zoom** للتكبير/التصغير
- ✅ **Viewport Meta Tag:** 
  ```html
  <meta name="viewport" content="width=device-width, initial-scale=0.5, 
        minimum-scale=0.3, maximum-scale=2.0, user-scalable=yes">
  ```

#### التطبيق:
```css
/* Mobile للـ Tenant فقط */
@media (max-width: 768px) {
  body {
    zoom: 0.65; /* تصغير كل المحتوى */
    -moz-transform: scale(0.65);
  }
  
  /* الجداول تبقى كاملة - لا تتحول لـ Cards */
  .table {
    width: 100%;
    font-size: 0.75rem; /* خط أصغر */
  }
  
  /* Sidebar → زر فقط */
  .sidebar {
    position: fixed;
    left: -260px; /* مخفي */
    transition: left 0.3s ease;
  }
  
  .sidebar.open {
    left: 0; /* يظهر عند الضغط */
  }
  
  /* زر Hamburger Menu */
  .sidebar-toggle {
    display: block;
    position: fixed;
    top: 16px;
    right: 16px;
    z-index: 1000;
  }
}
```

#### Mobile Behavior:
- **Sidebar:** زر Hamburger Menu في الأعلى → عند الضغط يظهر Sidebar كـ Overlay
- **الجداول:** تظهر كاملة (مصغّرة) - المستأجر يزوم بالأصابع لرؤية التفاصيل
- **Charts:** تظهر كاملة (مصغّرة)
- **Stats Cards:** تبقى في صف واحد (مصغّرة)
- **Header:** يبقى ثابت (sticky) مع المحتويات كاملة

#### السبب:
- المستأجر = مستخدم محترف
- يحتاج رؤية **كل البيانات دفعة واحدة**
- Responsive التقليدي = إخفاء معلومات أو Stack عمودي
- الزوم اليدوي = **تحكم كامل** للمستخدم

---

<!-- ------------------------------------------------- -->
<!-- ------------------------------------------------- -->
<!-- ------------------------------------------------- -->

## تصميم Agent (الوكيل)

### الخصائص:
- **الهدف:** إنشاء طلبات بسرعة
- **المستخدم:** صاحب محل (غير تقني)
- **التركيز:** سرعة، بساطة، موبايل أولاً
- **التصميم:** Mobile First (مصمم للهاتف أساساً)

### Layout Structure (Desktop & Mobile):
```
┌──────────────────────────────────────────┐
│           Header (Fixed/Sticky)          │
│  [💼 Tenant Logo] [المحفظة] [الوكيل ▼] │
│   500.00 ر.س                             │
└──────────────────────────────────────────┘

            Main Content Area
     (يتغير حسب القسم المختار)

┌──────────────────────────────────────────┐
│        Bottom Navigation (Footer)        │
│  [🏠] [➕ طلب جديد] [📋] [👤]            │
│ Dashboard  New Order  History  Profile   │
└──────────────────────────────────────────┘
```

**ملاحظة مهمة:** لا يوجد Sidebar - التنقل كامل من Bottom Navigation

### Header (ثابت - Sticky):
- ارتفاع: 60px
- ثابت في الأعلى دائماً
- محتويات:
  1. **لوغو المستأجر** (جهة اليمين في RTL)
     - صورة صغيرة (40×40px)
     - قابل للنقر → يرجع للـ Dashboard
  
  2. **المحفظة (Balance Display)** (في المنتصف)
     - الرصيد الحالي **بعملة الوكيل المفضلة**
     - حجم كبير وواضح
     - لون مميز (أخضر إذا موجب، أحمر إذا سالب)
     - مثال: `500.00 ر.س` أو `-125.50 ₺`
  
  3. **اسم الوكيل + قائمة** (جهة اليسار في RTL)
     - الاسم الظاهر (Display Name)
     - أيقونة ▼ للقائمة المنسدلة:
       - الإعدادات
       - تبديل اللغة
       - تبديل الثيم
       - تسجيل الخروج

### Bottom Navigation (Footer):
- ارتفاع: 64px
- ثابت في الأسفل دائماً
- **أيقونات كبيرة** (سهلة للمس)
- 4 أقسام رئيسية:

  1. **🏠 Dashboard** (الرئيسية)
     - إحصائيات اليوم
     - آخر الطلبات
     - الرصيد
  
  2. **➕ New Order** (طلب جديد) - **مميز!**
     - زر أكبر من الباقي
     - لون Primary بارز
     - أهم وظيفة للوكيل
  
  3. **📋 History** (السجل)
     - سجل الطلبات
     - فلترة بالتاريخ
     - حالة الطلبات
  
  4. **👤 Profile** (الملف الشخصي)
     - معلومات الوكيل
     - الإعدادات
     - الإحصائيات

### New Order Page (الصفحة الأهم):
تصميم مخصص للسرعة:

```
┌──────────────────────────────────────────┐
│  Header (Logo + Balance + Name)         │
├──────────────────────────────────────────┤
│                                          │
│  [1] اختر المنتج 🔍                     │
│  ┌────────────────────────────────────┐  │
│  │ [بحث أو اختر من القائمة...]       │  │
│  └────────────────────────────────────┘  │
│                                          │
│  [2] أدخل بيانات الزبون                 │
│  ┌────────────────────────────────────┐  │
│  │ Player ID / رقم الحساب            │  │
│  └────────────────────────────────────┘  │
│                                          │
│  [3] تأكيد الطلب                        │
│  ┌────────────────────────────────────┐  │
│  │ المنتج: شحن PUBG 100 ريال          │  │
│  │ السعر: 105.00 ر.س                  │  │
│  │ رصيدك بعد الطلب: 395.00 ر.س        │  │
│  └────────────────────────────────────┘  │
│                                          │
│  [إرسال الطلب - زر كبير]                │
│                                          │
├──────────────────────────────────────────┤
│  Bottom Nav [Dashboard|NEW|History|Me]   │
└──────────────────────────────────────────┘
```

**Features:**
- خطوات مرقمة واضحة
- Autofocus على حقل البحث
- أزرار كبيرة (min 48px height)
- ألوان متباينة
- تأكيد قبل الإرسال

### Dashboard:
```
┌──────────────────────────────────────────┐
│  📊 إحصائيات اليوم                       │
│  ┌──────┬──────┬──────┐                  │
│  │ 12   │ 1,250│ 250  │                  │
│  │طلبات │ ر.س  │ ر.س  │                  │
│  │اليوم │مبيعات│ربح   │                  │
│  └──────┴──────┴──────┘                  │
│                                          │
│  📋 آخر الطلبات                          │
│  ┌────────────────────────────────────┐  │
│  │ PUBG 100 ر.س - مكتمل ✓ 10:30 ص   │  │
│  │ iTunes 50 ر.س - معلق ⏳ 09:15 ص   │  │
│  └────────────────────────────────────┘  │
│                                          │
│  [زر: طلب جديد سريع]                    │
└──────────────────────────────────────────┘
```

### Mobile First Design:
- **كل التصميم للموبايل أساساً**
- أزرار كبيرة (Easy to Tap)
- مسافات واضحة بين العناصر (min 8px)
- خطوط كبيرة (min 16px)
- لا Sidebar - كل شيء من Bottom Nav
- Focus على السرعة والوضوح

### Desktop View:
- نفس التصميم!
- فقط: عرض أكبر (max-width: 480px مع margin auto)
- يظهر في المنتصف كـ "Mobile View"
- مثل تطبيق موبايل على الحاسوب

### الألوان والأيقونات:
- ألوان المستأجر (Tenant Branding)
- أيقونات واضحة كبيرة (24px)
- High Contrast للقراءة السهلة
- أزرار بارزة (Shadow + Border)

### Accessibility (سهولة الوصول):
- أزرار كبيرة (48×48px minimum)
- ألوان متباينة (WCAG AAA)
- Focus States واضحة
- Font Size قابل للتكبير

### الأداء:
- صفحات خفيفة جداً
- تحميل سريع (< 1 second)
- Offline Mode (PWA اختياري)
- Cache للمنتجات المتكررة

---

<!-- ------------------------------------------------- -->
<!-- ------------------------------------------------- -->
<!-- ------------------------------------------------- -->

## ملاحظات عامة

### 1. الاتساق (Consistency):
- نفس الـ Design Tokens في كل الأدوار
- نفس الـ Components الأساسية
- أسماء موحّدة للـ CSS Classes

### 2. إمكانية الوصول (Accessibility):
- ARIA Labels
- Keyboard Navigation
- Focus States واضحة
- Color Contrast (WCAG AA)

### 3. الأداء (Performance):
- Lazy Loading للصور
- Code Splitting حسب الدور
- CSS/JS Minification
- Image Optimization

### 4. التوثيق:
- Storybook للـ Components
- أمثلة لكل Component
- Props Documentation

### 5. الاختبار:
- Unit Tests للـ Components
- Visual Regression Tests
- Responsive Testing (أجهزة مختلفة)

---

## الخطوات التالية

1. ✅ إعداد Design Tokens (CSS Variables)
2. ✅ بناء مكتبة Components المشتركة
3. ✅ تصميم Layouts لكل دور
4. ✅ تطبيق RTL/LTR
5. ✅ تطبيق Dark/Light Mode
6. ✅ اختبار على أجهزة مختلفة
7. ✅ توثيق كل Component

---

**آخر تحديث:** 31 أكتوبر 2025
