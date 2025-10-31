# تلخيص كامل لـ API Calls مع المزودين الخارجيين

## 1. ZNET

### معلومات عامة
- **النوع**: مزود تركي لبيع البطاقات والمنتجات الرقمية
- **Base URL**: متغير (يُعرّف في Integration.base_url)
- **مثال**: `https://panel.znet.com.tr` أو أي URL يُعرّف في Integration
- **كود المزود**: `znet`
- **ملف الكود**: `djangoo/apps/providers/adapters/znet.py`

### طريقة المصادقة (Authentication)
- **النوع**: Query Parameters (ليست Headers)
- **Parameters المطلوبة**:
  - `kod`: رقم الجوال (مثال: `54421999998`)
  - `sifre`: كلمة السر
- **Headers**: `Accept: application/json` (فقط)
- **ملاحظة**: ZNET لا يستخدم API tokens في headers، بل يستخدم query parameters للـ authentication

---

### 1.1. Get Balance - جلب المحفظة

#### التفاصيل
- **HTTP Method**: `GET`
- **Endpoint**: `{base_url}/servis/bakiye_kontrol.php`
  - يمكن تخصيص الـ endpoint عبر متغير البيئة `DJ_ZNET_BALANCE_PATH`
- **Headers**:
  ```
  Accept: application/json
  ```
- **Query Parameters**:
  ```
  kod={رقم_الجوال}
  sifre={كلمة_السر}
  ```

#### مثال Request
```bash
GET https://panel.znet.com.tr/servis/bakiye_kontrol.php?kod=54421999998&sifre=*******
Headers:
  Accept: application/json
```

#### مثال Response

**صيغة 1 - JSON:**
```json
{
  "balance": 123.45,
  "debt": 10.00,
  "currency": "TRY"
}
```

**صيغة 2 - Pipe-separated (النمط التركي الشائع):**
```
OK|123.45|10.00
```
- الجزء الأول: `OK` = نجاح
- الجزء الثاني: الرصيد (balance)
- الجزء الثالث (اختياري): الدين (debt)

**صيغة 3 - JSON مع nested data:**
```json
{
  "data": {
    "balance": 123.45,
    "debt": 10.00
  }
}
```

#### Response Structure
```python
{
  'balance': float,      # الرصيد
  'debt': float | None,  # الدين (اختياري)
  'currency': 'TRY'       # العملة (دائماً TRY)
}
```

#### أكواد الأخطاء
- `BALANCE_UNSUPPORTED`: لا يوجد endpoint للرصيد
- `FETCH_FAILED`: فشل في جلب الرصيد
- `HTTP {status_code}`: خطأ HTTP من الخادم

#### كود Python
```python
# djangoo/apps/providers/adapters/znet.py:78
def get_balance(self, creds: ZnetCredentials):
    path = 'servis/bakiye_kontrol.php'
    url = f"{self._base(creds)}/{path}"
    params = {'kod': creds.kod, 'sifre': creds.sifre}
    resp = requests.get(url, headers={'Accept': 'application/json'}, params=params)
    # ... parse response ...
```

---

### 1.2. List Products / Get Catalog - جلب المنتجات والأسعار

#### التفاصيل
- **HTTP Method**: `GET`
- **Endpoint**: `{base_url}/servis/pin_listesi.php`
  - يمكن تخصيصه عبر `DJ_ZNET_CATALOG_PATH`
- **Headers**:
  ```
  Accept: application/json
  ```
- **Query Parameters**:
  ```
  kod={رقم_الجوال}
  sifre={كلمة_السر}
  ```

#### مثال Request
```bash
GET https://panel.znet.com.tr/servis/pin_listesi.php?kod=54421999998&sifre=*******
Headers:
  Accept: application/json
```

#### مثال Response
```json
{
  "success": true,
  "result": [
    {
      "id": "1001",
      "adi": "نقاط Free Fire 100",
      "oyun_adi": "Free Fire",
      "oyun_bilgi_id": "2001",
      "kupur": "1001",
      "fiyat": 10.50,
      "para_birimi": "TRY"
    },
    {
      "id": "1002",
      "adi": "نقاط PUBG Mobile 500",
      "oyun_adi": "PUBG Mobile",
      "oyun_bilgi_id": "2002",
      "kupur": "1002",
      "fiyat": 25.00,
      "para_birimi": "TRY"
    }
  ]
}
```

