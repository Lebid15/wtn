# ZDK API — الوثيقة المعتمدة

> **المصدر:** <https://api.ap4stor.com/api-docs> — قُرئت 2026-07-31.
> **ZDK برمجية لا متجر:** `Ap4Stor` و`Barakat` وغيرهما متاجر تعمل بها، ولذلك
> API واحد لها جميعاً. المضيف وحده يتغيّر.
>
> المحوّل عندنا: [`backend/providers/adapters/zdk.py`](../../backend/providers/adapters/zdk.py) — الكود `zdk`
> (والكودان القديمان `barakat`/`apstore` ما زالا مقبولَين للمزوّدين السابقين).

---

## 1. المصادقة

**توكن فقط — لا اسم مستخدم ولا كلمة سر.** يُرسل في الهيدر لا في الرابط:

```
api-token: YOUR_API_TOKEN
```

| | |
|---|---|
| المضيف الافتراضي | `https://api.ap4stor.com` |
| إعداد المزوّد عندنا | `{"code": "zdk", "api_token": "***", "base_url": "(اختياري)"}` |

`base_url` اختياري: يُترك فارغاً للمضيف الافتراضي، ويُضبط لمتجر ZDK آخر
(`https://api.x-stor.net` مثلاً).

---

## 2. العناوين الأربعة

### 2.1 الرصيد
```
GET /client/api/profile
→ { "balance": "…", "email": "…" }
```

### 2.2 الكتالوج
```
GET /client/api/products[?products_id=1,2][&base=1]
```
عنصر واحد:
```json
{
  "id": 0, "name": "", "price": 0, "params": ["playerId"],
  "category_name": "", "available": true,
  "qty_values": null | ["…"] | {"min": "…", "max": "…"},
  "product_type": "amount|package",
  "parent_id": 0, "base_price": 0, "category_img": ""
}
```
- **`id` هو رقم الربط** الذي نرسله في `newOrder`.
- **`params`** يقول أي معاملات يطلبها هذا المنتج — يُعرض في صفحة ربط الباقات
  ليعرف الأدمن ما يجب ضبطه على الربط.
- `GET /client/api/content/{category_id}` يعطي منتجات فئة وفئاتها الفرعية.

### 2.3 إرسال الطلب
```
GET /client/api/newOrder/{productId}/params
    ?qty=1                 ← مطلوب
    &order_uuid=<UUIDv4>   ← مطلوب
    &playerId=<معرّف اللاعب>  ← بحسب المنتج
    &<أي معاملات إضافية>
```
```json
{ "status": "accept|reject|wait",
  "data": { "order_id": "", "status": "accept|reject|wait",
            "price": 0, "data": {"playerId": ""}, "replay_api": null } }
```

> **`order_uuid` مفتاح idempotency:** إعادة إرسال الـ UUID نفسه **لا تُنشئ
> طلباً مكرّراً**. لذلك نشتقّه عندنا من رقم الفيش (`uuid5`) لا عشوائياً — فإعادة
> المحاولة على الفيش نفسه لا تشحن اللاعب مرّتين.

### 2.4 استعلام الحالة (حلقة المراقبة)
```
GET /client/api/check?orders=<id1,id2>[&uuid=1]
```
`uuid=1` حين نستعلم بمعرّفاتنا نحن بدل أرقام المزوّد.
```json
{ "status": "OK",
  "data": [ { "order_id": "", "quantity": 0, "data": {"playerId": ""},
              "created_at": "", "product_name": "", "price": "",
              "status": "accept|reject|wait", "replay_api": null } ] }
```

---

## 3. الحالات

| ZDK | عندنا | المعنى |
|-----|-------|--------|
| `accept` | **ناجح** | نُفّذ |
| `wait` | **قيد التنفيذ** | قيد المعالجة — تتابعه حلقة المراقبة |
| `reject` | **ملغى + استرجاع تلقائي** | رُفض |
| غير معروفة | **قيد التنفيذ** | لا نحسم بالظنّ |

`replay_api` هي رسالة المزوّد للزبون — تُحفظ في «ملاحظة المزوّد». تأتي
`[{"replay":["نص"]}]` في `newOrder` و`["نص"]` في `check`.

---

## 4. أكواد الأخطاء

- **عامّة:** 120 (`Api Token is required!`) · 121 · 122 · 123 · 130
- **الطلبات:** 100 (`Insufficient balance`) · 105–114 · 500

الوثيقة لا تنشر صيغة موحّدة لجسم الخطأ، فالمحوّل يقرأ `message`/`error`/`code`
أيّها وُجد ويعرضه كما هو.

---

## 5. فروق جوهرية عن ZNET

| | ZNET | ZDK |
|---|---|---|
| المصادقة | `kod`+`sifre` في الرابط | `api-token` في الهيدر |
| الصيغة | نصّ مفصول بـ `\|` | JSON |
| ترقيم الباقة | `oyun` + `kupur` | `id` واحد |
| منع التكرار | لا شيء (`referans` للتعقّب) | `order_uuid` **idempotent** |
| ردّ الإرسال | يؤكّد الاستلام فقط (`OK\|تكلفة\|رصيد`) | قد يحسم فوراً (`accept`) أو ينتظر (`wait`) |

---

## 6. لم يُختبر حيّاً بعد ⏳

كل ما سبق مقروء من الوثيقة، ولم يمرّ طلب فعلي عبر ZDK حتى الآن. ما يلزم
تأكيده عند أول تجربة:

1. هل يحسم `newOrder` فوراً (`accept`) أم يردّ `wait` كـZNET؟
2. هل يُخصم الرصيد عند الرفض (`reject`)؟ — نحن نسترجع للوكيل تلقائياً.
3. شكل `replay_api` الفعلي، وهل يحمل كود الشحن (PIN) أم لا.
4. هل يقبل `check` الاستعلام بالـ uuid فعلاً (`uuid=1`).
