# نظام API للوسطاء - External API System
## السماح للجهات الخارجية بإرسال الطلبات

---

## 1. نظرة عامة (Overview)

### 1.1 المفهوم

كل مستأجر (وسيط) له API خاص به:

```
الفكرة:
├─ المستأجر ينشئ API Token لكل عميل خارجي
├─ العميل الخارجي يرسل طلبات الشراء عبر API
├─ النظام يعالج الطلب ويرد بالنتيجة
└─ المستأجر يتحكم في: IP المسموح، الصلاحيات، الحد اليومي
```

### 1.2 حالة الاستخدام

```
مثال واقعي:
1. شركة "GameStore" تريد شراء UC من وسيطك
2. تنشئ لهم API Token في لوحة التحكم
3. GameStore تبني موقعها وتربطه بـ API الخاص بك
4. عندما عميل GameStore يشتري UC → طلب يُرسل لـ API الخاص بك
5. أنت تستلم الطلب وتعالجه وترد بالنتيجة
```

---

## 2. هيكل قاعدة البيانات

### 2.1 جدول `api_tokens`

```sql
Table api_tokens {
  id int [pk, increment]
  tenant_id int [ref: > tenants.id, not null]
  
  // معلومات الـ Token
  token varchar(64) [unique, not null]  // API Token (SHA256 hash)
  label varchar(100)  // "GameStore API", "Mobile App"
  
  // الأمان
  allowed_ips text  // "192.168.1.1,192.168.1.2" (null = any IP)
  is_active boolean [default: true]
  
  // الحدود
  daily_limit int  // 1000 طلب يومي (null = unlimited)
  daily_usage int [default: 0]  // عدد الطلبات اليوم
  last_reset_date date  // آخر إعادة تعيين للعداد
  
  // إحصائيات
  total_requests int [default: 0]
  total_orders int [default: 0]
  last_used_at timestamp
  last_ip varchar(45)
  
  created_at timestamp [default: `now()`]
  updated_at timestamp [default: `now()`]
  
  indexes {
    (tenant_id, is_active)
    token
  }
}
```

### 2.2 جدول `api_logs`

```sql
Table api_logs {
  id int [pk, increment]
  api_token_id int [ref: > api_tokens.id, not null]
  tenant_id int [ref: > tenants.id, not null]
  
  // معلومات الطلب
  endpoint varchar(255)  // "/api/v1/products"
  method varchar(10)  // "GET", "POST"
  ip_address varchar(45)
  
  // البيانات
  request_body text  // JSON
  response_body text  // JSON
  response_code int  // 200, 400, 500
  
  // الأداء
  response_time_ms int  // 45 ms
  
  // النتيجة
  status varchar(20)  // "success", "error", "unauthorized"
  error_code varchar(10)  // "100", "109"
  
  created_at timestamp [default: `now()`]
  
  indexes {
    (api_token_id, created_at)
    (tenant_id, created_at)
    (status, created_at)
  }
}
```

### 2.3 تحديث جدول `orders`

```sql
Table orders {
  ...
  
  // مصدر الطلب
  source varchar(20) [default: 'web']  // "web", "api", "mobile"
  api_token_id int [ref: > api_tokens.id]  // إذا source = 'api'
  order_uuid varchar(36) [unique]  // UUID للـ idempotency
  
  ...
}
```

---

## 3. واجهة المستأجر - إدارة API

### 3.1 قسم API في لوحة التحكم

