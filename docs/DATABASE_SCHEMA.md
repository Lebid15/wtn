# مخطط قاعدة البيانات — Database Schema

> مبني على `reference/FEATURE_MAP.md`. صيغة مبسّطة (سنحوّلها إلى Prisma schema
> عند بدء الكود). كل الجداول التي عليها `tenant_id` معزولة لكل مستأجر.

**اصطلاحات:** PK = مفتاح أساسي · FK = مفتاح خارجي · `?` = اختياري ·
`±` = يقبل قيمة سالبة.

---

## أ. المنصّة والمستأجرون (Platform)

### `tenants` — المستأجرون (بدون tenant_id — مستوى منصّة)
| الحقل | النوع | ملاحظات |
|-------|------|---------|
| id | PK | |
| name | string | اسم الوكيل/الشركة |
| subdomain | string unique | `alaya` → alaya.example.com |
| status | enum | active / suspended / trial |
| theme_color | string | لون الثيم المخصّص |
| logo_url | string? | الشعار |
| default_locale | string | `ar` |
| created_at | datetime | |

### `subscriptions` — اشتراكات المستأجرين (فوترة المنصّة)
| id | PK | |
| tenant_id | FK→tenants | |
| plan | string | الباقة |
| price | decimal | |
| period_start / period_end | date | |
| status | enum | active / past_due / cancelled |

### `global_games` — الكتالوج المركزي للألعاب (مستوى منصّة)
| id | PK | |
| name | string | PUBG, Free Fire … |
| image_url | string | |
| category | string? | |

> المستأجرون "يتبنّون" ألعاباً من هذا الكتالوج إلى جدول `games` الخاص بهم.

---

## ب. المستخدمون والأدوار (Core)

### `users`
| الحقل | النوع | ملاحظات |
|-------|------|---------|
| id | PK | |
| tenant_id | FK→tenants ? | null = مستخدم منصّة (سوبر أدمن) |
| parent_id | FK→users ? | الوكيل الأعلى (هرمية Ana Bayi→Bayi→Alt Bayi) |
| role | enum | platform_owner / tenant_admin / ana_bayi / bayi / alt_bayi / customer |
| login_id | string | رقم الدخول (مثل 5550000007) |
| name | string | |
| phone | string? | |
| password_hash | string | Argon2 |
| totp_secret | string? | مفتاح الـ 2FA |
| security_image | string? | Güvenlik Resmi |
| country | string | لتقييد Ülke Ayarı |
| foreign_ip_allowed | bool | Bayi Yurt Dışı Ip İzin |
| oyun_load_limit | decimal? | Bayi Oyun Yükleme Limiti |
| price_group_id | FK→price_groups ? | مجموعة أسعار الوكيل |
| status | enum | active / passive / blacklisted |
| modules | jsonb | تفعيل/تعطيل الموديولات (النقاط الملوّنة) |
| failed_login_count | int | لإعادة تعيين كلمة السر |
| created_at | datetime | |

### `audit_logs` — سجل التدقيق (Admin Uyarıları / Loglar)
| id, tenant_id, user_id, action, entity, meta(jsonb), ip, created_at |

---

## ج. المحفظة (Wallet) — رصيد واحد موقّع ⭐

> **قرار معتمد:** رصيد واحد `balance ±` بدل (رصيد + دين منفصلين). السالب = دين.

### `wallets`
| id | PK | |
| tenant_id | FK | |
| user_id | FK→users | |
| balance | decimal ± | الرصيد الحالي (قد يكون سالباً) |
| credit_limit | decimal | Kredi Limiti — أقصى قيمة سالبة مسموحة (مثال -500) |
| currency | string | |

### `wallet_transactions` — دفتر الأستاذ (Ledger — Hesap Hareketleri)
| id | PK | |
| tenant_id | FK | |
| wallet_id | FK→wallets | |
| type | enum | topup / order_debit / refund / manual_credit / manual_debit / adjustment |
| amount | decimal ± | |
| balance_before | decimal ± | Önceki Bakiye |
| balance_after | decimal ± | Sonraki Bakiye |
| ref_type | string? | order / payment … |
| ref_id | bigint? | |
| note | string? | |
| created_by | FK→users | |
| created_at | datetime | |

> الرصيد المعروض = `balance` (يُحدّث ذرّياً داخل معاملة DB مع كل حركة).

### `receiving_accounts` — حساباتي (Hesaplarım — استلام الأموال)
| id, tenant_id, method(enum: sham_cash/mtn_cash/syriatel_cash/bank/…), title, details(jsonb), active |