#### Response Structure (Normalized)
```python
[
  {
    'externalId': str,        # ID المنتج (من حقل id أو kupur أو oyun_bilgi_id)
    'name': str,              # اسم المنتج (من adi أو oyun_adi)
    'basePrice': float,       # السعر الأساسي
    'category': str | None,   # الفئة (من oyun_adi)
    'available': True,        # متاح دائماً
    'inputParams': ['oyuncu_bilgi', 'musteri_tel'],
    'quantity': {'type': 'none'},
    'kind': 'package',
    'meta': {
      'oyun_bilgi_id': str,  # معرف اللعبة
      'kupur': str,           # كود الكوبون
      'currency': 'TRY',
      'raw': dict             # البيانات الأصلية
    },
    'currencyCode': 'TRY'
  },
  ...
]
```

#### كود Python
```python
# djangoo/apps/providers/adapters/znet.py:177
def list_products(self, creds: ZnetCredentials):
    path = 'servis/pin_listesi.php'
    url = f"{self._base(creds)}/{path}"
    params = {'kod': creds.kod, 'sifre': creds.sifre}
    resp = requests.get(url, headers={'Accept': 'application/json'}, params=params)
    data = resp.json()
    # ... normalize products ...
```

---

### 1.3. Create Order - إرسال طلب

#### التفاصيل
- **HTTP Method**: `GET` (حسب التوثيق التركي)
- **Endpoint**: `{base_url}/servis/pin_ekle.php`
  - يمكن تخصيصه عبر `DJ_ZNET_ORDERS_PATH`
- **Headers**:
  ```
  Accept: application/json
  ```
- **Query Parameters**:
  ```
  kod={رقم_الجوال}
  sifre={كلمة_السر}
  oyun={oyun_bilgi_id}           # معرف اللعبة (من metadata)
  kupur={kupur}                  # كود الكوبون (اختياري)
  referans={referans}            # رقم مرجعي رقمي (يُولّد تلقائياً: timestamp + random)
  musteri_tel={userIdentifier}   # رقم الهاتف (من payload.userIdentifier)
  oyuncu_bilgi={extraField}      # معلومات إضافية (من payload.extraField)
  ```

#### مثال Request
```bash
GET https://panel.znet.com.tr/servis/pin_ekle.php?kod=54421999998&sifre=*******&oyun=2001&referans=1699123456789&musteri_tel=905551234567&oyuncu_bilgi=player123
Headers:
  Accept: application/json
```

#### مثال Response

**نجاح:**
```
OK|10.50|112.95
```
- الجزء الأول: `OK` = نجاح
- الجزء الثاني: التكلفة (cost)
- الجزء الثالث: الرصيد المتبقي (balance)

**فشل:**
```
3|رصيد غير كافٍ
```
- الرقم الأول: كود الخطأ
- الجزء الثاني: رسالة الخطأ

#### Response Structure (Normalized)
```python
{
  'externalOrderId': str,     # UUID الأصلي من orderId (للتعقب)
  'providerReferans': str,     # الرقم المرجعي الرقمي الذي أرسلناه
  'status': 'sent' | 'failed',
  'note': str,                 # الرسالة الكاملة (مثل: "OK|cost=10.50|balance=112.95")
  'balance': float | None,     # الرصيد المتبقي
  'cost': float | None,        # التكلفة
  'costCurrency': 'TRY'        # العملة (دائماً TRY)
}
```

#### ملاحظات مهمة
1. **referans**: يجب أن يكون رقمياً (لا UUID). يُولّد تلقائياً كـ `timestamp * 1000 + random(100-999)`
2. **oyun**: يأتي من `payload.params.oyun` أو `provider_package_id`
3. **musteri_tel**: يأتي من `payload.userIdentifier` (الحقل الأول)
4. **oyuncu_bilgi**: يأتي من `payload.extraField` (الحقل الثاني)

