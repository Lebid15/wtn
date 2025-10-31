Table super_admins {
  id int [pk, increment]
  uuid varchar [unique, not null]
  display_name varchar
  full_name varchar
  email varchar [unique, not null]
  password_hash varchar [not null]
  is_active boolean [default: true]
  last_login timestamp
  created_at timestamp [default: `now()`]
  updated_at timestamp [default: `now()`]
}

Table tenants {
  id int [pk, increment]
  uuid varchar [unique, not null]
  tenant_code varchar [unique, not null]
  display_name varchar
  tenant_name varchar
  subdomain varchar [unique, not null]
  owner_email varchar
  owner_phone varchar
  balance_usd decimal(18,3) [default: 0]
  subscription_price_usd decimal(18,3) [default: 50]
  subscription_start_date timestamp
  subscription_end_date timestamp
  subscription_status varchar [default: 'active']
  grace_period_end timestamp
  docs_json jsonb
  default_language varchar [default: 'ar']
  is_internal_provider boolean [default: false]
  logo_url varchar
  status varchar [default: 'active']
  created_at timestamp [default: `now()`]
  updated_at timestamp [default: `now()`]
}

Table agents {
  id int [pk, increment]
  uuid varchar [unique, not null]
  display_name varchar
  tenant_id int [ref: > tenants.id, not null]
  name varchar
  phone_e164 varchar
  email varchar
  password_hash varchar [not null]
  preferred_currency_id int [ref: > tenant_currencies.id]
  preferred_language varchar [default: 'ar']
  price_group_id int [ref: > price_groups.id]
  current_month_sales_usd decimal(18,3) [default: 0]
  last_tier_update timestamp
  balance_usd decimal(18,3) [default: 0]
  overdraft_limit_usd decimal(18,3) [default: 0]
  is_internal_account boolean [default: false]
  status varchar [default: 'active']
  created_at timestamp [default: `now()`]
  updated_at timestamp [default: `now()`]
}

Table tenant_currencies {
  id int [pk, increment]
  uuid varchar [unique, not null]
  display_name varchar
  tenant_id int [ref: > tenants.id, not null]
  currency_code varchar [not null]
  currency_symbol varchar [not null]
  rate_to_usd decimal(18,6) [not null]
  is_default_for_agents boolean [default: false]
  created_at timestamp [default: `now()`]
  updated_at timestamp [default: `now()`]
  
  indexes {
    (tenant_id, currency_code) [unique]
  }
}

Table global_products {
  id int [pk, increment]
  uuid varchar [unique, not null]
  product_code varchar [unique, not null]
  product_name varchar [not null]
  display_name varchar
  description text
  image_url varchar
  icon_url varchar
  suggested_capital_usd decimal(18,3)
  is_active boolean [default: true]
  sort_order int [default: 0]
  created_at timestamp [default: `now()`]
  updated_at timestamp [default: `now()`]
}

Table global_package_link_numbers {
  id int [pk, increment]
  global_product_id int [ref: > global_products.id, not null]
  link_number int [not null]
  is_counter boolean [default: false]
  is_active boolean [default: true]
  created_at timestamp [default: `now()`]
  
  indexes {
    (global_product_id, link_number) [unique]
  }
}

Table global_packages {
  id int [pk, increment]
  uuid varchar [unique, not null]
  global_product_id int [ref: > global_products.id, not null]
  package_link_number int [not null]
  package_name varchar [not null]
  display_name varchar
  description text
  suggested_price_usd decimal(18,3)
  is_counter boolean [default: false]
  is_active boolean [default: true]
  sort_order int [default: 0]
  created_at timestamp [default: `now()`]
  updated_at timestamp [default: `now()`]
  
  indexes {
    (global_product_id, package_link_number) [unique]
  }
}

