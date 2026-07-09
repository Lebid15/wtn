# خريطة الميزات — نظام لوحة وكلاء لشحن الألعاب

> المرجع: `bayi.alayatl.com` (نسخة السوبر أدمن — حساب `5550000007`)
> التركيز: **OyunPin + Ayarlar + Raporlar** فقط. تم تجاهل Fatura و Kontor بناءً على طلب المالك (غير مطلوبين في السوق السوري).
> منهجية التوثيق: هيدر الجدول + الفلاتر + الأزرار + النوافذ المنبثقة (لا صفوف بيانات).

---

## 0. الهيكل العام للتنقل (Top Navigation)

**القائمة الرئيسية (يسار):**
- 🏠 (Home) → `/menu.php`
- ~~Fatura~~ (مُستبعد)
- ~~Kontor~~ (مُستبعد)
- **OyunPin** → `/OyunPin/`
- **Ayarlar** → `/Ayarlar/`
- **Raporlar** → `/Raporlar/`

**شريط التنبيهات (يمين — أيقونات):**
| # | الأيقونة | الغرض |
|---|---|---|
| 1 | Anlık Mesajlaşma | محادثة فورية مع الوكلاء (شات) |
| 2 | Bekleyen Fatura | فواتير معلّقة *(غير مطلوب)* |
| 3 | Bekleyen Kontor | كونتور معلّق *(غير مطلوب)* |
| 4 | **Bekleyen OyunPin** | **طلبات ألعاب معلّقة — مهم** |
| 5 | Oyun Apileri | حالة مزوّدي API الألعاب |
| 6 | Fatura Api&Tahsilatçı Bakiye Uyarısı | *(غير مطلوب)* |
| 7 | Kontor Api Bakiye Uyarısı | *(غير مطلوب)* |
| 8 | Yeni Bayi | وكلاء جدد بانتظار الموافقة |
| 9 | Bayiden Mesaj Var | رسائل من الوكلاء (تذاكر) |
| 10 | Takılan İşlem Var | طلبات عالقة |
| 11 | Önemli Bir Uyarınız Var | تنبيهات مهمة |
| 12 | Ödeme Bildirimleri | إشعارات دفع من الوكلاء |

**زر أعلى يمين:** `Güvenli Çıkış` (خروج آمن)

---

## 1. الصفحة الرئيسية (`/menu.php`) — Neler Yeni?

### القائمة الفرعية العلوية (تحت شريط التنبيهات):
| العنصر | الرابط | الوصف |
|---|---|---|
| Neler Yeni? | `menu.php` | سجل تحديثات النظام (default) |
| Küpür Listesi | `kupurler.php` | قائمة الفئات المرجعية للمنتجات |
| Program Listesi | `programlarimiz.php` | قائمة برامج/روبوتات النظام |
| Duyuru Ekle | `duyuru_ekle.php` | إضافة إعلان للوكلاء |
| Kayan Yazı | `modul_mesaji_ekle_yeni.php` | نص متحرك يظهر للوكلاء |
| Bayiden Gelen Mesajlar | `ticket_admin.php` | نظام تذاكر الدعم |
| Uyarı Gönder | `toplu_gonderi.php` | إرسال تنبيهات جماعية |

### المحتوى الرئيسي:
- **آية قرآنية** في الأعلى + رسالة مخصّصة (يبدو أنها قابلة للتحرير من الأدمن).
- **سجل تحديثات طويل (Changelog)** — يشرح ميزات النظام تراكمياً منذ 2021.

### ميزات OyunPin المستخرجة من الـ Changelog:
> هذه المصدر الأهم لفهم ما يجب أن أبنيه.

#### أ) هيكل بيانات OyunPin
- **Oyunlar** (الألعاب) → **Paketler/Pinler** (المنتجات داخل كل لعبة)
- كل لعبة قد تكون:
  - **Paketli** (بيع بحزم ثابتة: 60 UC, 300 UC …)
  - **Adetli** (بيع بالوحدة/الكمية)
