# ZNET YAZILIM API — الوثيقة الرسمية (محفوظة)

> **مصدرها:** وثيقة ZNET الرسمية من `serkan@znet.com.tr` — سلّمها المالك بتاريخ
> 2026-07-31. **هذه هي المرجع المعتمد** لكل ما يخصّ ZNET؛ لا تُطلب مرّة أخرى.
>
> ملخّصنا القديم في `PROVIDER_API_SPEC.md` كان **ناقصاً** (أغفل أن `kupur`
> إلزامي في `pin_ekle`) وهو ما أضاع أول طلب حيّ لنا. عند أي تعارض:
> **هذا الملف هو الحاكم**.

## شرط أساسي
> Tüm apilerin yapılabilmesi için kullanıcı listesinden **api yetkisinin
> verilmesi** gerekmektedir.

لتشغيل أي API يجب منح **صلاحية API** للحساب من قائمة المستخدمين.

**كل المواقع تحوي subdomain — عادةً `bayi.siteadi.com`.**

---

## 1. BAKİYE KONTROL — استعلام الرصيد

```
GET http://bayi.siteadi.com/servis/bakiye_kontrol.php?kod=5458301536&sifre=123456
```
**الردّ:** `OK|12755.23`

> ⚠️ **ملاحظة حرجة:** إن كان الوكيل غير موجود، أو **API غير مفعّل**، أو
> **الـ IP الثابت غير مطابق** → **يعود الردّ فارغاً بلا أي رسالة خطأ.**
> (`cevap boş gelir, herhangi bir hata verilmez`)

**عندنا:** استجابة فارغة ⇒ نعرض رسالة تشرح هذه الأسباب الثلاثة بدل «خطأ مجهول».
لاحظ أن الردّ يحوي **الرصيد فقط ولا يحوي الدين**.

---

## 2. FATURA KURUM LİSTESİ — قائمة مؤسّسات الفواتير

```
GET /servis/kurum_listesi.php?kod=...&sifre=...
```
**صيغة الردّ:** `KURUM ID, SORGU KODU, ADI, MALIYETI, OZELHSPYNT#...#...#`
(المؤسّسات مفصولة بـ `#`، والمهم هو **KURUM ID**؛ كود الاستعلام قد يتكرّر.)

> **خارج نطاق مشروعنا** — قسم الفواتير (Fatura) مستبعَد من السوق السوري.

---

## 3. FATURA GÖNDERME / KONTROL — إرسال ومتابعة الفواتير

```
GET /servis/fatura_ekle.php?kod&sifre&kurum_id&tahsilat_api_islem_id&abone_adi
    &son_odeme_tarihi&tesisat_no&kurum_kodu&fatura_no&fatura_tutari
```
**الردّ:** `OK|0.30|2644.78|110.45` = `OK | التكلفة | الرصيد المتبقي | إجمالي المخصوم`

**الأخطاء:** عملية مكرّرة → `4|Daha Önce Gönderilmiş (166189)` · غير ذلك → `3|Açıklama`

```
GET /servis/fatura_kontrol.php?kod&sifre&tahsilat_api_islem_id
```
**الردّ:** `1:ACIKLAMA` (BEKLIYOR/انتظار) · `2:ACIKLAMA` (ONAYLI/موافَق) · `3:ACIKLAMA` (IPTAL/ملغى)

```
GET /servis/fatura_top_kontrol.php?...&tahsilat_api_islem_id=123456,123457
```
**الردّ:** `123456|2||##123457|3||##` — الطلبات المنتظِرة **لا يُردّ عليها**، وبحدّ أقصى 100 عملية.

> **خارج نطاق مشروعنا.**

---

## 4. KONTOR GÖNDERİMİ / KONTROLÜ — الكونتور

**المشغّلون:** Turkcell · Vodafone · Avea — **الأنواع:** tam · 3gcep · 3g · ses · sms · bal

```
GET /servis/tl_servis.php?bayi_kodu&sifre&operator&tip&kontor&gsmno&tekilnumara
```
**صيغة الردّ:** `OK|الحالة|الشرح|التكلفة`
- `OK|1|Talebiniz İşleme Alınmıştır.|5.50` — قُبل الطلب
- `OK|3|…|0.00` — **رفض مباشر** (`3 doğrudan olumsuz cevabı temsil eder`)
- `OK|8|Bu İşlem Daha Önce Gönderildi|0.00` — **يحتاج تحقّقاً** (مكرّر)

```
GET /servis/tl_kontrol.php?bayi_kodu&sifre&tekilnumara
```
**الردّ:** `1:olumlu_islem:5.50` · `2:islemde:5.50` · `3:iptal_nedeni`

> **خارج نطاق مشروعنا** — قسم الكونتور مستبعَد.

---

## 5. OYUN PİN ÜRÜN LİSTESİ — كتالوج باقات الألعاب ⭐