Table products {
  id int [pk, increment]
  uuid varchar [unique, not null]
  tenant_id int [ref: > tenants.id, not null]
  global_product_id int [ref: > global_products.id, not null]
  display_name varchar [not null]
  description text
  image_url varchar
  uses_custom_image boolean [default: false]
  supports_codes boolean [default: false]
  counter_enabled boolean [default: false]
  counter_unit_price_usd decimal(18,3)
  counter_min_quantity int
  counter_max_quantity int
  counter_decimal_precision int [default: 2]
  is_active boolean [default: true]
  sort_order int [default: 0]
  created_at timestamp [default: `now()`]
  updated_at timestamp [default: `now()`]
  
  indexes {
    (tenant_id, global_product_id) [unique]
    (tenant_id, is_active)
  }
}

Table price_groups {
  id int [pk, increment]
  tenant_id int [ref: > tenants.id, not null]
  group_name varchar(100) [not null]
  is_default boolean [default: false]
  tier_icon varchar
  tier_color varchar
  target_sales_usd decimal(18,3)
  next_tier_id int [ref: > price_groups.id]
  created_at timestamp [default: `now()`]
  updated_at timestamp [default: `now()`]
  
  indexes {
    (tenant_id, group_name) [unique]
  }
}

Table packages {
  id int [pk, increment]
  uuid varchar [unique, not null]
  tenant_id int [ref: > tenants.id, not null]
  product_id int [ref: > products.id, not null]
  global_package_id int [ref: > global_packages.id]
  package_link_number int [not null]
  display_name varchar [not null]
  description text
  capital_usd decimal(18,3) [not null, default: 0]
  is_counter boolean [default: false]
  unit_price_usd decimal(18,3)
  min_quantity int
  max_quantity int
  decimal_precision int
  is_active boolean [default: true]
  sort_order int [default: 0]
  created_at timestamp [default: `now()`]
  updated_at timestamp [default: `now()`]
  
  indexes {
    (tenant_id, product_id, package_link_number) [unique]
    (product_id, is_active)
    (product_id, is_counter)
  }
  
  Note: "CHECK (capital_usd >= 0)"
}

Table package_prices {
  id int [pk, increment]
  package_id int [ref: > packages.id, not null]
  price_group_id int [ref: > price_groups.id, not null]
  price_usd decimal(18,3) [not null, default: 0]
  created_at timestamp [default: `now()`]
  updated_at timestamp [default: `now()`]
  
  indexes {
    (package_id, price_group_id) [unique]
  }
  
  Note: "CHECK (price_usd >= 0)"
}

Table orders {
  id int [pk, increment]
  uuid varchar [unique, not null]
  order_number varchar [unique, not null]
  tenant_id int [ref: > tenants.id, not null]
  agent_id int [ref: > agents.id, not null]
  product_id int [ref: > products.id, not null]
  package_id int [ref: > packages.id, not null]
  package_link_number int [not null]
  cost_usd decimal(18,3) [not null]
  price_usd decimal(18,3) [not null]
  profit_usd decimal(18,3) [not null]
  agent_currency_id int [ref: > tenant_currencies.id, not null]
  price_local decimal(18,3) [not null]
  exchange_rate decimal(18,6) [not null]
  price_group_id int [ref: > price_groups.id]
  customer_price_local decimal(18,3)
  customer_profit_local decimal(18,3)
  quantity int
  unit_price_usd decimal(18,3)
  unit_cost_usd decimal(18,3)
  parent_order_id int [ref: > orders.id]
  child_order_id int [ref: > orders.id]
  routing_level int [default: 1]
  customer_data jsonb
  provider_response jsonb
  source varchar [default: 'web']
  api_token_id int [ref: > api_tokens.id]
  order_uuid varchar(36) [unique]
  status varchar [default: 'pending']
  error_message text
  duration_seconds int
  completed_at timestamp
  failed_at timestamp
  created_at timestamp [default: `now()`]
  updated_at timestamp [default: `now()`]
  
  indexes {
    (tenant_id, created_at)
    (agent_id, created_at)
    (status)
    (parent_order_id)
    (child_order_id)
    order_uuid
  }
  
  Note: "source: web, api, mobile"
}