#### كود Python
```python
# djangoo/apps/providers/adapters/znet.py:311
def place_order(self, creds: ZnetCredentials, provider_package_id: str, payload: dict):
    path = 'servis/pin_ekle.php'
    url = f"{self._base(creds)}/{path}"
    params = {
        'kod': creds.kod,
        'sifre': creds.sifre,
        'oyun': payload['params'].get('oyun'),
        'referans': generated_numeric_referans,
        'musteri_tel': payload.get('userIdentifier'),
        'oyuncu_bilgi': payload.get('extraField')
    }
    resp = requests.get(url, headers={'Accept': 'application/json'}, params=params)
    # ... parse response ...
```

---

### 1.4. Fetch Order Status - جلب حالة الطلب

#### التفاصيل
- **HTTP Method**: `GET`
- **Endpoint**: `{base_url}/servis/pin_kontrol.php`
  - يمكن تخصيصه عبر `DJ_ZNET_STATUS_PATH`
- **Headers**:
  ```
  Accept: application/json
  ```
- **Query Parameters**:
  ```
  kod={رقم_الجوال}
  sifre={كلمة_السر}
  tahsilat_api_islem_id={referans}  # الرقم المرجعي الذي أرسلناه
  ```

#### مثال Request
```bash
GET https://panel.znet.com.tr/servis/pin_kontrol.php?kod=54421999998&sifre=*******&tahsilat_api_islem_id=1699123456789
Headers:
  Accept: application/json
```

#### مثال Response
```
OK|2|PIN123456789|تم الإنجاز بنجاح
```
- الجزء الأول: `OK` = نجاح الاستعلام
- الجزء الثاني: الحالة (`1` = قيد المعالجة، `2` = مكتمل، `3` = فشل)
- الجزء الثالث: PIN Code (إن وُجد)
- الجزء الرابع: رسالة

#### Response Structure (Normalized)
```python
{
  'status': 'completed' | 'processing' | 'failed' | 'unknown',
  'pinCode': str | None,      # PIN Code إن وُجد
  'message': str | None,       # الرسالة
  'raw': str                   # النص الأصلي
}
```

#### خريطة الحالات
- `1` → `processing` (قيد المعالجة)
- `2` → `completed` (مكتمل)
- `3` → `failed` (فشل)

#### كود Python
```python
# djangoo/apps/providers/adapters/znet.py:411
def fetch_status(self, creds: ZnetCredentials, referans: str):
    path = 'servis/pin_kontrol.php'
    url = f"{self._base(creds)}/{path}"
    params = {
        'kod': creds.kod,
        'sifre': creds.sifre,
        'tahsilat_api_islem_id': referans
    }
    resp = requests.get(url, headers={'Accept': 'application/json'}, params=params)
    # ... parse response ...
```

---

## 2. Barakat / Apstore

### معلومات عامة
- **النوع**: مزود API حديث لبيع المنتجات الرقمية
- **Base URL**: `https://api.x-stor.net` (افتراضي) أو يُعرّف في Integration.base_url
- **كود المزود**: `barakat` أو `apstore` (نفس الـ adapter)
- **ملف الكود**: `djangoo/apps/providers/adapters/barakat.py`

### طريقة المصادقة (Authentication)
- **النوع**: Header
- **Header المطلوب**:
  ```
  api-token: {api_token}
  ```
- **ملاحظة**: Barakat/Apstore يستخدم API token في header وليس query parameters

---

### 2.1. Get Balance - جلب المحفظة

#### التفاصيل
- **HTTP Method**: `GET`
- **Endpoint**: `{base_url}/client/api/profile`
- **Headers**:
  ```
  api-token: {api_token}
  ```
- **Query Parameters**: لا يوجد

#### مثال Request
```bash
GET https://api.x-stor.net/client/api/profile
Headers:
  api-token: abc123xyz456
```

#### مثال Response
```json
{
  "balance": 150.75,
  "currency": "TRY",
  "debt": 5.00
}
```

