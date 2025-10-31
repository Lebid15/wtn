<!-- Roles --><!-- Roles -->



Table super_admins {Table super_admins {

  id int [pk, increment]  id int [pk, increment]

  uuid varchar [unique, not null]  uuid varchar [unique, not null]

  display_name varchar             // الاسم الظاهر  display_name varchar             // الاسم الظاهر

  full_name varchar  full_name varchar

  email varchar [unique, not null]  email varchar [unique, not null]

  password_hash varchar [not null]  password_hash varchar [not null]

  is_active boolean [default: true]  is_active boolean [default: true]

  last_login timestamp  last_login timestamp

  created_at timestamp [default: `now()`]  created_at timestamp [default: `now()`]

  updated_at timestamp [default: `now()`]  updated_at timestamp [default: `now()`]

}}



Table tenants {Table tenants {

  id int [pk, increment]  id int [pk, increment]

  uuid varchar [unique, not null]  uuid varchar [unique, not null]

  tenant_code varchar [unique, not null]  tenant_code varchar [unique, not null]

  display_name varchar             // الاسم الظاهر (مثلاً اسم المتجر المعروض)  display_name varchar             // الاسم الظاهر (مثلاً اسم المتجر المعروض)

  tenant_name varchar  tenant_name varchar

  subdomain varchar [unique, not null]  subdomain varchar [unique, not null]

  owner_email varchar  owner_email varchar

  owner_phone varchar  owner_phone varchar

  balance_usd decimal(18,3) [default: 0]  balance_usd decimal(18,3) [default: 0]

  

  // Subscription fields  // Subscription fields

  subscription_price_usd decimal(18,3) [default: 50]  // السعر الشهري (مرن - يمكن تغييره)  subscription_price_usd decimal(18,3) [default: 50]  // السعر الشهري (مرن - يمكن تغييره)

  subscription_start_date timestamp  subscription_start_date timestamp

  subscription_end_date timestamp   // تاريخ انتهاء الاشتراك الحالي  subscription_end_date timestamp   // تاريخ انتهاء الاشتراك الحالي

  subscription_status varchar [default: 'active']  // active, suspended, grace_period  subscription_status varchar [default: 'active']  // active, suspended, grace_period

  grace_period_end timestamp [null] // null أو تاريخ انتهاء الفترة المؤقتة  grace_period_end timestamp [null] // null أو تاريخ انتهاء الفترة المؤقتة

  

  docs_json jsonb  docs_json jsonb

  default_language varchar [default: 'ar']  default_language varchar [default: 'ar']

  is_internal_provider boolean [default: false]  is_internal_provider boolean [default: false]

  logo_url varchar  logo_url varchar

  status varchar [default: 'active']  // active, inactive, suspended  status varchar [default: 'active']  // active, inactive, suspended

  created_at timestamp [default: `now()`]  created_at timestamp [default: `now()`]

  updated_at timestamp [default: `now()`]  updated_at timestamp [default: `now()`]

}}



Table agents {Table agents {

  id int [pk, increment]  id int [pk, increment]

  uuid varchar [unique, not null]  uuid varchar [unique, not null]

  display_name varchar             // الاسم الظاهر (اسم المستخدم المعروض)  display_name varchar             // الاسم الظاهر (اسم المستخدم المعروض)

  tenant_id int [ref: > tenants.id, not null]  tenant_id int [ref: > tenants.id, not null]

  name varchar  name varchar

  phone_e164 varchar               // رقم الهاتف بصيغة E.164 (مثل: +966501234567)  phone_e164 varchar               // رقم الهاتف بصيغة E.164 (مثل: +966501234567)

  email varchar  email varchar

  password_hash varchar [not null]  password_hash varchar [not null]

  preferred_currency_id int [ref: > tenant_currencies.id]  preferred_currency_id int [ref: > tenant_currencies.id]

  preferred_language varchar [default: 'ar']  preferred_language varchar [default: 'ar']

  balance_usd decimal(18,3) [default: 0]  balance_usd decimal(18,3) [default: 0]

  overdraft_limit_usd decimal(18,3) [default: 0]  overdraft_limit_usd decimal(18,3) [default: 0]

  is_internal_account boolean [default: false]  is_internal_account boolean [default: false]

  status varchar [default: 'active']  // active, inactive, suspended, debtor  status varchar [default: 'active']  // active, inactive, suspended, debtor

  created_at timestamp [default: `now()`]  created_at timestamp [default: `now()`]

  updated_at timestamp [default: `now()`]  updated_at timestamp [default: `now()`]

}}