```
┌──────────────────────────────────────────────────────────────┐
│ 🔌 API التكامل مع الأنظمة الخارجية                          │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│ رابط API الخاص بك:                                          │
│ ┌────────────────────────────────────────────────┐           │
│ │ https://api.wtn.com/tenant/alsham/v1/         │ [نسخ]   │
│ └────────────────────────────────────────────────┘           │
│                                                              │
│ [📖 توثيق API]  [📊 الإحصائيات]  [+ إنشاء Token جديد]     │
│                                                              │
│ ┌──────────────────────────────────────────────────────┐    │
│ │ 🔑 API Tokens                                        │    │
│ ├──────────────────────────────────────────────────────┤    │
│ │ الاسم        │ Token          │ الحالة  │ إجراءات  │    │
│ ├──────────────┼────────────────┼─────────┼───────────┤    │
│ │ GameStore    │ wtn_7k2m...3x  │ ● نشط  │ [⚙] [🗑]  │    │
│ │ API          │ [نسخ]          │         │           │    │
│ │              │                │         │           │    │
│ │ 📊 1,245 طلب │ 328 طلب اليوم │         │           │    │
│ │ آخر استخدام: منذ 5 دقائق      │         │           │    │
│ │ IP: 92.113.22.6                │         │           │    │
│ ├──────────────┼────────────────┼─────────┼───────────┤    │
│ │ Mobile App   │ wtn_9m4p...7z  │ ● نشط  │ [⚙] [🗑]  │    │
│ │ API          │ [نسخ]          │         │           │    │
│ │              │                │         │           │    │
│ │ 📊 856 طلب   │ 120 طلب اليوم │         │           │    │
│ │ آخر استخدام: منذ ساعة         │         │           │    │
│ ├──────────────┼────────────────┼─────────┼───────────┤    │
│ │ Old Token    │ wtn_1x8f...2k  │ ○ معطل │ [⚙] [🗑]  │    │
│ │              │                │         │           │    │
│ │ 📊 5,621 طلب │ 0 طلب اليوم   │         │           │    │
│ │ آخر استخدام: منذ 3 أيام       │         │           │    │
│ └──────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────┘
```

### 3.2 إنشاء Token جديد

```
┌──────────────────────────────────────────────────────┐
│ + إنشاء API Token جديد                              │
├──────────────────────────────────────────────────────┤
│                                                      │
│ اسم التطبيق: *                                      │
│ ┌──────────────────────────────────────┐            │
│ │ GameStore API                        │            │
│ └──────────────────────────────────────┘            │
│                                                      │
│ الحد اليومي للطلبات:                               │
│ ┌──────────────────────────────────────┐            │
│ │ 1000                                 │ طلب/يوم   │
│ └──────────────────────────────────────┘            │
│ ☑ بدون حد (غير محدود)                             │
│                                                      │
│ قائمة IP المسموحة (اختياري):                       │
│ ┌──────────────────────────────────────┐            │
│ │ 192.168.1.1                          │            │
│ │ 192.168.1.2                          │            │
│ └──────────────────────────────────────┘            │
│ أدخل كل IP في سطر منفصل                            │
│ ☑ السماح لجميع IP (غير آمن)                       │
│                                                      │
│ الصلاحيات:                                          │
│ ☑ عرض المنتجات                                     │
│ ☑ إنشاء طلبات                                      │
│ ☑ فحص حالة الطلبات                                 │
│ ☑ عرض الرصيد                                       │
│ ☐ سحب من الرصيد (خطر)                             │
│                                                      │
│ الحالة:                                             │
│ ● نشط    ○ معطل                                    │
│                                                      │
│           [إلغاء]        [إنشاء Token]              │
└──────────────────────────────────────────────────────┘
```

### 3.3 عرض Token (مرة واحدة فقط)

```
┌──────────────────────────────────────────────────────┐
│ ✅ تم إنشاء API Token بنجاح                         │
├──────────────────────────────────────────────────────┤
│                                                      │
│ ⚠️ انسخ هذا الـ Token الآن                          │
│ لن تتمكن من رؤيته مرة أخرى!                        │
│                                                      │
│ ┌────────────────────────────────────────────┐      │
│ │ wtn_7k2mP9xL4vQ8nR3sT6yU1wZ5hJ0bN4cD3fG2  │ [نسخ]│
│ └────────────────────────────────────────────┘      │
│                                                      │
│ معلومات الاستخدام:                                 │
│ • احتفظ بهذا الـ Token في مكان آمن                 │
│ • أرسله في Header باسم: Authorization              │
│ • القيمة: Bearer wtn_7k2m...                        │
│                                                      │
│ مثال (cURL):                                        │
│ ┌────────────────────────────────────────────┐      │
│ │ curl -H "Authorization: Bearer wtn_7k2m..." │      │
│ │   https://api.wtn.com/tenant/alsham/v1/...  │      │
│ └────────────────────────────────────────────┘      │
│                                                      │
│                                [فهمت، أغلق]         │
└──────────────────────────────────────────────────────┘
```

### 3.4 صفحة التوثيق (للعميل الخارجي)