### `payment_notifications` — إشعارات الدفع (Ödeme Takip / Ödeme Bildirimi)
| id | PK | |
| tenant_id | FK | |
| user_id | FK→users | الوكيل الذي أبلغ |
| account_id | FK→receiving_accounts | |
| amount | decimal | |
| proof_url | string? | إثبات التحويل |
| status | enum | pending / approved / rejected |
| approved_by | FK→users ? | |
| created_at | datetime | |

---

## د. الكتالوج (Catalog)

### `games` — ألعاب المستأجر (Oyunlar)
| id | PK | |
| tenant_id | FK | |
| global_game_id | FK→global_games ? | مصدر التبنّي |
| name | string | |
| image_url | string | مع fallback noimagefound |
| dealer_note | string? | Bayiye Açıklama |
| description | string? | |
| status | enum | active / passive |
| kurulu_sale | bool | بيع بحزم ثابتة |
| toplu_sale | bool | بيع بالكمية (Adetli) |
| require_player_id | bool | Zorunlu Oyuncu GSM/ID |
| sms_template | string? | |
| sort_order | int | (drag & drop) |

### `kupur` — الفئات المرجعية (Küpür Listesi)
| id, tenant_id?, name, value | (قد تكون مركزية أو لكل مستأجر) |

### `products` — المنتجات/البينات (Ürünler / Pinler)
| id | PK | |
| tenant_id | FK | |
| game_id | FK→games | |
| name | string | Ürün Adı (60 UC …) |
| cost_price | decimal | Alış / Maliyet |
| recommended_price | decimal | Tavsiye |
| kupur_id | FK→kupur ? | |
| status | enum | active / passive / sale_paused (إيقاف بيع مؤقت) |
| is_parcali | bool | Parçalı (يُقسّم لطلبات فرعية) |
| execution_type | enum | manual / auto |
| description | string? | |
| sort_order | int | |
| created_at | datetime | |

---

## هـ. التسعير (Pricing)

### `price_groups` — مجموعات الأسعار (Fiyat Grupları)
| id | PK | |
| tenant_id | FK | |
| name | string | (000, 1, 4, 5, 6, 15 …) |
| dollar_rate | decimal | Dolar Kuru مستقل للمجموعة |
| pricing_mode | enum | fixed / on_cost_% / on_profit_% (Kazanç Üzerinden) |
| created_at | datetime | |

### `product_prices` — أسعار المنتج لكل مجموعة
| id | PK | |
| tenant_id | FK | |
| product_id | FK→products | |
| price_group_id | FK→price_groups | |
| price | decimal? | null = يُحسب تلقائياً من tavsiye/الوضع |

### `dealer_product_prices` — سعر خاص لوكيل معيّن (Bayi Özel Fiyat / Detay)
| id | PK | |
| tenant_id | FK | |
| user_id | FK→users | الوكيل |
| product_id | FK→products | |
| price | decimal | override يتجاوز مجموعته |

> **منطق حساب السعر النهائي** (يُنفّذ في `pricing.service`):
> 1. سعر خاص للوكيل؟ → استخدمه.
> 2. وإلا سعر المنتج في مجموعة الوكيل.
> 3. وإلا حسب `pricing_mode` للمجموعة (نسبة على cost أو على الربح) + `dollar_rate`.

---

## و. الطلبات (Orders — Takip)

### `orders`
| id | PK | |
| tenant_id | FK | |
| receipt_no | string unique | Fiş No |
| user_id | FK→users | الوكيل الطالب |
| game_id | FK→games | |
| product_id | FK→products | |
| player_id | string? | Oyuncu ID |
| customer_phone | string? | Müşteri Tel |
| cost_price | decimal | Alış (قابل للتعديل بالأدمن) |
| sell_price | decimal | Satış |
| profit | decimal | Kazanç |
| ana_bayi_profit | decimal? | Ana Bayi Karı |
| status | enum | pending / processing / success / cancelled / stuck / partial |
| provider_id | FK→providers ? | الـ API المستخدم فعلاً |
| pin_result | string? | PIN (كود التسليم) |
| api_response | string? | Api Sonuç |
| balance_before | decimal ± | |
| balance_after | decimal ± | |
| dealer_note | string? | Bayi Notu |
| dealer_ip | string? | Bayi IP |
| created_at | datetime | İşlem Tarihi |
| approved_at | datetime? | Onay Tarihi |