#### Response Structure
```python
{
  'balance': float,           # الرصيد
  'currency': str,            # العملة (عادة TRY)
  'debt': float | None        # الدين (اختياري)
}
```

#### أكواد الأخطاء
- `FETCH_FAILED`: فشل في جلب الرصيد
- `Invalid balance response`: استجابة غير صحيحة
- `Balance missing in response`: لا يوجد balance في الاستجابة

#### كود Python
```python
# djangoo/apps/providers/adapters/barakat.py:119
def get_balance(self, creds: BarakatCredentials):
    url = f"{self._resolve_base_url(creds)}/client/api/profile"
    headers = {'api-token': creds.api_token}
    resp = requests.get(url, headers=headers, timeout=(5, 30))
    data = resp.json()
    # ... extract balance ...
```

---

### 2.2. List Products / Get Catalog - جلب المنتجات والأسعار

#### التفاصيل
- **HTTP Method**: `GET`
- **Endpoint**: `{base_url}/client/api/products`
- **Headers**:
  ```
  api-token: {api_token}
  ```
- **Query Parameters**: لا يوجد

#### مثال Request
```bash
GET https://api.x-stor.net/client/api/products
Headers:
  api-token: abc123xyz456
```

#### مثال Response
```json
[
  {
    "id": "1001",
    "name": "Free Fire 100 Diamonds",
    "price": 10.50,
    "currency": "TRY",
    "available": true,
    "category_name": "Free Fire",
    "params": ["phone", "player_id"],
    "qty_values": {
      "min": 1,
      "max": 10
    }
  },
  {
    "id": "1002",
    "name": "PUBG Mobile 500 UC",
    "price": 25.00,
    "currency": "TRY",
    "available": true,
    "category_name": "PUBG Mobile",
    "params": ["phone"],
    "qty_values": [1, 5, 10]
  }
]
```

#### Response Structure (Normalized)
```python
[
  {
    'externalId': str,        # ID المنتج
    'name': str,               # اسم المنتج
    'basePrice': float,        # السعر الأساسي
    'category': str | None,    # الفئة
    'available': bool,         # متاح؟
    'inputParams': [str],      # الحقول المطلوبة
    'quantity': {
      'type': 'range' | 'set' | 'none',
      'min': float | None,     # للـ range
      'max': float | None,     # للـ range
      'values': [float]         # للـ set
    },
    'kind': 'package',
    'currencyCode': str,
    'meta': {
      'raw': dict,
      'currency': str
    }
  },
  ...
]
```

#### كود Python
```python
# djangoo/apps/providers/adapters/barakat.py:180
def list_products(self, creds: BarakatCredentials):
    url = f"{self._resolve_base_url(creds)}/client/api/products"
    headers = {'api-token': creds.api_token}
    resp = requests.get(url, headers=headers, timeout=(5, 30))
    data = resp.json()  # array of products
    # ... normalize products ...
```

---

### 2.3. Create Order - إرسال طلب

#### التفاصيل
- **HTTP Method**: `GET`
- **Endpoint**: `{base_url}/client/api/newOrder/{package_id}/params`
  - `{package_id}`: معرف المنتج (يُستخدم URL encoding)
- **Headers**:
  ```
  api-token: {api_token}
  ```
- **Query Parameters**:
  ```
  qty={quantity}                    # الكمية (افتراضي: 1)
  phone={userIdentifier}            # رقم الهاتف (من payload.userIdentifier)
  extra={extraField}                # حقل إضافي (من payload.extraField)
  order_uuid={orderId|referans}      # UUID الطلب (للتعقب)
  ```

#### مثال Request
```bash
GET https://api.x-stor.net/client/api/newOrder/1001/params?qty=1&phone=905551234567&extra=player123&order_uuid=550e8400-e29b-41d4-a716-446655440000
Headers:
  api-token: abc123xyz456
```

#### مثال Response

**نجاح:**
```json
{
  "status": "OK",
  "data": {
    "order_id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "pending",
    "price": 10.50,
    "note": "Order placed successfully"
  }
}
```

**فشل:**
```json
{
  "status": "ERROR",
  "message": "Insufficient balance"
}
```

