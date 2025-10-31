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
  quantity int
  unit_price_usd decimal(18,3)
  unit_cost_usd decimal(18,3)
  parent_order_id int [ref: > orders.id]
  child_order_id int [ref: > orders.id]
  routing_level int [default: 1]
  customer_data jsonb
  provider_response jsonb
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
  }
}

Table providers {
  id int [pk, increment]
  uuid varchar [unique, not null]
  provider_name varchar [not null]
  description text
  api_endpoint varchar
  api_key_encrypted text
  api_secret_encrypted text
  webhook_url varchar
  is_active boolean [default: true]
  config_json jsonb
  created_at timestamp [default: `now()`]
  updated_at timestamp [default: `now()`]
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