Table providers {
  id int [pk, increment]
  uuid varchar [unique, not null]
  tenant_id int [ref: > tenants.id, not null]
  provider_type varchar [not null]
  display_name varchar [not null]
  base_url varchar
  is_active boolean [default: true]
  internal_username varchar
  internal_password_encrypted text
  znet_mobile varchar
  znet_password_encrypted text
  zdk_token_encrypted text
  stock_pool_id int
  created_at timestamp [default: `now()`]
  updated_at timestamp [default: `now()`]
  
  indexes {
    (tenant_id, display_name)
  }
}

Table stock_pools {
  id int [pk, increment]
  tenant_id int [ref: > tenants.id, not null]
  pool_name varchar [not null]
  product_id int [ref: > products.id]
  total_codes int [default: 0]
  available_codes int [default: 0]
  used_codes int [default: 0]
  created_at timestamp [default: `now()`]
}

Table stock_codes {
  id int [pk, increment]
  stock_pool_id int [ref: > stock_pools.id, not null]
  package_id int [ref: > packages.id, not null]
  code varchar [not null]
  status varchar [default: 'available']
  order_id int [ref: > orders.id]
  used_at timestamp
  created_at timestamp [default: `now()`]
  
  indexes {
    (stock_pool_id, status)
    (order_id)
  }
}

Table package_routing {
  id int [pk, increment]
  tenant_id int [ref: > tenants.id, not null]
  package_id int [ref: > packages.id, not null]
  provider_a_type varchar [default: 'manual']
  provider_a_id int [ref: > providers.id]
  provider_b_type varchar [default: 'closed']
  provider_b_id int [ref: > providers.id]
  created_at timestamp [default: `now()`]
  updated_at timestamp [default: `now()`]
  
  indexes {
    (tenant_id, package_id) [unique]
  }
}

Table product_providers {
  id int [pk, increment]
  product_id int [ref: > products.id, not null]
  provider_id int [ref: > providers.id, not null]
  provider_product_code varchar [not null]
  priority int [default: 1]
  is_active boolean [default: true]
  
  indexes {
    (product_id, priority)
    (product_id, provider_id) [unique]
  }
}

Table transactions {
  id int [pk, increment]
  uuid varchar [unique, not null]
  tenant_id int [ref: > tenants.id, not null]
  agent_id int [ref: > agents.id]
  type varchar [not null]
  amount_usd decimal(18,3) [not null]
  balance_before_usd decimal(18,3) [not null]
  balance_after_usd decimal(18,3) [not null]
  reference_type varchar
  reference_id int
  notes text
  created_by_type varchar
  created_by_id int
  created_at timestamp [default: `now()`]
  
  indexes {
    (tenant_id, created_at)
    (agent_id, created_at)
    (reference_type, reference_id)
  }
  
  Note: "type: order, deposit, withdrawal, refund, adjustment"
}

Table subscription_payments {
  id int [pk, increment]
  uuid varchar [unique, not null]
  tenant_id int [ref: > tenants.id, not null]
  amount_usd decimal(18,3) [not null]
  period_start timestamp [not null]
  period_end timestamp [not null]
  payment_proof_url varchar
  payment_method varchar
  notes text
  status varchar [default: 'pending']
  submitted_at timestamp
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
  hours_granted int [not null]
  granted_by int [ref: > super_admins.id, not null]
  start_time timestamp [not null]
  end_time timestamp [not null]
  reason text
  created_at timestamp [default: `now()`]
  
  indexes {
    (tenant_id, created_at)
  }
}

Table payment_methods {
  id int [pk, increment]
  tenant_id int [ref: > tenants.id, not null]
  method_type varchar [not null]
  method_name varchar [not null]
  details jsonb
  instructions text
  is_active boolean [default: true]
  sort_order int [default: 0]
  created_at timestamp [default: `now()`]
  updated_at timestamp [default: `now()`]
  
  indexes {
    (tenant_id, is_active)
  }
}