```
┌──────────────────────────────────────────────────────────┐
│ 📖 API Documentation                                     │
│ الشام - توثيق API                                        │
├──────────────────────────────────────────────────────────┤
│                                                          │
│ Base URL:                                                │
│ https://api.wtn.com/tenant/alsham/v1/                   │
│                                                          │
│ Authentication Required                                  │
│ Include the following header in all API requests:       │
│                                                          │
│ Authorization: Bearer YOUR_API_TOKEN                     │
│                                                          │
│ ──────────────────────────────────────────────────────  │
│                                                          │
│ 📊 Profile                                               │
│ GET /profile                                             │
│                                                          │
│ Retrieves your account balance and information.         │
│                                                          │
│ Response Example:                                        │
│ {                                                        │
│   "status": "success",                                   │
│   "data": {                                              │
│     "balance_usd": "8788.683",                          │
│     "currency": "USD",                                   │
│     "display_name": "GameStore",                        │
│     "api_limits": {                                      │
│       "daily_limit": 1000,                              │
│       "daily_usage": 328,                               │
│       "remaining": 672                                   │
│     }                                                    │
│   }                                                      │
│ }                                                        │
│                                                          │
│ [Try it out]                                             │
│                                                          │
│ ──────────────────────────────────────────────────────  │
│                                                          │
│ 📦 Products                                              │
│ GET /products                                            │
│                                                          │
│ Retrieves all available products.                       │
│                                                          │
│ Query Parameters:                                        │
│ • product_ids (optional): 18,365 - Filter by IDs        │
│ • minimal (optional): true - Return only ID and name    │
│ • category_id (optional): 7 - Filter by category        │
│                                                          │
│ Response Example:                                        │
│ {                                                        │
│   "status": "success",                                   │
│   "data": [                                              │
│     {                                                    │
│       "id": 365,                                         │
│       "product_code": "PUBG_UC",                        │
│       "product_name": "PUBG Mobile UC",                 │
│       "packages": [                                      │
│         {                                                │
│           "id": 1025,                                    │
│           "package_link_number": 60,                    │
│           "package_name": "UC 60",                      │
│           "price_usd": 1.094,                           │
│           "is_counter": false,                          │
│           "is_available": true,                         │
│           "qty_constraints": null,                      │
│           "required_fields": ["player_id"]              │
│         },                                               │
│         {                                                │
│           "id": 1026,                                    │
│           "package_link_number": 325,                   │
│           "package_name": "UC 325",                     │
│           "price_usd": 5.50,                            │
│           "is_counter": false,                          │
│           "is_available": true,                         │
│           "qty_constraints": null,                      │
│           "required_fields": ["player_id"]              │
│         }                                                │
│       ]                                                  │
│     }                                                    │
│   ]                                                      │
│ }                                                        │
│                                                          │
│ [Try it out]                                             │
│                                                          │
│ ──────────────────────────────────────────────────────  │
│                                                          │
│ 🛒 Create Order                                          │
│ POST /orders                                             │
│                                                          │
│ Creates a new order. IMPORTANT: Use order_uuid for      │
│ idempotency.                                             │
│                                                          │
│ Request Body:                                            │
│ {                                                        │
│   "order_uuid": "550e8400-e29b-41d4-a716-446655440000", │
│   "package_id": 1025,                                    │
│   "quantity": 1,                                         │
│   "customer_fields": {                                   │
│     "player_id": "123456789"                            │
│   }                                                      │
│ }                                                        │
│                                                          │
│ Response Example (Success):                              │
│ {                                                        │
│   "status": "success",                                   │
│   "data": {                                              │
│     "order_id": "ORD_9fffb0d849a45215",                 │
│     "order_uuid": "550e8400-...",                       │
│     "status": "completed",                              │
│     "price_usd": 1.094,                                 │
│     "customer_fields": {                                 │
│       "player_id": "123456789"                          │
│     },                                                   │
│     "provider_response": {                               │
│       "code": "ABC123XYZ"                               │
│     },                                                   │
│     "created_at": "2025-10-31T14:32:10Z"                │
│   }                                                      │
│ }                                                        │
│                                                          │
│ Note: If you send the same order_uuid twice, you will   │
│ get the original order data (no duplicate charge).      │
│                                                          │
│ [Try it out]                                             │
│                                                          │
│ ──────────────────────────────────────────────────────  │
│                                                          │
│ 🔍 Check Order Status                                    │
│ GET /orders/{order_id}                                   │
│ GET /orders?order_uuid={uuid}                            │
│                                                          │
│ Check the status of one or multiple orders.             │
│                                                          │
│ Query Parameters:                                        │
│ • order_ids (optional): ORD_123,ORD_456                 │
│ • order_uuids (optional): uuid1,uuid2                    │
│                                                          │
│ Response Example:                                        │
│ {                                                        │
│   "status": "success",                                   │
│   "data": [                                              │
│     {                                                    │
│       "order_id": "ORD_9fffb0d849a45215",               │
│       "order_uuid": "550e8400-...",                     │
│       "status": "completed",                            │
│       "package_name": "UC 60",                          │
│       "price_usd": 1.094,                               │
│       "customer_fields": {...},                         │
│       "provider_response": {...},                       │
│       "created_at": "2025-10-31T14:32:10Z",             │
│       "completed_at": "2025-10-31T14:32:45Z"            │
│     }                                                    │
│   ]                                                      │
│ }                                                        │
│                                                          │
│ [Try it out]                                             │
│                                                          │
│ ──────────────────────────────────────────────────────  │
│                                                          │
│ ⚠️ Error Codes                                           │
│                                                          │
│ Authentication Errors (4xx):                             │
│ • 401 - Missing or invalid API token                    │
│ • 403 - IP not allowed                                  │
│ • 429 - Rate limit exceeded (daily limit reached)       │
│                                                          │
│ Order Errors (4xx):                                      │
│ • 1001 - Insufficient balance                           │
│ • 1002 - Product not available                          │
│ • 1003 - Invalid quantity                               │
│ • 1004 - Missing required fields                        │
│ • 1005 - Duplicate order_uuid (returns original order)  │
│                                                          │
│ Server Errors (5xx):                                     │
│ • 500 - Internal server error                           │
│ • 503 - Service temporarily unavailable                 │
│                                                          │
│ ──────────────────────────────────────────────────────  │
│                                                          │
│ 📝 Code Examples                                         │
│                                                          │
│ [JavaScript] [Python] [PHP] [cURL]                      │
│                                                          │
│ // JavaScript (Node.js)                                 │
│ const axios = require('axios');                         │
│                                                          │
│ const api = axios.create({                              │
│   baseURL: 'https://api.wtn.com/tenant/alsham/v1/',    │
│   headers: {                                            │
│     'Authorization': 'Bearer wtn_YOUR_TOKEN_HERE'       │
│   }                                                      │
│ });                                                      │
│                                                          │
│ // Get products                                          │
│ const products = await api.get('/products');            │
│                                                          │
│ // Create order                                          │
│ const order = await api.post('/orders', {               │
│   order_uuid: crypto.randomUUID(),                      │
│   package_id: 1025,                                      │
│   quantity: 1,                                           │
│   customer_fields: {                                     │
│     player_id: '123456789'                              │
│   }                                                      │
│ });                                                      │
│                                                          │
│ ──────────────────────────────────────────────────────  │
│                                                          │
│ [Download Postman Collection]                            │
│ [Download OpenAPI Spec (Swagger)]                       │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

---

## 4. التطبيق التقني

### 4.1 هيكل API Routes

```
/api/tenant/{tenant_slug}/v1/
├─ /profile                  [GET]
├─ /products                 [GET]
│  └─ ?product_ids=18,365
│  └─ ?minimal=true
│  └─ ?category_id=7
├─ /orders                   [POST, GET]
│  └─ POST: إنشاء طلب جديد
│  └─ GET ?order_ids=...
│  └─ GET ?order_uuids=...
└─ /orders/{order_id}        [GET]
```

### 4.2 Middleware للأمان

```javascript
// middleware/apiAuth.js
async function apiAuth(req, res, next) {
  try {
    // 1. استخراج الـ Token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        status: 'error',
        error_code: '401',
        message: 'API Token is required'
      });
    }
    
    const token = authHeader.substring(7); // Remove 'Bearer '
    
    // 2. التحقق من الـ Token
    const apiToken = await db.query(`
      SELECT at.*, t.slug as tenant_slug
      FROM api_tokens at
      JOIN tenants t ON at.tenant_id = t.id
      WHERE at.token = ? AND at.is_active = true
    `, [hashToken(token)]);
    
    if (!apiToken) {
      return res.status(401).json({
        status: 'error',
        error_code: '401',
        message: 'Invalid API Token'
      });
    }
    
    // 3. التحقق من IP
    if (apiToken.allowed_ips) {
      const allowedIps = apiToken.allowed_ips.split(',');
      const clientIp = req.ip;
      
      if (!allowedIps.includes(clientIp)) {
        await logApiRequest(apiToken.id, req, 'ip_blocked', 403);
        
        return res.status(403).json({
          status: 'error',
          error_code: '403',
          message: 'IP not allowed'
        });
      }
    }
    
    // 4. التحقق من الحد اليومي
    if (apiToken.daily_limit) {
      // إعادة تعيين إذا يوم جديد
      if (apiToken.last_reset_date !== today()) {
        await db.query(`
          UPDATE api_tokens 
          SET daily_usage = 0, last_reset_date = ?
          WHERE id = ?
        `, [today(), apiToken.id]);
        apiToken.daily_usage = 0;
      }
      
      if (apiToken.daily_usage >= apiToken.daily_limit) {
        await logApiRequest(apiToken.id, req, 'rate_limit', 429);
        
        return res.status(429).json({
          status: 'error',
          error_code: '429',
          message: 'Daily rate limit exceeded',
          limit: apiToken.daily_limit,
          reset_at: tomorrow()
        });
      }
    }
    
    // 5. تحديث الإحصائيات
    await db.query(`
      UPDATE api_tokens 
      SET 
        daily_usage = daily_usage + 1,
        total_requests = total_requests + 1,
        last_used_at = NOW(),
        last_ip = ?
      WHERE id = ?
    `, [req.ip, apiToken.id]);
    
    // 6. إضافة للـ Request
    req.apiToken = apiToken;
    req.tenantId = apiToken.tenant_id;
    
    next();
    
  } catch (error) {
    console.error('API Auth Error:', error);
    return res.status(500).json({
      status: 'error',
      error_code: '500',
      message: 'Internal server error'
    });
  }
}
```

### 4.3 إنشاء طلب مع Idempotency

```javascript
// routes/api/orders.js
router.post('/orders', apiAuth, async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { order_uuid, package_id, quantity, customer_fields } = req.body;
    
    // 1. التحقق من order_uuid
    if (!order_uuid || !isValidUUID(order_uuid)) {
      return res.status(400).json({
        status: 'error',
        error_code: '1006',
        message: 'Valid order_uuid (UUIDv4) is required'
      });
    }
    
    // 2. Idempotency: فحص إذا الطلب موجود
    const existingOrder = await db.query(`
      SELECT * FROM orders 
      WHERE order_uuid = ? AND tenant_id = ?
    `, [order_uuid, req.tenantId]);
    
    if (existingOrder) {
      // إرجاع الطلب الأصلي (لا توجد رسوم مكررة)
      await logApiRequest(req.apiToken.id, req, 'duplicate_uuid', 200, {
        order_id: existingOrder.order_number
      });
      
      return res.status(200).json({
        status: 'success',
        data: formatOrderResponse(existingOrder),
        note: 'Existing order returned (idempotent request)'
      });
    }
    
    // 3. التحقق من الباقة
    const package = await db.query(`
      SELECT pkg.*, pg.price_usd
      FROM packages pkg
      JOIN package_prices pg ON pkg.id = pg.package_id
      LEFT JOIN price_groups pgroup ON pg.price_group_id = pgroup.id
      WHERE pkg.id = ? 
        AND pkg.tenant_id = ?
        AND pkg.is_active = true
        AND (pgroup.is_default = true OR pg.price_group_id IS NULL)
    `, [package_id, req.tenantId]);
    
    if (!package) {
      return res.status(404).json({
        status: 'error',
        error_code: '1007',
        message: 'Package not found or not available'
      });
    }
    
    // 4. التحقق من الكمية
    if (!validateQuantity(package, quantity)) {
      return res.status(400).json({
        status: 'error',
        error_code: '1003',
        message: 'Invalid quantity for this package'
      });
    }
    
    // 5. حساب السعر
    const totalPrice = package.price_usd * quantity;
    
    // 6. التحقق من الرصيد (هنا نستخدم الوكيل المرتبط بـ API Token)
    // في هذه الحالة، قد يكون لديك agent_id مخزن في api_tokens
    // أو نظام فرعي للوكلاء المرتبطين بـ API
    
    const apiAgent = await getApiAgent(req.apiToken.id);
    
    if (apiAgent.balance_usd < totalPrice) {
      return res.status(400).json({
        status: 'error',
        error_code: '1001',
        message: 'Insufficient balance',
        required: totalPrice,
        available: apiAgent.balance_usd
      });
    }
    
    // 7. إنشاء الطلب
    const order = await createOrder({
      tenant_id: req.tenantId,
      agent_id: apiAgent.id,
      package_id: package_id,
      quantity: quantity,
      price_usd: totalPrice,
      customer_fields: customer_fields,
      source: 'api',
      api_token_id: req.apiToken.id,
      order_uuid: order_uuid
    });
    
    // 8. معالجة الطلب (ربط مع الموردين)
    const processResult = await processOrder(order.id);
    
    // 9. تحديث إحصائيات API
    await db.query(`
      UPDATE api_tokens 
      SET total_orders = total_orders + 1 
      WHERE id = ?
    `, [req.apiToken.id]);
    
    // 10. تسجيل في Logs
    const responseTime = Date.now() - startTime;
    await logApiRequest(
      req.apiToken.id, 
      req, 
      'success', 
      200, 
      { order_id: order.order_number },
      responseTime
    );
    
    // 11. الرد
    return res.status(200).json({
      status: 'success',
      data: {
        order_id: order.order_number,
        order_uuid: order.order_uuid,
        status: order.status,
        price_usd: totalPrice,
        customer_fields: customer_fields,
        provider_response: processResult.provider_response,
        created_at: order.created_at
      }
    });
    
  } catch (error) {
    console.error('Create Order Error:', error);
    
    const responseTime = Date.now() - startTime;
    await logApiRequest(
      req.apiToken.id, 
      req, 
      'error', 
      500, 
      { error: error.message },
      responseTime
    );
    
    return res.status(500).json({
      status: 'error',
      error_code: '500',
      message: 'Internal server error'
    });
  }
});
```

---

## 5. Swagger/OpenAPI Integration

### 5.1 تثبيت Swagger

```bash
npm install swagger-ui-express swagger-jsdoc
```

### 5.2 إعداد Swagger

```javascript
// swagger.js
const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'WTN Tenant API',
      version: '1.0.0',
      description: 'API للتكامل مع أنظمة الشراء الخارجية',
      contact: {
        name: 'API Support',
        email: 'api@wtn.com'
      }
    },
    servers: [
      {
        url: 'https://api.wtn.com/tenant/{tenant_slug}/v1',
        description: 'Production Server',
        variables: {
          tenant_slug: {
            default: 'demo',
            description: 'Tenant slug (e.g., alsham, gamestore)'
          }
        }
      }
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'أدخل API Token الخاص بك'
        }
      },
      schemas: {
        Product: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 365 },
            product_code: { type: 'string', example: 'PUBG_UC' },
            product_name: { type: 'string', example: 'PUBG Mobile UC' },
            packages: {
              type: 'array',
              items: { $ref: '#/components/schemas/Package' }
            }
          }
        },
        Package: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1025 },
            package_link_number: { type: 'integer', example: 60 },
            package_name: { type: 'string', example: 'UC 60' },
            price_usd: { type: 'number', format: 'float', example: 1.094 },
            is_counter: { type: 'boolean', example: false },
            is_available: { type: 'boolean', example: true },
            qty_constraints: {
              type: 'object',
              nullable: true,
              properties: {
                min: { type: 'integer', example: 1 },
                max: { type: 'integer', example: 15000 }
              }
            },
            required_fields: {
              type: 'array',
              items: { type: 'string' },
              example: ['player_id']
            }
          }
        },
        Order: {
          type: 'object',
          properties: {
            order_id: { type: 'string', example: 'ORD_9fffb0d849a45215' },
            order_uuid: { type: 'string', format: 'uuid' },
            status: { 
              type: 'string', 
              enum: ['pending', 'processing', 'completed', 'failed'],
              example: 'completed'
            },
            price_usd: { type: 'number', format: 'float', example: 1.094 },
            customer_fields: { type: 'object' },
            provider_response: { type: 'object' },
            created_at: { type: 'string', format: 'date-time' },
            completed_at: { type: 'string', format: 'date-time', nullable: true }
          }
        },
        Error: {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'error' },
            error_code: { type: 'string', example: '1001' },
            message: { type: 'string', example: 'Insufficient balance' }
          }
        }
      }
    },
    security: [
      { BearerAuth: [] }
    ]
  },
  apis: ['./routes/api/*.js'] // ملفات الـ Routes مع JSDoc
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);