#### Response Structure (Normalized)
```python
{
  'success': bool,
  'externalOrderId': str,        # order_id من الاستجابة
  'providerReferans': str,       # نفس externalOrderId
  'status': 'sent' | 'failed',
  'providerStatus': str,          # الحالة الأصلية من المزود
  'mappedStatus': 'success' | 'failed' | 'pending',
  'price': float | None,         # السعر
  'costCurrency': 'TRY',          # العملة
  'note': str | None,             # الرسالة
  'pin': str | None,              # PIN Code إن وُجد
  'raw': dict                     # الاستجابة الأصلية
}
```

#### خريطة الحالات
- `success`, `ok`, `done`, `complete`, `completed`, `accept` → `success`
- `reject`, `rejected`, `failed`, `fail`, `error`, `cancelled` → `failed`
- `wait`, `pending`, `processing`, `inprogress`, `queued` → `pending`

#### كود Python
```python
# djangoo/apps/providers/adapters/barakat.py:264
def place_order(self, creds: BarakatCredentials, provider_package_id: str, payload: Dict[str, Any]):
    base = self._resolve_base_url(creds)
    headers = {'api-token': creds.api_token}
    params = {
        'qty': str(payload.get('quantity', 1)),
        'phone': str(payload.get('userIdentifier', '')),
        'extra': str(payload.get('extraField', '')),
        'order_uuid': str(payload.get('orderId') or payload.get('referans', ''))
    }
    url = f"{base}/client/api/newOrder/{quote(provider_package_id)}/params"
    resp = requests.get(url, headers=headers, params=params, timeout=(5, 30))
    # ... parse response ...
```

---

### 2.4. Fetch Order Status - جلب حالة الطلب

#### التفاصيل
- **HTTP Method**: `GET`
- **Endpoint**: `{base_url}/client/api/check`
- **Headers**:
  ```
  api-token: {api_token}
  ```
- **Query Parameters**:
  ```
  orders=[{order_id_1},{order_id_2},...]  # Array من order IDs (مشفر كـ string)
  uuid=1                                    # إذا كانت order IDs هي UUIDs
  ```

#### مثال Request
```bash
GET https://api.x-stor.net/client/api/check?orders=[550e8400-e29b-41d4-a716-446655440000]&uuid=1
Headers:
  api-token: abc123xyz456
```

#### مثال Response
```json
{
  "data": [
    {
      "order_id": "550e8400-e29b-41d4-a716-446655440000",
      "status": "completed",
      "pin": "PIN123456789",
      "note": "Order completed successfully"
    }
  ]
}
```

#### Response Structure (Normalized)
```python
{
  'status': 'completed' | 'processing' | 'failed' | 'unknown',
  'pinCode': str | None,        # PIN Code
  'message': str | None,         # الرسالة
  'raw': dict                    # البيانات الأصلية
}
```

#### خريطة الحالات (mapping)
- `success` → `completed`
- `failed` → `failed`
- `pending` → `processing`
- غير ذلك → `unknown`

#### ملاحظات
- يمكن جلب حالة عدة طلبات دفعة واحدة عبر تمرير array في `orders`
- إذا كانت order IDs هي UUIDs (36 حرف مع 4 شرطات)، يُضاف `uuid=1`

#### كود Python
```python
# djangoo/apps/providers/adapters/barakat.py:410
def fetch_status(self, creds: BarakatCredentials, external_order_id: str):
    entries = self.check_orders(creds, [external_order_id])
    # ... map status ...
```

---

## 3. Internal Provider

### معلومات عامة
- **النوع**: مزود داخلي للاتصال بـ tenants أخرى داخل النظام
- **Base URL**: URL الـ tenant الآخر (مثال: `http://shamtech.localhost:3000`)
- **كود المزود**: `internal`
- **ملف الكود**: `djangoo/apps/providers/adapters/internal.py`

### طريقة المصادقة (Authentication)
- **النوع**: Header
- **Headers المطلوبة**:
  ```
  api-token: {api_token}
  X-Tenant-Host: {tenant_host}
  ```