Table deposit_requests {
  id int [pk, increment]
  uuid varchar [unique, not null]
  tenant_id int [ref: > tenants.id, not null]
  agent_id int [ref: > agents.id, not null]
  payment_method_id int [ref: > payment_methods.id, not null]
  amount_local decimal(18,3) [not null]
  currency_code varchar [not null]
  exchange_rate decimal(18,6) [not null]
  amount_usd decimal(18,3) [not null]
  status varchar [default: 'pending']
  agent_notes text
  tenant_notes text
  receipt_url varchar
  submitted_at timestamp [default: `now()`]
  reviewed_at timestamp
  reviewed_by int [ref: > tenants.id]
  transaction_id int [ref: > transactions.id]
  created_at timestamp [default: `now()`]
  updated_at timestamp [default: `now()`]
  
  indexes {
    (tenant_id, status, created_at)
    (agent_id, created_at)
    (status)
  }
}

Table agent_tier_history {
  id int [pk, increment]
  agent_id int [ref: > agents.id, not null]
  old_price_group_id int [ref: > price_groups.id]
  new_price_group_id int [ref: > price_groups.id, not null]
  sales_amount_usd decimal(18,3)
  month_year varchar
  changed_at timestamp [default: `now()`]
  
  indexes {
    (agent_id, changed_at)
  }
}

Table api_tokens {
  id int [pk, increment]
  tenant_id int [ref: > tenants.id, not null]
  token varchar(64) [unique, not null]
  label varchar(100)
  allowed_ips text
  is_active boolean [default: true]
  daily_limit int
  daily_usage int [default: 0]
  last_reset_date date
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

Table api_logs {
  id int [pk, increment]
  api_token_id int [ref: > api_tokens.id, not null]
  tenant_id int [ref: > tenants.id, not null]
  endpoint varchar(255)
  method varchar(10)
  ip_address varchar(45)
  request_body text
  response_body text
  response_code int
  response_time_ms int
  status varchar(20)
  error_code varchar(10)
  created_at timestamp [default: `now()`]
  
  indexes {
    (api_token_id, created_at)
    (tenant_id, created_at)
    (status, created_at)
  }
}

Table announcements {
  id int [pk, increment]
  created_by_type varchar(20) [not null]
  super_admin_id int [ref: > super_admins.id]
  tenant_id int [ref: > tenants.id]
  title varchar(255) [not null]
  content text [not null]
  icon varchar(50)
  image_url varchar(500)
  type varchar(20) [default: 'info']
  priority int [default: 0]
  start_date timestamp
  end_date timestamp
  is_active boolean [default: true]
  is_pinned boolean [default: false]
  views_count int [default: 0]
  created_at timestamp [default: `now()`]
  updated_at timestamp [default: `now()`]
  
  indexes {
    (created_by_type, tenant_id, is_active)
    (is_active, priority, created_at)
    (start_date, end_date)
  }
  
  Note: "created_by_type: super_admin, tenant"
  Note: "type: info, warning, success, error, promotion"
}

Table announcement_views {
  id int [pk, increment]
  announcement_id int [ref: > announcements.id, not null]
  viewer_type varchar(20) [not null]
  tenant_id int [ref: > tenants.id]
  agent_id int [ref: > agents.id]
  viewed_at timestamp [default: `now()`]
  
  indexes {
    (announcement_id, viewer_type, tenant_id, agent_id) [unique]
    (announcement_id, viewed_at)
  }
  
  Note: "viewer_type: tenant, agent"
}

Table about_pages {
  id int [pk, increment]
  tenant_id int [ref: > tenants.id, not null, unique]
  title varchar(255) [default: 'من نحن']
  content text [not null]
  logo_url varchar(500)
  cover_image_url varchar(500)
  contact_email varchar(255)
  contact_phone varchar(50)
  social_links json
  is_published boolean [default: true]
  created_at timestamp [default: `now()`]
  updated_at timestamp [default: `now()`]
  
  indexes {
    tenant_id
  }
}