- نفس اللعبة قد يكون لها نسختان: عادية + "adetli"

#### ب) الأسعار
- **Maliyet** (تكلفة الشراء)
- **Tavsiye** (السعر الموصى به للمستخدم النهائي)
- **Fiyat Grubu** (مجموعة أسعار الوكيل — كل وكيل ينتمي لمجموعة)
- **Bayi Özel Fiyat** (سعر خاص لوكيل معيّن يتجاوز المجموعة)
- **Dolar Kuru** (كل مجموعة أسعار لها سعر صرف دولار خاص)
- **Kazanç Üzerinden Fiyat** (تسعير بنسبة من الربح: maliyet + (tavsiye-maliyet) × %)
- **Oto Fiyat Güncelleme** (تحديث تلقائي للـ Maliyet + Tavsiye + Fiyat Grubu عند تغيّر سعر شراء الـ API)
- **Zarar Ayarı** (منع البيع بخسارة عبر API — يوقف الطلب بدل إرساله)

#### ج) الطلبات (Takip)
- إرسال يدوي + إرسال تلقائي عبر API
- **Parçalı İşlemler** (طلب واحد يُقسّم لعدّة طلبات فرعية إذا كان الـ API لا يدعم الحزمة كاملة)
- **Farklı Oyun Eşleştirme** (توجيه طلب لعبة إلى API لعبة أخرى)
- إمكانية **تعديل Maliyet** لطلب موجود (double-click)
- **Yükleyici Ekranı** (شاشة للمنفّذ اليدوي — قائمة انتظار للطلبات التي تحتاج تدخل بشري)

#### د) الوكلاء (Bayi) الخاصة بـ OyunPin
- **Zorunlu Oyuncu GSM** (إجبار/إلغاء إجبار حقل رقم اللاعب لكل لعبة)
- **Ürün Satışı Durdur** (إيقاف بيع منتج مؤقتاً دون تعطيله — يظل ظاهراً للوكيل لكن لا يُباع)
- **Bayi Ülke Ayarı** (تقييد جغرافي: بعض الوكلاء لا يستطيعون الإرسال التلقائي إذا سجّلوا دخول من خارج تركيا)

#### هـ) الأمان
- **Znet Auth** (تطبيق أندرويد للتحقق الثنائي — بديل عن كلمة السر)
- **Güvenlik Resmi** (صورة أمان بدل/مع كلمة السر)
- **Parola Yenileme** (بعد 3 محاولات خاطئة → SMS تلقائي بكلمة سر جديدة)
- **Google Doğrulama** للدخول من خارج البلد (مرة واحدة لكل جهاز)
- الـ 2FA "الآلة الحاسبة" الذي شاهدناه عملياً

#### و) ميزات إضافية
- **Ana Bayi** (وكيل رئيسي له وكلاء تحته — hierarchy)
- **Anlık Mesajlaşma** (شات لحظي أدمن↔وكيل)
- **Toplu Sms/Gonderi** (رسائل جماعية)
- **Duyuru** (إعلانات + نص متحرك على واجهة الوكيل)
- **Ticket System** (طلبات دعم من الوكلاء)
- **Oto Onay Borç** (حد ائتماني/دين تلقائي للوكيل)
- **Yedekleme** (نسخ احتياطي للأسعار كل ساعة)

---

## 2. قسم OyunPin — التبويبات السبعة

| # | التبويب | الرابط |
|---|---|---|
| 2.1 | Oyun-Pin Takip | `/OyunPin/admin_pin_process.php` |
| 2.2 | Oyun Listesi | `/OyunPin/admin_pinList.php` |
| 2.3 | Pin Listesi | `/OyunPin/admin_allPinList.php` |
| 2.4 | Oyun-Pin Fiyat Grupları | `/OyunPin/admin_priceGroups.php` |
| 2.5 | Oyun-Pin Bayi Fiyat Ayarları | `/OyunPin/admin_dealer_groups.php` |
| 2.6 | Oyun-Pin Havuzu | `/OyunPin/admin_pinApiPool.php` |
| 2.7 | Oyun-Pin Apileri | `/OyunPin/admin_apis.php` |