module.exports = { swaggerUi, swaggerDocs };
```

### 5.3 JSDoc في Routes

```javascript
// routes/api/products.js

/**
 * @swagger
 * /products:
 *   get:
 *     summary: Get all available products
 *     description: Retrieves all products and packages available for purchase
 *     tags:
 *       - Products
 *     parameters:
 *       - in: query
 *         name: product_ids
 *         schema:
 *           type: string
 *         description: Comma-separated product IDs (e.g., 18,365)
 *       - in: query
 *         name: minimal
 *         schema:
 *           type: boolean
 *         description: Return only ID and name
 *       - in: query
 *         name: category_id
 *         schema:
 *           type: integer
 *         description: Filter by category
 *     responses:
 *       200:
 *         description: Success
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Product'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/products', apiAuth, async (req, res) => {
  // ... implementation
});
```

### 5.4 تفعيل Swagger UI

```javascript
// server.js
const express = require('express');
const { swaggerUi, swaggerDocs } = require('./swagger');

const app = express();

// Swagger UI لكل مستأجر
app.use('/api/tenant/:tenant_slug/docs', (req, res, next) => {
  // تخصيص Swagger لكل مستأجر
  const customSwagger = {
    ...swaggerDocs,
    servers: [{
      url: `https://api.wtn.com/tenant/${req.params.tenant_slug}/v1`
    }]
  };
  
  req.swaggerDoc = customSwagger;
  next();
}, swaggerUi.serve, swaggerUi.setup());

// الوصول:
// https://api.wtn.com/tenant/alsham/docs
```

---

## 6. أمثلة الاستخدام للعميل

### 6.1 JavaScript/Node.js

```javascript
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

class WTNClient {
  constructor(tenantSlug, apiToken) {
    this.api = axios.create({
      baseURL: `https://api.wtn.com/tenant/${tenantSlug}/v1`,
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json'
      }
    });
  }
  
  async getProfile() {
    const res = await this.api.get('/profile');
    return res.data;
  }
  
  async getProducts(filters = {}) {
    const res = await this.api.get('/products', { params: filters });
    return res.data;
  }
  
  async createOrder(packageId, quantity, customerFields) {
    const res = await this.api.post('/orders', {
      order_uuid: uuidv4(), // مهم جداً!
      package_id: packageId,
      quantity: quantity,
      customer_fields: customerFields
    });
    return res.data;
  }
  
  async checkOrder(orderId) {
    const res = await this.api.get(`/orders/${orderId}`);
    return res.data;
  }
}

// الاستخدام
const client = new WTNClient('alsham', 'wtn_7k2mP9xL4vQ8nR3sT6yU...');

// جلب المنتجات
const products = await client.getProducts();

// إنشاء طلب
const order = await client.createOrder(1025, 1, {
  player_id: '123456789'
});

console.log('Order created:', order.data.order_id);

// فحص الحالة
const status = await client.checkOrder(order.data.order_id);
console.log('Order status:', status.data.status);
```

### 6.2 Python

```python
import requests
import uuid

class WTNClient:
    def __init__(self, tenant_slug, api_token):
        self.base_url = f"https://api.wtn.com/tenant/{tenant_slug}/v1"
        self.headers = {
            "Authorization": f"Bearer {api_token}",
            "Content-Type": "application/json"
        }
    
    def get_profile(self):
        res = requests.get(f"{self.base_url}/profile", headers=self.headers)
        return res.json()
    
    def get_products(self, filters=None):
        res = requests.get(f"{self.base_url}/products", 
                          headers=self.headers, 
                          params=filters)
        return res.json()
    
    def create_order(self, package_id, quantity, customer_fields):
        data = {
            "order_uuid": str(uuid.uuid4()),
            "package_id": package_id,
            "quantity": quantity,
            "customer_fields": customer_fields
        }
        res = requests.post(f"{self.base_url}/orders", 
                           headers=self.headers, 
                           json=data)
        return res.json()
    
    def check_order(self, order_id):
        res = requests.get(f"{self.base_url}/orders/{order_id}", 
                          headers=self.headers)
        return res.json()

# Usage
client = WTNClient("alsham", "wtn_7k2mP9xL4vQ8nR3sT6yU...")

# Get products
products = client.get_products()

# Create order
order = client.create_order(1025, 1, {"player_id": "123456789"})
print(f"Order created: {order['data']['order_id']}")

# Check status
status = client.check_order(order['data']['order_id'])
print(f"Order status: {status['data']['status']}")
```

### 6.3 PHP

```php
<?php

class WTNClient {
    private $baseUrl;
    private $apiToken;
    
    public function __construct($tenantSlug, $apiToken) {
        $this->baseUrl = "https://api.wtn.com/tenant/{$tenantSlug}/v1";
        $this->apiToken = $apiToken;
    }
    
    private function request($method, $endpoint, $data = null) {
        $ch = curl_init($this->baseUrl . $endpoint);
        
        $headers = [
            "Authorization: Bearer {$this->apiToken}",
            "Content-Type: application/json"
        ];
        
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        
        if ($method === 'POST') {
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        }
        
        $response = curl_exec($ch);
        curl_close($ch);
        
        return json_decode($response, true);
    }
    
    public function getProfile() {
        return $this->request('GET', '/profile');
    }
    
    public function getProducts($filters = []) {
        $query = http_build_query($filters);
        return $this->request('GET', "/products?{$query}");
    }
    
    public function createOrder($packageId, $quantity, $customerFields) {
        $data = [
            'order_uuid' => $this->generateUUID(),
            'package_id' => $packageId,
            'quantity' => $quantity,
            'customer_fields' => $customerFields
        ];
        return $this->request('POST', '/orders', $data);
    }
    
    private function generateUUID() {
        return sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
            mt_rand(0, 0xffff), mt_rand(0, 0xffff),
            mt_rand(0, 0xffff),
            mt_rand(0, 0x0fff) | 0x4000,
            mt_rand(0, 0x3fff) | 0x8000,
            mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
        );
    }
}

// Usage
$client = new WTNClient('alsham', 'wtn_7k2mP9xL4vQ8nR3sT6yU...');

// Get products
$products = $client->getProducts();

// Create order
$order = $client->createOrder(1025, 1, ['player_id' => '123456789']);
echo "Order created: " . $order['data']['order_id'];
?>
```

---

## 7. إحصائيات ومراقبة API

### 7.1 لوحة API Analytics

```sql
-- أكثر Endpoints استخداماً
SELECT 
  endpoint,
  COUNT(*) as request_count,
  AVG(response_time_ms) as avg_response_time,
  SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success_count,
  SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as error_count
FROM api_logs
WHERE tenant_id = ?
  AND created_at >= NOW() - INTERVAL 30 DAY
GROUP BY endpoint
ORDER BY request_count DESC;

-- توزيع الأخطاء
SELECT 
  error_code,
  COUNT(*) as occurrence,
  (COUNT(*) * 100.0 / (SELECT COUNT(*) FROM api_logs WHERE tenant_id = ?)) as percentage
FROM api_logs
WHERE tenant_id = ?
  AND status = 'error'
  AND created_at >= NOW() - INTERVAL 30 DAY
GROUP BY error_code
ORDER BY occurrence DESC;

-- أبطأ Requests
SELECT 
  endpoint,
  method,
  response_time_ms,
  created_at,
  ip_address
FROM api_logs
WHERE tenant_id = ?
  AND created_at >= NOW() - INTERVAL 7 DAY
ORDER BY response_time_ms DESC
LIMIT 20;
```

---

## 8. الخلاصة

### المزايا:
✅ **للمستأجر:**
- دخل إضافي من العملاء الخارجيين
- توسع في السوق
- API آمن ومراقب

✅ **للعميل الخارجي:**
- تكامل سهل
- توثيق واضح (Swagger + Custom docs)
- Idempotency (لا توجد رسوم مكررة)

✅ **للنظام:**
- أمان متعدد الطبقات (Token, IP, Rate Limit)
- Logs شاملة
- مراقبة الأداء

---

**جاهز للتطبيق!** 🚀