Table tenant_currencies {Table tenant_currencies {

  id int [pk, increment]  id int [pk, increment]

  uuid varchar [unique, not null]  uuid varchar [unique, not null]

  display_name varchar             // الاسم الظاهر (مثلاً "الليرة التركية")  display_name varchar             // الاسم الظاهر (مثلاً "الليرة التركية")

  tenant_id int [ref: > tenants.id, not null]  tenant_id int [ref: > tenants.id, not null]

  currency_code varchar [not null]  // SAR, TRY, USD, EUR, etc  currency_code varchar [not null]  // SAR, TRY, USD, EUR, etc

  currency_symbol varchar [not null] // ر.س, ₺, $, €, etc  currency_symbol varchar [not null] // ر.س, ₺, $, €, etc

  rate_to_usd decimal(18,3) [not null]  rate_to_usd decimal(18,3) [not null]

  is_default_for_agents boolean [default: false]  is_default_for_agents boolean [default: false]

  created_at timestamp [default: `now()`]  created_at timestamp [default: `now()`]

  updated_at timestamp [default: `now()`]  updated_at timestamp [default: `now()`]

  

  indexes {  indexes {

    (tenant_id, currency_code) [unique]    (tenant_id, currency_code) [unique]

  }  }

}}



<!-- end Roles --><!-- end Roles -->



<!-- Products & Orders --><!-- Products & Orders -->



// TODO: نناقش ونضيفTable products {

  id int [pk, increment]

<!-- end Products & Orders -->  uuid varchar [unique, not null]

  tenant_id int [ref: > tenants.id, not null]

<!-- Providers -->  display_name varchar [not null]

  description text

// TODO: نناقش ونضيف  category varchar                 // Games, Gift Cards, Mobile Credit, etc

  price_usd decimal(18,3) [not null]

<!-- end Providers -->  cost_usd decimal(18,3)           // سعر الشراء من المزود (اختياري)

  is_active boolean [default: true]

<!-- Transactions -->  stock_quantity int [default: -1] // -1 = unlimited, >= 0 = limited stock

  provider_product_id varchar      // معرّف المنتج عند المزود الخارجي

// TODO: نناقش ونضيف  image_url varchar

  sort_order int [default: 0]

<!-- end Transactions -->  created_at timestamp [default: `now()`]

  updated_at timestamp [default: `now()`]

<!-- Subscriptions -->  

  indexes {

// TODO: نناقش ونضيف    (tenant_id, is_active)

  }

<!-- end Subscriptions -->}


Table orders {
  id int [pk, increment]
  uuid varchar [unique, not null]
  tenant_id int [ref: > tenants.id, not null]
  agent_id int [ref: > agents.id, not null]
  product_id int [ref: > products.id, not null]
  
  price_usd decimal(18,3) [not null]         // السعر بالدولار وقت الطلب
  agent_currency_id int [ref: > tenant_currencies.id, not null]
  price_local decimal(18,3) [not null]       // السعر بعملة الوكيل وقت الطلب
  exchange_rate decimal(18,3) [not null]     // سعر الصرف المستخدم وقت الطلب
  
  customer_data jsonb              // بيانات الزبون (Player ID, Account Number, etc)
  provider_response jsonb          // رد المزود الخارجي (الكود، حالة الطلب، إلخ)
  
  status varchar [default: 'pending']  // pending, processing, completed, failed, cancelled, refunded
  error_message text               // في حالة الفشل
  
  completed_at timestamp
  failed_at timestamp
  created_at timestamp [default: `now()`]
  updated_at timestamp [default: `now()`]
  
  indexes {
    (tenant_id, created_at)
    (agent_id, created_at)
    (status)
  }
}