---

### 2.1 Oyun-Pin Takip — متابعة الطلبات
> screenshot: `oyunpin/01_takip.png` (سيُحفظ)

**أزرار فلترة سريعة (أعلى يمين):** Zararına Satış · Sadece Parçalı Ürünler · Bekleyen · Başarılı · İptal · Hepsi

**نموذج البحث المتقدم (4 صفوف):**
- Oyun (dropdown) | Ürün (dropdown) | Bayi (dropdown)
- Api (dropdown) | Fiş No (text) | Abone Tel (text)
- Tutar Min (number) | Tutar Max (number) | İşlem Tarihi (date range مع 2 date-picker)
- Aktif Durum Filtresi (badges) | OyuncuID (text) | زرَي Filitrele + Filitre Kaldır

**أعمدة الجدول:**
| # | Checkbox | Oyun (icon) | Fiş No (link→detail) | Bayi | Ürün Adı | Müşteri Tel / Oyuncu ID | Alış | Satış | Kazanç | İşlem Durum (icon أخضر/أصفر/أحمر) | Sıfırla (Yazdırmayı Sıfırla + Sms Sıfırla) | Api | Bekleme Süre |

**تفاصيل الطلب (Detay — inline expansion عند نقر Fiş No):**
- İşlem Tarihi + Onay Tarihi
- Bayi Notu (ملاحظة الوكيل/الأدمن — مثال: "Apisi değiştirilerek manuel onaylandı")
- Müşteri Tel · Oyuncu ID · Bayi IP
- PIN (كود التسليم النهائي — قد يكون "Cevap Bekleniyor...")
- Api Sonuç (رد الـ API — مثال: `3 - "رصيدك غير كاف"`)
- Önceki / Sonraki Bakiye (الرصيد قبل/بعد)
- Ana Bayi Karı (ربح الوكيل الرئيسي)
- أزرار: **Müşteriye Sms Gönder** + **Kara Listeye Ekle** (قائمة سوداء)

**إجراءات جماعية (checkbox):** إعادة إرسال / إلغاء / … (لم يظهر شريط bulk واضح — يُختبر لاحقاً)

---

### 2.2 Oyun Listesi — قائمة الألعاب
> screenshot: `oyunpin/02_oyun_listesi.png`

**العرض:** بطاقات (Cards) بشبكة، drag & drop لإعادة الترتيب (uk-sortable). كل بطاقة:
- صورة اللعبة (`../images/games/*.jpg` مع fallback `noimagefound.jpg`)
- اسم اللعبة
- Oluşturulma Tarihi
- زر **Pasif Et** (تعطيل)

**زر أعلى:** Yeni Oyun Ekle → **Modal:**
- Oyun Adı (dropdown من كتالوج مركزي مقفل — ليس نص حر)
- Bayiye Açıklama (textarea)
- Kaydet

**صفحة تفصيل اللعبة** (`admin_pinListDetail.php?gameID=X`) — `oyunpin/02b_oyun_detay.png`:

**قسم A — Oyun Detaylarını Düzenle:**
- Oyun Adı
- Bayiye Not
- Oyun Açıklama
- Oyun Durum (Aktif/Pasif)
- **Kurulu Satış** (Aktif/Pasif) — بيع بالحزم المعرَّفة
- Sms Şablonu + شرح المتغيرات
- **Toplu Satış** (Aktif/Pasif) — بيع بكميات
- **Zorunlu Oyuncu GSM** (Aktif/Pasif) — إظهار/إخفاء حقل رقم اللاعب
- Oyun için Seçilen Resim + زر Düzenle للصورة