### `order_splits` — الطلبات الفرعية (Parçalı İşlemler)
| id, order_id FK, product_id FK, provider_id FK?, status, pin_result, api_response |

### `blacklist` — القائمة السوداء (Kara Liste)
| id, tenant_id, value(phone/player_id), reason, created_by, created_at |

---

## ز. المزوّدون والتوجيه (Providers)

### `providers` — مزوّدو API (Oyun-Pin Apileri)
| id | PK | |
| tenant_id | FK | |
| name | string | |
| type | enum | same_system(znet) / card_store / pool / yuklenici(manual) |
| config | jsonb | مفاتيح/روابط API |
| status | enum | active / passive |
| real_balance | decimal? | Gerçek Bakiye |
| balance | decimal? | |
| debt | decimal? | Borç |
| loss_guard | bool | Zarar Ayarı (منع البيع بخسارة) |
| auto_update | bool | Oto Güncelleme للأسعار |
| balance_alert_threshold | decimal? | Bakiye Uyarısı |

### `provider_product_map` — مطابقة منتجاتنا بمنتجات المزوّد (Ürün Eşleştirme)
| id | PK | |
| tenant_id | FK | |
| product_id | FK→products | |
| provider_id | FK→providers | |
| provider_product_code | string | كود المنتج عند المزوّد |
| priority | int | 0=رئيسي، 1=Api1، 2=Api2 (توجيه 3-مستويات) |

> **التوجيه (Order Routing):** عند طلب منتج، رتّب المزوّدين حسب `priority`،
> جرّب الرئيسي؛ عند الفشل انتقل لـ Api1 ثم Api2 (fallback).

---

## ح. بنك البينات (Pool — Havuz)

### `pin_pools` — مجموعات البينات
| id, tenant_id, name, description, provider_id FK?, total_cost, status, created_at |

### `pins` — البينات المخزّنة
| id | PK | |
| tenant_id | FK | |
| pool_id | FK→pin_pools | |
| code | string | كود البين (مشفّر) |
| cost | decimal | |
| status | enum | available / delivered / reserved |
| delivered_order_id | FK→orders ? | |
| created_at | datetime | |

---

## ط. الإشعارات والتواصل (Notifications)

### `announcements` — الإعلانات + النص المتحرك (Duyuru / Kayan Yazı)
| id, tenant_id, type(announcement/marquee), body, active, created_at |

### `tickets` — نظام التذاكر (Bayiden Gelen Mesajlar)
| id, tenant_id, user_id, subject, status(open/closed), created_at |

### `ticket_messages`
| id, ticket_id FK, sender_id FK, body, created_at |

### `chat_messages` — الشات اللحظي (Anlık Mesajlaşma)
| id, tenant_id, from_user FK, to_user FK, body, read_at?, created_at |

### `sms_services` — مزوّدو SMS
| id, tenant_id, provider, config(jsonb), active |

---

## ي. الإعدادات (Settings)

### `tenant_settings` — إعدادات الموقع (Site Genel + Web Site Ayarları)
| id | PK | |
| tenant_id | FK unique | |
| theme_color | string | Tema Rengi |
| logo | string? | |
| locale | string | Dil |
| founded_year | string? | |
| short_name / full_name | string | |
| address / email / phone | string? | |
| homepage_text | string? | Anasayfa Orta Metin |
| footer_html | string? | Sayfa Altı Metin |
| sound_alerts | jsonb | إعدادات التنبيهات الصوتية (Ödeme/Oyun) |

---

## ك. التقارير (Reports)

> التقارير **مشتقّة** (queries + aggregations) — لا جداول جديدة غالباً. تعتمد
> على `orders`, `wallet_transactions`, `users`, `providers`. تدعم فلاتر
> (Bayi/Oyun/Ürün/Api/تاريخ) + تجميع + تصدير Excel.

الأهم:
- **Oyun Pin İşlem / Toplam Raporu** ← من `orders`.
- **Ana Bayi Kar Raporu** ← من `orders.ana_bayi_profit`.
- **Bayi Kasa / Ödeme İşlem** ← من `wallet_transactions`.

---

## ملخّص العلاقات الأساسية

```
tenants ──< users ──< wallets ──< wallet_transactions
   │          │
   │          └──< orders >── products >── games
   │                │            │
   │                │            └──< product_prices >── price_groups
   │                └── providers ──< provider_product_map
   └──< global_games (مشترك)
```