- **ملاحظة**: `api-token` يأتي من `/account/api/` في الـ tenant الآخر
- **ملاحظة**: `X-Tenant-Host` هو اسم الدومين (مثال: `shamtech.localhost`)

---

### 3.1. Get Balance - جلب المحفظة

#### التفاصيل
- **HTTP Method**: `GET`
- **Endpoint**: `http://127.0.0.1:8000/api-dj/users/profile`
  - **ملاحظة**: دائماً على `127.0.0.1:8000` (Django backend محلي)
- **Headers**:
  ```
  api-token: {api_token}
  X-Tenant-Host: {tenant_host}
  ```
- **Query Parameters**: لا يوجد

#### مثال Request
```bash
GET http://127.0.0.1:8000/api-dj/users/profile
Headers:
  api-token: abc123xyz456
  X-Tenant-Host: shamtech.localhost
```

#### مثال Response
```json
{
  "balance": 500.00,
  "currency": "USD",
  "id": "...",
  "username": "...",
  ...
}
```

#### Response Structure
```python
{
  'balance': float,           # الرصيد
  'currency': str             # العملة (عادة USD)
}
```

#### أكواد الأخطاء
- `MISSING_CONFIG`: Base URL أو API Token مفقود
- `AUTH_ERROR`: API Token غير صالح (401)
- `NOT_FOUND`: Endpoint غير موجود (404)
- `API_ERROR`: خطأ HTTP آخر
- `TIMEOUT`: انتهت مهلة الاتصال
- `CONNECTION_ERROR`: فشل الاتصال

#### كود Python
```python
# djangoo/apps/providers/adapters/internal.py:38
def fetch_balance(self, creds: InternalCredentials):
    url = 'http://127.0.0.1:8000/api-dj/users/profile'
    headers = {
        'api-token': creds.api_token,
        'X-Tenant-Host': tenant_host
    }
    resp = requests.get(url, headers=headers, timeout=10)
    # ... extract balance ...
```

---

### 3.2. List Products / Get Catalog - جلب المنتجات والأسعار

#### التفاصيل
- **HTTP Method**: `GET`
- **Endpoint**: `http://127.0.0.1:8000/api-dj/products`
- **Headers**:
  ```
  api-token: {api_token}
  X-Tenant-Host: {tenant_host}
  ```
- **Query Parameters**: لا يوجد

#### مثال Request
```bash
GET http://127.0.0.1:8000/api-dj/products
Headers:
  api-token: abc123xyz456
  X-Tenant-Host: shamtech.localhost
```

#### مثال Response
```json
[
  {
    "id": "prod-123",
    "name": "Free Fire Diamonds",
    "description": "...",
    "packages": [
      {
        "id": "pkg-456",
        "name": "100 Diamonds",
        "capital": 10.00,
        "minUnits": 1,
        "maxUnits": 10
      }
    ]
  }
]
```

#### Response Structure (Normalized)
```python
[
  {
    'id': str,                  # Package ID
    'externalId': str,           # نفس ID
    'referans': str,             # نفس ID
    'name': str,                 # اسم الـ package
    'basePrice': float,          # السعر (من capital)
    'cost': float,               # نفس basePrice
    'price': float,              # نفس basePrice
    'currency': 'USD',           # دائماً USD
    'currencyCode': 'USD',
    'minQty': int,               # الحد الأدنى
    'maxQty': int,               # الحد الأقصى
    'isActive': bool,
    'category': str,             # اسم المنتج
    'description': str,
    'publicCode': str | None,
    'imageUrl': str | None
  },
  ...
]
```

#### ملاحظات
- كل `product` يمكن أن يحتوي على عدة `packages`
- كل `package` يُحوّل إلى item منفصل في الكتالوج

#### كود Python
```python
# djangoo/apps/providers/adapters/internal.py:108
def fetch_catalog(self, creds: InternalCredentials):
    url = 'http://127.0.0.1:8000/api-dj/products'
    headers = {
        'api-token': creds.api_token,
        'X-Tenant-Host': tenant_host
    }
    resp = requests.get(url, headers=headers, timeout=30)
    data = resp.json()
    # ... transform packages to catalog items ...
```