**قسم B — ÜRÜN İŞLEMLERİ (منتجات اللعبة):**
- نموذج إضافة منتج: Adı | Alış Fiyatı | Tavsiye Fiyatı | Küpür (dropdown) | Durum | Api (Manuel/Auto) | Açıklama | زر Ekle
- جدول: checkbox (نشط) | Adı | Alış Fiyatı | Tavsiye Fiyatı | Ürün Küpür | Durum | Parçalı (HAYIR/EVET) | Açıklama | Oluş.Tarihi | Gönderilen Api | İşlem (تعطيل/تعديل/**إيقاف بيع مؤقت** بدون تعطيل)

---

### 2.3 Pin Listesi — قائمة كل المنتجات موحّدة
> screenshot: `oyunpin/03_pin_listesi.png`

**العرض:** جدول واحد، صفوف مجمّعة تحت رأس ملوّن (أصفر) لكل لعبة.

**البحث:** حقل Ara (بحث نصي عام).

**أعمدة الجدول:**
| Checkbox | Ürün Adı (مع Product ID) | Alış Fiyatı | Tavsiye | **Gönderilebilir Apileri** (dropdown — API رئيسي) | **Api 1** (fallback أول) | **Api 2** (fallback ثاني) |

> ملاحظة معمارية: كل منتج يدعم **routing لثلاثة مستويات API** — رئيسي + 2 fallback عند فشل الرئيسي.

drag & drop مدعوم للترتيب حسب رغبة العرض للوكلاء.

---

### 2.4 Oyun-Pin Fiyat Grupları — مجموعات الأسعار
> screenshot: `oyunpin/04_fiyat_gruplari.png`

**شريط إجراءات علوي:**
- Grup Adı (dropdown filter)
- Filtre
- **Fiyat Grubu Oluştur** (إنشاء مجموعة جديدة — يدعم Kopyalanacak Fiyat Grubu + Maliyetleri Üzerinden Fiyat Grubu Oluştur بنسبة أو مبلغ)
- **Grup Tavsiyeleri** (تعديل جماعي للأسعار الموصى بها)
- Grubu Sil
- **Fiyatlandırma Yap** (تسعير جماعي — بنسبة على maliyet أو على tavsiye أو على الربح، مع فلاتر kategori و aralık)
- **Standart Maliyet Güncelle** (تحديث الـ maliyet من الـ API)
- SMS

**أعمدة الجدول:**
| صورة اللعبة | Ürün Adı | Maliyet | Tavsiye | مجموعة #1 | مجموعة #4 | مجموعة #5 | مجموعة #6 | مجموعة #15 | ... |

كل خلية مجموعة = سعر خاص + زر (X) لإزالة السعر المخصص والعودة للحساب التلقائي.

**ميزات مخفية من الـ changelog:**
- Dolar Kuru مستقل لكل مجموعة أسعار (تحديث تلقائي أو يدوي)
- Kazanç Üzerinden Fiyatlandırma (تسعير بنسبة من الربح فقط)
- Ana Bayi Fiyatlandırma (وكيل رئيسي له لوجيك تسعير مستقل)

---

### 2.5 Oyun-Pin Bayi Fiyat Ayarları — إعدادات أسعار الوكلاء
> screenshot: `oyunpin/05_bayi_fiyat_ayarlari.png`

**أعلى:** Toplu Fiyat Grubu Ata (نص) + Güncelle (تعيين مجموعة أسعار جماعياً لعدة وكلاء).

**تحذير أحمر:** ***"Bayi Yurt Dışı IP İzni, API siparişlerinde çalışmaz. Bayi giriş bilgileri ele geçirilirse bu ayar güvenlik sağlamayacaktır!"***

**بحث:** Ara

**أعمدة الجدول:**
| Bayi Id | Bayi Adı (link→detail) | Bayi Oyun Yükleme Limiti (رقم) | Bayi Yurt Dışı Ip İzin (Evet/Hayır radio) | Fiyat Grubu (dropdown: 000, 1, 4, 5, 6, ...) | Detay (زر قلم أخضر يفتح لوحة أسعار خاصة بهذا الوكيل — override على مستوى المنتج) |

---

### 2.6 Oyun-Pin Havuzu — بنك البينات (Pin Pool)
> screenshot: `oyunpin/06_havuzu.png`

**الغرض:** تخزين مسبق للبينات المشتراة (Google Play, iTunes, PIN cards…) مع تسليم تلقائي عند طلب المنتج المرتبط.

**قسم A — Havuz Apileri Takip:**
- نموذج إنشاء مجموعة: Grup Adı | Grup Açıklama | Bağlı Apisi (dropdown) | زر Ekle
- أزرار: **Pin Gönder-Al** (إرسال/استلام) | **Pinlerim** (استعراض بيناتي)
- بحث: Tüm Gruplardan Pin Ara
- جدول: ID | Grup Adı | Grup Açıklama | Toplam Maliyet | Bağlı Apisi | Oluşturulma Tarihi | Durum | Düzenle | Detay
- Footer: TOPLAM MALİYET
- Pagination: Önceki / 1 / Sonraki

**قسم B — Tamamlanmamış Toplu Satışlar (طلبات جماعية غير مكتملة):**
- Id | Bayi | Oyun | Ürün | Adet | Toplam Tutar | Eklenme Tarihi | İşlem

---

### 2.7 Oyun-Pin Apileri — مزودو الـ API
> screenshot: `oyunpin/07_apiler.png`

**أزرار أعلى:** ● Yeni Api Ekle | ● Pasif Apiler

**أنواع الـ API (Tür):**
- **Aynı Sistem** — ربط مع لوحة znet أخرى (نفس النظام)
- **Havuz** — من المخزن الداخلي
- **As7ab Card / Barakat-Store / Ap4Stor** — مزودو بطاقات خارجيون
- **Yükleyici** — منفّذ يدوي (بشري)

**أعمدة الجدول:**
| Api Adı (+ أيقونات: refresh, favori, X للحذف) | Tür | Durum (dot أخضر/أحمر) | Bekleyen İşlemler (Adet + TL) | Gerçek Bakiye | Bakiye (Oyun Api Bakiye + Diger Modul Bakiye + Toplam) | Borç | İşlem (5 أيقونات: ⚙ ayarlar / ✏ düzenle / 💳 VISA/ödeme / 💼 çanta / 📊 grafik) |

**سطر Yükleyiciler:** Bağlantı Sayısı (عدد الاتصالات المفتوحة) + زر **Yükleyici Ayarları**.

**Footer:** Toplamlar (مجموع صافي)

**ميزات مخفية من الـ changelog لكل API:**
- **Zarar Ayarı** (منع البيع بخسارة — يوقف الطلب بدل إرساله)
- **Oto Güncelleme** (تحديث تلقائي للأسعار عند تغيّر سعر شراء الـ API)
- **Bakiye Uyarısı** (تنبيه عند نزول الرصيد تحت حد معيّن)
- **Ürün Eşleştirme** (ربط منتجاتنا بمنتجات الـ API — مع إمكانية Farklı Oyun Eşleştirme)
- **Karşı Apide Ürün Eşleştirme** (تلقائي إذا كان الطرفان znet)

---

## 3. قسم Ayarlar — الإعدادات (14 تبويب)

| # | التبويب | الرابط | مطلوب لسوريا؟ |
|---|---|---|---|
| 3.1 | Ödeme Takip | `Ayarlar/odeme_takip.php` | ✅ (إشعارات دفع الوكلاء) |
| 3.2 | Hesaplarım | `Ayarlar/admin_banka_tanimlama.php` | ✅ (حسابات استلام الأموال) |
| 3.3 | Hesap Hareketleri | `Ayarlar/admin_hesap_takip.php` | ✅ (كشف حركة الحسابات) |
| 3.4 | **Bayi Listesi** | `Ayarlar/bayiler.php` | ✅✅ (إدارة الوكلاء — الأهم) |
| 3.5 | Bayi Grupları | `Ayarlar/admin_bayi_gruplari.php` | ✅ (مجموعات الوكلاء) |
| 3.6 | Tahsilat* | `Ayarlar/admin_tahsilat_takip.php` | ⚠️ (تحصيل آلي بنكي تركي — يُستبدل) |
| 3.7 | **Site Genel Ayarları** | `Ayarlar/admin_genel_ayarlar.php` | ✅ (تنبيهات صوتية) |
| 3.8 | Pos Tanımları | `Ayarlar/pos_tanimlari.php` | ⚠️ (POS تركي — يُستبدل ببوابات سورية) |
| 3.9 | **Ana Sayfa (Web Site)** | `Ayarlar/website.php` | ✅✅ (الألوان/اللغة/العلامة التجارية) |
| 3.10 | Admin Uyarıları | `Ayarlar/admin_loglar.php` | ✅ (سجل تنبيهات الأدمن) |
| 3.11 | Znet Talep Bildirimi | `Ayarlar/znet_talep.php` | ❌ (خاص بالشركة التركية) |
| 3.12 | Pos Hareketleri | `Ayarlar/pos_hareketleri.php` | ⚠️ (حركات POS — يُستبدل) |
| 3.13 | Sms Servisleri | `Ayarlar/sms_servisi.php` | ✅ (بوابات SMS) |

---

### 3.4 Bayi Listesi — إدارة الوكلاء ⭐ (القلب الإداري)
> screenshot: `ayarlar/04_bayi_listesi.png`

**شريط أدوات علوي:**
- Ara (بحث) + **DETAY GÖSTER** (إظهار تفاصيل)
- أيقونات أعلام/نجمة (تصنيف الوكلاء بألوان/مفضلة)
- ● Pasifleri Göster | Bayi Ekle | Haritada Göster | Alt Bayileri Göster
- فلاتر dropdown: En Son Ödeme Hareketi | Tüm İller (المحافظة) | OyunPin Fiyat Grubu | Fatura Fiyat Grubu | Kontör Fiyat Grubu
- Excel'e Aktar | Filitre Kaldır

**أعمدة الجدول (النظام المرجعي التركي):**
| BID (رقم الوكيل) | Bayi Adı (+عدد الوكلاء الفرعيين) | Kln. Bakiye (الرصيد المتاح) | Kull. Bakiye (الرصيد المستخدم) | Borc (الدين) | Finans İşlem (+ إضافة رصيد / − خصم / 📊 كشف / تقرير / تقويم) | Ftra | Kntr | Alisv | Oyun | Akt | Drm | Grp | Ülke (علم) | Krt | İşlem |

> ⚠️ **تعديل معتمد في نظامنا (مختلف عن المرجع):** بدل ثلاثة حقول (رصيد متاح + رصيد مستخدم + دين)، نظامنا يستخدم **رصيداً واحداً موقّعاً (signed balance)** يقبل الموجب والسالب — والقيمة السالبة تعني الدين. أي أعمدتنا: **الرصيد (±)** فقط بدل `Kln. Bakiye / Kull. Bakiye / Borc`. راجع القسم 6 (Wallet) للتفاصيل.

> النقاط الملوّنة (أخضر/أحمر) = تفعيل/تعطيل كل موديول لكل وكيل على حدة.

**Finans İşlem (الأزرار المالية لكل وكيل):** ➕ شحن رصيد يدوي · ➖ خصم · 📊 كشف حساب · 📄 تقرير · 📅 حركات بتاريخ.

**DETAY GÖSTER يفتح لكل وكيل (من الـ changelog):** تغيير كلمة السر / تصفير الصورة الأمنية (RESİM) · Borç Limiti + Oto Onay · Ülke Ayarı · صلاحيات الموديولات.

---

### 3.1 Ödeme Takip — متابعة إشعارات الدفع
> `ayarlar/01_odeme_takip.png` — طلبات شحن الرصيد الواردة من الوكلاء (تحويل → إبلاغ → موافقة الأدمن → إضافة للرصيد). فلاتر + أزرار موافقة/رفض.

### 3.2 Hesaplarım — حساباتي (استلام الأموال)
> `ayarlar/02_hesaplarim.png` — تعريف حسابات الاستلام. **سوريا:** شام كاش، MTN Cash، سيرياتيل كاش، تحويل بنكي.

### 3.3 Hesap Hareketleri — حركات الحسابات
> `ayarlar/03_hesap_hareketleri.png` — كشف تفصيلي لكل الحركات المالية (ledger).

### 3.5 Bayi Grupları — مجموعات الوكلاء
> `ayarlar/05_bayi_gruplari.png` — تصنيف الوكلاء (تسعير/صلاحيات جماعية).

### 3.7 Site Genel Ayarları — إعدادات التنبيهات الصوتية
> `ayarlar/07_genel_ayarlar.png` — 3 أقسام (Ödeme/Kontor/**Oyun**): صوت (Açık/Kapalı) + كل كم دقيقة أو كمية معلّقة + مدة الصوت.

### 3.9 Ana Sayfa (Web Site Ayarları) ⭐⭐ — العلامة التجارية
> `ayarlar/09_website.png` — **أهم صفحة لطلبك (الألوان + اللغة + التعريب):**
- **Tema Rengi** (لون الثيم) · **Logo Şekli** · **Dil** (لغة الواجهة)
- Kuruluş Yılı · Kısa İsim/Logo · Tam İsim · Kordinatlar
- Adres / E-Posta / Telefon / Faks
- Anasayfa Orta Metin · **Sayfa Altı Metin (HTML)** · زر Kaydet

### 3.10 Admin Uyarıları
> `ayarlar/10_loglar.png` — سجل الأحداث المهمة (تغيّر أسعار، أخطاء API، تحذيرات أمنية).

### 3.13 Sms Servisleri
> `ayarlar/13_sms_servisi.png` — مزوّد SMS لأكواد التحقق والإشعارات. **سوريا:** مزوّد محلي أو WhatsApp API.

### تُستبدل/تُحذف لسوريا:
- **Tahsilat* / Pos Tanımları / Pos Hareketleri** → أنظمة تحصيل وPOS تركية (EsnekPos) → تُستبدل ببوابات/محافظ سورية.
- **Znet Talep Bildirimi** → قناة دعم مع الشركة التركية → لا لزوم لها.

---

## 4. قسم Raporlar — التقارير (15 تقرير)

> **البنية موحّدة:** فلاتر (Bayi, Temsilci, Oyun, Ürün, Api, Tarih Başı/Sonu) + تجميع (Bayi/Api Grupla) + Detay Göster/Gösterme + أزرار (Filitrele, **Excel'e Aktar**, Filitreyi Kaldır) + جدول + صف مجاميع (Yekün).

| # | التقرير | الرابط | مطلوب؟ |
|---|---|---|---|
| 4.1 | Bayi Kasa Hareketleri | `Raporlar/KasaIslemleri.php` | ✅ |
| 4.2 | Ödeme İşlem Raporu | `Raporlar/OdemeDetayRaporu.php` | ✅ |
| 4.3 | Bayi Toplam Raporu | `Raporlar/BayiToplamOdemeRaporu.php` | ✅ |
| 4.4 | Hesap Toplam Raporu | `Raporlar/HesapToplamOdemeRaporu.php` | ✅ |
| 4.5 | **Ana Bayi Kar Raporu** | `Raporlar/AnaBayiKarRaporu.php` | ✅ |
| 4.6 | **Oyun Pin İşlem Raporu** | `Raporlar/OyunPinIslemRaporu.php` | ✅✅ |
| 4.7 | **Oyun Pin Toplam Raporu** | `Raporlar/OyunPinToplamRaporu.php` | ✅✅ |
| 4.8 | **Oyun Pin Ana Bayi Toplamları** | `Raporlar/OyunPinToplamRaporuAnaBayi.php` | ✅ |
| — | Fatura ×3 + Kontor ×3 | — | ❌ مُستبعدة |

### 4.7 Oyun Pin Toplam Raporu (نموذج مرجعي)
> `raporlar/07_oyunpin_toplam.png`
- **الفلاتر:** Bayi · Temsilci · Oyun · Ürün · Api · Tarih Başı/Sonu (Takvim)
- **التجميع:** ☐ Bayi Grupla · ☐ Api Grupla · ⦿ Detay Göster/Gösterme
- **الأزرار:** Filitrele · Excel'e Aktar · Filitreyi Kaldır
- **أعمدة:** OYUN | Adet | Alış | Satış | Kazanç | Bayi Karı | Toplam + صف مجاميع
- ملاحظة: *"Olumsuz işlemler ve ALT Ürünler rapora dahil edilmez"*

---

## 5. الطبقة المشتركة (Layout / UI)

- **RTL/عربي** موجود جزئياً أصلاً (نصوص عربية للوكلاء العرب).
- **مبدّل لغة** (dropdown أسفل كل صفحة) → **i18n بنيوي موجود**.
- **مبدّل ثيم ألوان** (5 مربعات أسفل كل صفحة) → **theming بنيوي موجود**.
- Header ثابت (قائمة + 12 أيقونة تنبيه + Güvenli Çıkış) + Sub-nav لكل قسم + Footer.
- تقنياً: **PHP + jQuery + UIkit + Font Awesome**، صفحات كثيرة داخل `<iframe>`.

---

## 6. ملخّص موديولات النظام الجديد (سوريا/عربي)

- **Core:** Auth (2FA TOTP بدل الآلة الحاسبة) · Multi-tenant (Admin/Ana Bayi/Bayi/Alt Bayi + subdomain) · RBAC · i18n RTL · Theming + Branding لكل tenant.
- **Wallet (معدّل — رصيد واحد موقّع):** بدل نموذج المرجع (رصيد + دين منفصلين)، نستخدم **رصيداً واحداً موقّعاً (signed balance)**:
  - الرصيد رقم واحد يقبل الموجب والسالب. **السالب = دين** (بدل حقل Borç منفصل).
  - الشحن يرفع الرصيد، والشراء يخفضه (قد ينزل تحت الصفر إذا سُمح).
  - **Kredi Limiti (حد ائتماني):** أقصى قيمة سالبة مسموحة (مثال: `-500`) — يمنع الطلب إذا تجاوز الرصيدُ الناتجُ هذا الحد.
  - Oto Onay (موافقة تلقائية على الطلب طالما `الرصيد − سعر الطلب ≥ حد الائتمان`).
  - Ledger مزدوج القيد يبقى للتدقيق، لكن الرصيد المعروض = مجموع الحركات (رقم واحد ±).
  - Ödeme Bildirimi · Hesaplar (شام كاش/MTN/سيرياتيل/بنك).
- **Catalog:** Oyunlar (كتالوج + صور) · Ürünler (Kurulu/Toplu-Adetli) · Küpür · Zorunlu Oyuncu GSM/ID · Ürün Satışı Durdur.
- **Pricing:** Fiyat Grupları + Maliyet/Tavsiye · Dolar Kuru للمجموعة · Kazanç Üzerinden · Fiyatlandırma Yap (جماعي) · Bayi Özel Fiyat · Oto Güncelleme.
- **Orders:** Takip (حالات) · Manuel (Yükleyici queue) + Otomatik (API) · Parçalı · Farklı Oyun Eşleştirme · PIN + SMS + Kara Liste.
- **Providers:** Adapter (Aynı Sistem/Card-Store/Havuz/Yükleyici) · 3-level fallback · Ürün Eşleştirme · Zarar/Oto Güncelleme/Bakiye Uyarısı.
- **Pool (Havuz):** تخزين بينات مسبقة + تسليم تلقائي · Toplu Satış.
- **Reports:** İşlem/Toplam/Ana Bayi Kar (OyunPin + Wallet) · Excel + تجميع + فلاتر تاريخ.
- **Notifications:** Anlık Mesajlaşma · Duyuru + Kayan Yazı · Ticket · Toplu Gönderi + تنبيهات صوتية.
- **Customer Store:** subdomain لكل وكيل بثيم/شعار مخصّص · كتالوج + سلة + دفع + تسليم.
