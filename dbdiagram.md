<!-- Roles --><!-- Roles --><!-- Roles --><!-- Roles --><!-- Roles -->



Table super_admins {

  id int [pk, increment]

  uuid varchar [unique, not null]Table super_admins {

  display_name varchar

  full_name varchar  id int [pk, increment]

  email varchar [unique, not null]

  password_hash varchar [not null]  uuid varchar [unique, not null]Table super_admins {

  is_active boolean [default: true]

  last_login timestamp  display_name varchar

  created_at timestamp [default: `now()`]

  updated_at timestamp [default: `now()`]  full_name varchar  id int [pk, increment]

}

  email varchar [unique, not null]

Table tenants {

  id int [pk, increment]  password_hash varchar [not null]  uuid varchar [unique, not null]Table super_admins {Table super_admins {

  uuid varchar [unique, not null]

  tenant_code varchar [unique, not null]  is_active boolean [default: true]

  display_name varchar

  tenant_name varchar  last_login timestamp  display_name varchar

  subdomain varchar [unique, not null]

  owner_email varchar  created_at timestamp [default: `now()`]

  owner_phone varchar

  balance_usd decimal(18,3) [default: 0]  updated_at timestamp [default: `now()`]  full_name varchar  id int [pk, increment]  id int [pk, increment]

  subscription_price_usd decimal(18,3) [default: 50]

  subscription_start_date timestamp}

  subscription_end_date timestamp

  subscription_status varchar [default: 'active']  email varchar [unique, not null]

  grace_period_end timestamp

  docs_json jsonbTable tenants {

  default_language varchar [default: 'ar']

  is_internal_provider boolean [default: false]  id int [pk, increment]  password_hash varchar [not null]  uuid varchar [unique, not null]  uuid varchar [unique, not null]

  logo_url varchar

  status varchar [default: 'active']  uuid varchar [unique, not null]

  created_at timestamp [default: `now()`]

  updated_at timestamp [default: `now()`]  tenant_code varchar [unique, not null]  is_active boolean [default: true]

}

  display_name varchar

Table agents {

  id int [pk, increment]  tenant_name varchar  last_login timestamp  display_name varchar             // الاسم الظاهر  display_name varchar             // الاسم الظاهر

  uuid varchar [unique, not null]

  display_name varchar  subdomain varchar [unique, not null]

  tenant_id int [ref: > tenants.id, not null]

  name varchar  owner_email varchar  created_at timestamp [default: `now()`]

  phone_e164 varchar

  email varchar  owner_phone varchar

  password_hash varchar [not null]

  preferred_currency_id int [ref: > tenant_currencies.id]  balance_usd decimal(18,3) [default: 0]  updated_at timestamp [default: `now()`]  full_name varchar  full_name varchar

  preferred_language varchar [default: 'ar']

  balance_usd decimal(18,3) [default: 0]  subscription_price_usd decimal(18,3) [default: 50]

  overdraft_limit_usd decimal(18,3) [default: 0]

  is_internal_account boolean [default: false]  subscription_start_date timestamp}

  status varchar [default: 'active']

  created_at timestamp [default: `now()`]  subscription_end_date timestamp

  updated_at timestamp [default: `now()`]

}  subscription_status varchar [default: 'active']  email varchar [unique, not null]  email varchar [unique, not null]



Table tenant_currencies {  grace_period_end timestamp

  id int [pk, increment]

  uuid varchar [unique, not null]  docs_json jsonbTable tenants {

  display_name varchar

  tenant_id int [ref: > tenants.id, not null]  default_language varchar [default: 'ar']

  currency_code varchar [not null]

  currency_symbol varchar [not null]  is_internal_provider boolean [default: false]  id int [pk, increment]  password_hash varchar [not null]  password_hash varchar [not null]

  rate_to_usd decimal(18,3) [not null]

  is_default_for_agents boolean [default: false]  logo_url varchar

  created_at timestamp [default: `now()`]

  updated_at timestamp [default: `now()`]  status varchar [default: 'active']  uuid varchar [unique, not null]

  

  indexes {  created_at timestamp [default: `now()`]

    (tenant_id, currency_code) [unique]

  }  updated_at timestamp [default: `now()`]  tenant_code varchar [unique, not null]  is_active boolean [default: true]  is_active boolean [default: true]

}

}

<!-- end Roles -->

  display_name varchar

<!-- Global Library -->

Table agents {

Table global_products {

  id int [pk, increment]  id int [pk, increment]  tenant_name varchar  last_login timestamp  last_login timestamp

  uuid varchar [unique, not null]

  product_code varchar [unique, not null]  uuid varchar [unique, not null]

  product_name varchar [not null]

  display_name varchar  display_name varchar  subdomain varchar [unique, not null]

  description text

  image_url varchar  tenant_id int [ref: > tenants.id, not null]

  icon_url varchar

  suggested_capital_usd decimal(18,3)  name varchar  owner_email varchar  created_at timestamp [default: `now()`]  created_at timestamp [default: `now()`]

  is_active boolean [default: true]

  sort_order int [default: 0]  phone_e164 varchar

  created_at timestamp [default: `now()`]

  updated_at timestamp [default: `now()`]  email varchar  owner_phone varchar

}

  password_hash varchar [not null]

Table global_package_link_numbers {

  id int [pk, increment]  preferred_currency_id int [ref: > tenant_currencies.id]  balance_usd decimal(18,3) [default: 0]  updated_at timestamp [default: `now()`]  updated_at timestamp [default: `now()`]

  global_product_id int [ref: > global_products.id, not null]

  link_number int [not null]  preferred_language varchar [default: 'ar']

  is_counter boolean [default: false]

  is_active boolean [default: true]  balance_usd decimal(18,3) [default: 0]

  created_at timestamp [default: `now()`]

    overdraft_limit_usd decimal(18,3) [default: 0]

  indexes {

    (global_product_id, link_number) [unique]  is_internal_account boolean [default: false]  // Subscription fields}}

  }

}  status varchar [default: 'active']



Table global_packages {  created_at timestamp [default: `now()`]  subscription_price_usd decimal(18,3) [default: 50]

  id int [pk, increment]

  uuid varchar [unique, not null]  updated_at timestamp [default: `now()`]

  global_product_id int [ref: > global_products.id, not null]

  package_link_number int [not null]}  subscription_start_date timestamp

  package_name varchar [not null]

  display_name varchar

  description text

  suggested_price_usd decimal(18,3)Table tenant_currencies {  subscription_end_date timestamp

  is_counter boolean [default: false]

  is_active boolean [default: true]  id int [pk, increment]

  sort_order int [default: 0]

  created_at timestamp [default: `now()`]  uuid varchar [unique, not null]  subscription_status varchar [default: 'active']Table tenants {Table tenants {

  updated_at timestamp [default: `now()`]

    display_name varchar

  indexes {

    (global_product_id, package_link_number) [unique]  tenant_id int [ref: > tenants.id, not null]  grace_period_end timestamp [null]

  }

}  currency_code varchar [not null]



<!-- end Global Library -->  currency_symbol varchar [not null]  id int [pk, increment]  id int [pk, increment]



<!-- Products & Orders -->  rate_to_usd decimal(18,3) [not null]



Table products {  is_default_for_agents boolean [default: false]  docs_json jsonb

  id int [pk, increment]

  uuid varchar [unique, not null]  created_at timestamp [default: `now()`]

  tenant_id int [ref: > tenants.id, not null]

  global_product_id int [ref: > global_products.id, not null]  updated_at timestamp [default: `now()`]  default_language varchar [default: 'ar']  uuid varchar [unique, not null]  uuid varchar [unique, not null]

  display_name varchar [not null]

  description text  

  image_url varchar

  uses_custom_image boolean [default: false]  indexes {  is_internal_provider boolean [default: false]

  supports_codes boolean [default: false]

  counter_enabled boolean [default: false]    (tenant_id, currency_code) [unique]

  counter_unit_price_usd decimal(18,3)

  counter_min_quantity int  }  logo_url varchar  tenant_code varchar [unique, not null]  tenant_code varchar [unique, not null]

  counter_max_quantity int

  counter_decimal_precision int [default: 2]}

  is_active boolean [default: true]

  sort_order int [default: 0]  status varchar [default: 'active']

  created_at timestamp [default: `now()`]

  updated_at timestamp [default: `now()`]<!-- end Roles -->

  

  indexes {  created_at timestamp [default: `now()`]  display_name varchar             // الاسم الظاهر (مثلاً اسم المتجر المعروض)  display_name varchar             // الاسم الظاهر (مثلاً اسم المتجر المعروض)

    (tenant_id, global_product_id) [unique]

    (tenant_id, is_active)<!-- Global Library -->

  }

}  updated_at timestamp [default: `now()`]



Table packages {Table global_products {

  id int [pk, increment]

  uuid varchar [unique, not null]  id int [pk, increment]}  tenant_name varchar  tenant_name varchar

  tenant_id int [ref: > tenants.id, not null]

  product_id int [ref: > products.id, not null]  uuid varchar [unique, not null]

  global_package_id int [ref: > global_packages.id]

  package_link_number int [not null]  product_code varchar [unique, not null]

  display_name varchar [not null]

  description text  product_name varchar [not null]

  price_usd decimal(18,3) [not null, default: 0]

  is_counter boolean [default: false]  display_name varcharTable agents {  subdomain varchar [unique, not null]  subdomain varchar [unique, not null]

  unit_price_usd decimal(18,3)

  min_quantity int  description text

  max_quantity int

  decimal_precision int  image_url varchar  id int [pk, increment]

  is_active boolean [default: true]

  sort_order int [default: 0]  icon_url varchar

  created_at timestamp [default: `now()`]

  updated_at timestamp [default: `now()`]  suggested_capital_usd decimal(18,3)  uuid varchar [unique, not null]  owner_email varchar  owner_email varchar

  

  indexes {  is_active boolean [default: true]

    (tenant_id, product_id, package_link_number) [unique]

    (product_id, is_active)  sort_order int [default: 0]  display_name varchar

    (product_id, is_counter)

  }  created_at timestamp [default: `now()`]

  

  Note: "CHECK (price_usd >= 0)"  updated_at timestamp [default: `now()`]  tenant_id int [ref: > tenants.id, not null]  owner_phone varchar  owner_phone varchar

}

}

<!-- end Products & Orders -->

  name varchar

<!-- Providers -->

Table global_package_link_numbers {

// TODO

  id int [pk, increment]  phone_e164 varchar  balance_usd decimal(18,3) [default: 0]  balance_usd decimal(18,3) [default: 0]

<!-- end Providers -->

  global_product_id int [ref: > global_products.id, not null]

<!-- Transactions -->

  link_number int [not null]  email varchar

// TODO

  is_counter boolean [default: false]

<!-- end Transactions -->

  is_active boolean [default: true]  password_hash varchar [not null]  

<!-- Subscriptions -->

  created_at timestamp [default: `now()`]

// TODO

    preferred_currency_id int [ref: > tenant_currencies.id]

<!-- end Subscriptions -->

  indexes {

    (global_product_id, link_number) [unique]  preferred_language varchar [default: 'ar']  // Subscription fields  // Subscription fields

  }

}  balance_usd decimal(18,3) [default: 0]



Table global_packages {  overdraft_limit_usd decimal(18,3) [default: 0]  subscription_price_usd decimal(18,3) [default: 50]  // السعر الشهري (مرن - يمكن تغييره)  subscription_price_usd decimal(18,3) [default: 50]  // السعر الشهري (مرن - يمكن تغييره)

  id int [pk, increment]

  uuid varchar [unique, not null]  is_internal_account boolean [default: false]

  global_product_id int [ref: > global_products.id, not null]

  package_link_number int [not null]  status varchar [default: 'active']  subscription_start_date timestamp  subscription_start_date timestamp

  package_name varchar [not null]

  display_name varchar  created_at timestamp [default: `now()`]

  description text

  suggested_price_usd decimal(18,3)  updated_at timestamp [default: `now()`]  subscription_end_date timestamp   // تاريخ انتهاء الاشتراك الحالي  subscription_end_date timestamp   // تاريخ انتهاء الاشتراك الحالي

  is_counter boolean [default: false]

  is_active boolean [default: true]}

  sort_order int [default: 0]

  created_at timestamp [default: `now()`]  subscription_status varchar [default: 'active']  // active, suspended, grace_period  subscription_status varchar [default: 'active']  // active, suspended, grace_period

  updated_at timestamp [default: `now()`]

  Table tenant_currencies {

  indexes {

    (global_product_id, package_link_number) [unique]  id int [pk, increment]  grace_period_end timestamp [null] // null أو تاريخ انتهاء الفترة المؤقتة  grace_period_end timestamp [null] // null أو تاريخ انتهاء الفترة المؤقتة

  }

}  uuid varchar [unique, not null]



<!-- end Global Library -->  display_name varchar  



<!-- Products & Orders -->  tenant_id int [ref: > tenants.id, not null]



// TODO: نناقش ونضيف  currency_code varchar [not null]  docs_json jsonb  docs_json jsonb



<!-- end Products & Orders -->  currency_symbol varchar [not null]



<!-- Providers -->  rate_to_usd decimal(18,3) [not null]  default_language varchar [default: 'ar']  default_language varchar [default: 'ar']



// TODO: نناقش ونضيف  is_default_for_agents boolean [default: false]



<!-- end Providers -->  created_at timestamp [default: `now()`]  is_internal_provider boolean [default: false]  is_internal_provider boolean [default: false]



<!-- Transactions -->  updated_at timestamp [default: `now()`]



// TODO: نناقش ونضيف  logo_url varchar  logo_url varchar



<!-- end Transactions -->  indexes {



<!-- Subscriptions -->    (tenant_id, currency_code) [unique]  status varchar [default: 'active']  // active, inactive, suspended  status varchar [default: 'active']  // active, inactive, suspended



// TODO: نناقش ونضيف  }



<!-- end Subscriptions -->}  created_at timestamp [default: `now()`]  created_at timestamp [default: `now()`]




<!-- end Roles -->  updated_at timestamp [default: `now()`]  updated_at timestamp [default: `now()`]



<!-- Global Library -->}}



Table global_products {

  id int [pk, increment]

  uuid varchar [unique, not null]Table agents {Table agents {

  product_code varchar [unique, not null]

  product_name varchar [not null]  id int [pk, increment]  id int [pk, increment]

  display_name varchar

  description text  uuid varchar [unique, not null]  uuid varchar [unique, not null]

  image_url varchar

  icon_url varchar  display_name varchar             // الاسم الظاهر (اسم المستخدم المعروض)  display_name varchar             // الاسم الظاهر (اسم المستخدم المعروض)

  suggested_capital_usd decimal(18,3)

  is_active boolean [default: true]  tenant_id int [ref: > tenants.id, not null]  tenant_id int [ref: > tenants.id, not null]

  sort_order int [default: 0]

  created_at timestamp [default: `now()`]  name varchar  name varchar

  updated_at timestamp [default: `now()`]

}  phone_e164 varchar               // رقم الهاتف بصيغة E.164 (مثل: +966501234567)  phone_e164 varchar               // رقم الهاتف بصيغة E.164 (مثل: +966501234567)



<!-- end Global Library -->  email varchar  email varchar



<!-- Products & Orders -->  password_hash varchar [not null]  password_hash varchar [not null]



// TODO: نناقش ونضيف  preferred_currency_id int [ref: > tenant_currencies.id]  preferred_currency_id int [ref: > tenant_currencies.id]



<!-- end Products & Orders -->  preferred_language varchar [default: 'ar']  preferred_language varchar [default: 'ar']



<!-- Providers -->  balance_usd decimal(18,3) [default: 0]  balance_usd decimal(18,3) [default: 0]



// TODO: نناقش ونضيف  overdraft_limit_usd decimal(18,3) [default: 0]  overdraft_limit_usd decimal(18,3) [default: 0]



<!-- end Providers -->  is_internal_account boolean [default: false]  is_internal_account boolean [default: false]



<!-- Transactions -->  status varchar [default: 'active']  // active, inactive, suspended, debtor  status varchar [default: 'active']  // active, inactive, suspended, debtor



// TODO: نناقش ونضيف  created_at timestamp [default: `now()`]  created_at timestamp [default: `now()`]



<!-- end Transactions -->  updated_at timestamp [default: `now()`]  updated_at timestamp [default: `now()`]



<!-- Subscriptions -->}}



// TODO: نناقش ونضيف



<!-- end Subscriptions -->Table tenant_currencies {Table tenant_currencies {


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