---

### 3.3. Create Order - إرسال طلب

#### التفاصيل
- **HTTP Method**: `POST`
- **Endpoint**: `http://127.0.0.1:8000/client/api/newOrder/{package_id}/params`
  - `{package_id}`: Package ID من الكتالوج
- **Headers**:
  ```
  api-token: {api_token}
  X-Tenant-Host: {tenant_host}
  ```
- **Query Parameters**:
  ```
  qty={quantity}                    # الكمية (افتراضي: 1)
  user_identifier={userIdentifier}  # رقم الهاتف/المعرف
  extra_field={extraField}          # حقل إضافي
  order_uuid={orderId}               # UUID الطلب (للتعقب)
  ```

#### مثال Request
```bash
POST http://127.0.0.1:8000/client/api/newOrder/pkg-456/params?qty=1&user_identifier=905551234567&extra_field=player123&order_uuid=550e8400-e29b-41d4-a716-446655440000
Headers:
  api-token: abc123xyz456
  X-Tenant-Host: shamtech.localhost
```

#### مثال Response
```json
{
  "orderId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "pending",
  "message": "Order placed successfully",
  "sellPriceAmount": 10.00,
  "sellPriceCurrency": "USD"
}
```

#### Response Structure (Normalized)
```python
{
  'status': str,                  # الحالة (pending, completed, failed, etc.)
  'providerStatus': str,          # نفس status
  'orderId': str | None,          # Order ID
  'externalOrderId': str | None, # نفس orderId
  'message': str,                 # الرسالة
  'note': str,                    # نفس message
  'pin': str | None,              # PIN Code إن وُجد
  'cost': float | None,           # السعر
  'costCurrency': str,             # العملة (عادة USD)
  'data': dict                    # الاستجابة الأصلية
}
```

#### أكواد الأخطاء
- `Missing credentials`: Base URL أو API Token مفقود
- `API Token غير صالح`: 401
- `Package not found`: 404
- `HTTP {status_code}`: خطأ HTTP آخر
- `انتهت مهلة الاتصال`: Timeout
- `فشل الاتصال بالخادم`: Connection error

#### كود Python
```python
# djangoo/apps/providers/adapters/internal.py:239
def place_order(self, creds: InternalCredentials, provider_package_id: str, payload: dict):
    url = f'http://127.0.0.1:8000/client/api/newOrder/{provider_package_id}/params'
    headers = {
        'api-token': creds.api_token,
        'X-Tenant-Host': tenant_host
    }
    params = {
        'qty': str(payload.get('quantity', 1)),
        'user_identifier': payload.get('userIdentifier', ''),
        'extra_field': payload.get('extraField', ''),
        'order_uuid': payload.get('orderId', '')
    }
    resp = requests.post(url, params=params, headers=headers, timeout=30)
    # ... parse response ...
```

---

### 3.4. Fetch Order Status - جلب حالة الطلب

#### التفاصيل
- **HTTP Method**: `GET`
- **Endpoint**: `http://127.0.0.1:8000/client/api/check`
- **Headers**:
  ```
  api-token: {api_token}
  X-Tenant-Host: {tenant_host}
  ```
- **Query Parameters**:
  ```
  orders={reference}  # Order ID أو UUID
  uuid=1                # إذا كان reference هو UUID
  ```

#### مثال Request
```bash
GET http://127.0.0.1:8000/client/api/check?orders=550e8400-e29b-41d4-a716-446655440000&uuid=1
Headers:
  api-token: abc123xyz456
  X-Tenant-Host: shamtech.localhost
```

#### مثال Response
```json
[
  {
    "status": "completed",
    "pin": "PIN123456789",
    "note": "Order completed successfully",
    "externalStatus": "completed"
  }
]
```

#### Response Structure (Normalized)
```python
{
  'status': str,                  # الحالة (pending, completed, failed, etc.)
  'providerStatus': str,          # نفس status
  'pinCode': str | None,          # PIN Code
  'message': str | None,          # الرسالة
  'externalStatus': str | None,   # الحالة الخارجية
  'raw': dict                     # البيانات الأصلية
}
```