```
GET http://bayi.siteadi.com/servis/pin_listesi.php?kod=5458301536&sifre=123456
```
```json
{
  "success": true,
  "result": [
    {
      "id": "2",
      "adi": "PUBG Mobile 325 UC",
      "aciklama": "Oyun otomatik olarak yuklenir.325 UC ",
      "oyun_id": "1",
      "oyun_adi": "PUBG",
      "fiyat": "35.00",
      "kupur": "325",
      "oyun_bilgi_id": "1"
    }
  ],
  "error": null
}
```
**عند الخطأ:** `success = false` وشرح الخطأ في الحقل `error`.

| الحقل | المعنى | استعمالنا |
|------|--------|-----------|
| `id` | معرّف السطر في الكتالوج | — |
| `adi` | اسم الباقة لدى ZNET | اسم الباقة في قائمة الربط |
| `aciklama` | وصف | يُعرض تحت الاسم |
| `oyun_id` · `oyun_adi` | اللعبة | تجميع القائمة |
| `fiyat` | سعرها لدينا كوكيل | مقارنة التكلفة |
| **`kupur`** | **فئة الباقة** | → المعامل `kupur` |
| **`oyun_bilgi_id`** | **معرّف اللعبة للإرسال** | → المعامل `oyun` |

> **الملاحظة الحاسمة:** `Oyun bilgisi olarak pin_listesi servisinden gelen`
> **`oyun_bilgi_id`** `gönderilir.` — أي أن `oyun` المُرسَل هو `oyun_bilgi_id`
> **وليس** `id`.

---

## 6. OYUN PİN GÖNDERİMİ — إرسال طلب شحن ⭐

```
GET http://bayi.siteadresi.com/servis/pin_ekle.php
    ?kod=5555555555&sifre=123456&oyun=1&kupur=123
    &referans=123456&musteri_tel=51234567890&oyuncu_bilgi=987456
```

| المعامل | المصدر |
|--------|--------|
| `oyun` | `oyun_bilgi_id` من الكتالوج |
| **`kupur`** | **`kupur` من الكتالوج — إلزامي** |
| `referans` | رقم مرجعي تكيلي نولّده (timestamp + عشوائي) |
| `musteri_tel` | هاتف الزبون |
| `oyuncu_bilgi` | معرّف اللاعب |

**النجاح:** `OK|10.12|980.88` = `OK | تكلفة الوكيل | الرصيد المتبقي`
**الفشل:** `3|Açıklama`

> ⚠️ **هذا ما أضاع طلبنا الأول:** أرسلنا `oyun` بلا `kupur` فردّ ZNET
> `Kupur Bilgisi Bulunamadı`. الملخّص القديم وصف `kupur` بأنه «اختياري» — خطأ.

---

## 7. OYUN PİN KONTROL — متابعة حالة الطلب ⭐

```
GET bayi.siteadresi.com/servis/pin_kontrol.php?kod&sifre&tahsilat_api_islem_id=123456
```
**صيغة الردّ:** `OK | İŞLEM DURUM | YÜKLENEN PİN | AÇIKLAMA`

| الردّ | الحالة | عندنا |
|------|--------|-------|
| `OK\|1\| \|Açıklama` | قيد المعالجة | يبقى **قيد التنفيذ** |
| `OK\|2\|AB12-CD34-EF56-GH78\|Açıklama` | مكتمل + الـ PIN | **ناجح** + حفظ الـ PIN |
| `OK\|3\| \|Açıklama` | **IPTAL (ملغى)** | **ملغى + استرجاع المبلغ** |
| `3\|Açıklama` | فشل **الاستعلام** لا الطلب | لا نغيّر الحالة |

> `tahsilat_api_islem_id` هو نفسه `referans` الذي أرسلناه في `pin_ekle`،
> ونحفظه في `Order.provider_ref`.

**مؤكَّد عملياً (2026-07-31):** ألغى المالك الطلب `26073180840` من لوحة ZNET،
فردّ `pin_kontrol` بالحالة `3` بلا نصّ `Açıklama`، **وأعاد ZNET المبلغ**
(الرصيد عاد 581.60 → 625.00). لذلك صار إلغاء المزوّد عندنا يسترجع مبلغ
الوكيل تلقائياً بدل تركه «عالقاً».

---

## خريطة التنفيذ عندنا

| الخدمة | الملف | الدالّة |
|--------|------|---------|
| الرصيد | `backend/providers/adapters/znet.py` | `get_balance` · `parse_balance` |
| الكتالوج | نفسه | `list_packages` · `parse_packages` |
| الإرسال | نفسه | `place_order` · `parse_place` |
| المتابعة | نفسه | `fetch_status` · `parse_status` |
| حلقة المراقبة | `backend/orders/services.py` | `sync_order` · `sync_pending` |
| رقم الربط | `backend/catalog/models.py` | `ProductLink` (منتج × مزوّد) |

**إعداد المزوّد:**
```json
{ "code": "znet", "base_url": "http://bayi.alayatl.com/", "kod": "…", "sifre": "…" }
```
مسارات اختيارية للتخصيص: `balance_path` · `catalog_path` · `orders_path` · `status_path`.

**التواصل:** serkan@znet.com.tr