<!-- end Products & Orders -->

<!-- Providers -->

Table providers {
  id int [pk, increment]
  uuid varchar [unique, not null]
  provider_name varchar [not null]
  description text
  api_endpoint varchar
  api_key_encrypted text           // مشفّر
  api_secret_encrypted text        // مشفّر
  webhook_url varchar              // لاستقبال التحديثات من المزود
  is_active boolean [default: true]
  config_json jsonb                // إعدادات إضافية خاصة بكل مزود
  created_at timestamp [default: `now()`]
  updated_at timestamp [default: `now()`]
}

Table product_providers {
  id int [pk, increment]
  product_id int [ref: > products.id, not null]
  provider_id int [ref: > providers.id, not null]
  provider_product_code varchar [not null]  // الكود/المعرّف عند المزود
  priority int [default: 1]        // ترتيب الأولوية (1 = أعلى، للـ fallback)
  is_active boolean [default: true]
  
  indexes {
    (product_id, priority)
    (product_id, provider_id) [unique]
  }
}

<!-- end Providers -->

<!-- Transactions -->

Table transactions {
  id int [pk, increment]
  uuid varchar [unique, not null]
  tenant_id int [ref: > tenants.id, not null]
  agent_id int [ref: > agents.id, null]  // null إذا كانت معاملة للمستأجر نفسه
  
  type varchar [not null]          // order, deposit, withdrawal, refund, adjustment
  amount_usd decimal(18,3) [not null]
  balance_before_usd decimal(18,3) [not null]
  balance_after_usd decimal(18,3) [not null]
  
  reference_type varchar           // order, manual, system, etc
  reference_id int                 // order.id أو معرّف آخر
  
  notes text
  created_by_type varchar          // super_admin, tenant, agent, system
  created_by_id int
  created_at timestamp [default: `now()`]
  
  indexes {
    (tenant_id, created_at)
    (agent_id, created_at)
    (reference_type, reference_id)
  }
}

<!-- end Transactions -->

<!-- Subscriptions -->

Table subscription_payments {
  id int [pk, increment]
  uuid varchar [unique, not null]
  tenant_id int [ref: > tenants.id, not null]
  
  amount_usd decimal(18,3) [not null]  // المبلغ المدفوع (مرن - قد يختلف)
  period_start timestamp [not null]    // بداية فترة الاشتراك
  period_end timestamp [not null]      // نهاية فترة الاشتراك (30 يوم عادةً)
  
  payment_proof_url varchar            // رابط صورة الإيصال/التحويل (يرفعه المستأجر)
  payment_method varchar               // bank_transfer, cash, other
  notes text                           // ملاحظات من المستأجر
  
  status varchar [default: 'pending']  // pending, approved, rejected
  
  submitted_at timestamp               // وقت إرسال الطلب من المستأجر
  approved_by int [ref: > super_admins.id]
  approved_at timestamp
  rejection_reason text
  
  created_at timestamp [default: `now()`]
  
  indexes {
    (tenant_id, created_at)
    (status)
  }
}

Table subscription_grace_periods {
  id int [pk, increment]
  tenant_id int [ref: > tenants.id, not null]
  hours_granted int [not null]         // عدد الساعات الممنوحة (مثال: 48)
  granted_by int [ref: > super_admins.id, not null]
  start_time timestamp [not null]
  end_time timestamp [not null]
  reason text                          // سبب المنح (مثال: "متأخر بالدفع - مسافر")
  created_at timestamp [default: `now()`]
  
  indexes {
    (tenant_id, created_at)
  }
}

<!-- end Subscriptions -->