#### ملاحظات
- إذا كان `reference` يبدو كـ UUID (36 حرف مع 4 شرطات)، يُضاف `uuid=1`
- يمكن جلب حالة عدة طلبات دفعة واحدة

#### كود Python
```python
# djangoo/apps/providers/adapters/internal.py:341
def fetch_status(self, creds: InternalCredentials, reference: str):
    url = 'http://127.0.0.1:8000/client/api/check'
    params = {'orders': reference}
    if reference.count('-') == 4 and len(reference) >= 32:
        params['uuid'] = '1'
    headers = {
        'api-token': creds.api_token,
        'X-Tenant-Host': tenant_host
    }
    resp = requests.get(url, params=params, headers=headers, timeout=20)
    # ... parse response ...
```

---

## ملخص سريع

### ZNET
| العملية | Method | Endpoint | Auth | Timeout |
|---------|--------|----------|------|---------|
| Get Balance | GET | `/servis/bakiye_kontrol.php` | Query (`kod`, `sifre`) | 5s/20s |
| List Products | GET | `/servis/pin_listesi.php` | Query (`kod`, `sifre`) | 5s/20s |
| Create Order | GET | `/servis/pin_ekle.php` | Query (`kod`, `sifre`) | 5s/20s |
| Fetch Status | GET | `/servis/pin_kontrol.php` | Query (`kod`, `sifre`) | 5s/20s |

### Barakat/Apstore
| العملية | Method | Endpoint | Auth | Timeout |
|---------|--------|----------|------|---------|
| Get Balance | GET | `/client/api/profile` | Header (`api-token`) | 5s/30s |
| List Products | GET | `/client/api/products` | Header (`api-token`) | 5s/30s |
| Create Order | GET | `/client/api/newOrder/{id}/params` | Header (`api-token`) | 5s/30s |
| Fetch Status | GET | `/client/api/check` | Header (`api-token`) | 5s/30s |

### Internal
| العملية | Method | Endpoint | Auth | Timeout |
|---------|--------|----------|------|---------|
| Get Balance | GET | `http://127.0.0.1:8000/api-dj/users/profile` | Header (`api-token`, `X-Tenant-Host`) | 10s |
| List Products | GET | `http://127.0.0.1:8000/api-dj/products` | Header (`api-token`, `X-Tenant-Host`) | 30s |
| Create Order | POST | `http://127.0.0.1:8000/client/api/newOrder/{id}/params` | Header (`api-token`, `X-Tenant-Host`) | 30s |
| Fetch Status | GET | `http://127.0.0.1:8000/client/api/check` | Header (`api-token`, `X-Tenant-Host`) | 20s |

---

## ملاحظات عامة

### Timeout Values
- **ZNET**: `(5, 20)` = 5 ثانية للاتصال، 20 ثانية للقراءة
- **Barakat/Apstore**: `(5, 30)` = 5 ثانية للاتصال، 30 ثانية للقراءة
- **Internal**: 10-30 ثانية حسب العملية

### Error Handling
جميع الـ adapters تعيد:
- **Success**: Dictionary مع البيانات المطلوبة
- **Failure**: Dictionary مع `error` أو `status: 'failed'` + `message`

### Response Format Normalization
جميع الـ adapters تُوحّد الاستجابات إلى نفس البنية:
- `status`: `sent` | `failed` | `completed` | `processing` | `pending`
- `externalOrderId`: معرف الطلب لدى المزود
- `balance`: الرصيد (في Get Balance)
- `cost`: التكلفة (في Create Order)
- `costCurrency`: العملة (TRY أو USD)

---

## المراجع

- **ZNET Adapter**: `djangoo/apps/providers/adapters/znet.py`
- **Barakat/Apstore Adapter**: `djangoo/apps/providers/adapters/barakat.py`
- **Internal Adapter**: `djangoo/apps/providers/adapters/internal.py`
- **Adapter Registry**: `djangoo/apps/providers/adapters/__init__.py`
- **Integration Model**: `djangoo/apps/providers/models.py`

