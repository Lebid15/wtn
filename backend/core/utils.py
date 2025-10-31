"""
Core utilities and helper functions.
"""

import re
from decimal import Decimal
from typing import Optional


def format_decimal(value: Decimal, min_decimals: int = 2) -> str:
    """
    Format decimal according to WTN policy:
    - If third decimal place = 0 → show 2 decimals only
    - Always keep minimum 2 decimals
    
    Examples:
        DB: 25.225  →  Display: 25.225
        DB: 25.000  →  Display: 25.00
        DB: 25.100  →  Display: 25.10
        DB: 0.005   →  Display: 0.005
        DB: 100.500 →  Display: 100.50
    """
    if value is None:
        return "0.00"
    
    # Convert to Decimal if string/float
    decimal_value = Decimal(str(value))
    
    # Check if third decimal is zero
    third_decimal = (decimal_value * 1000) % 10
    
    if third_decimal == 0:
        # Format with 2 decimals
        formatted = f"{decimal_value:.2f}"
    else:
        # Format with 3 decimals
        formatted = f"{decimal_value:.3f}"
    
    # Remove trailing zeros but keep minimum decimals
    if '.' in formatted:
        # Split integer and decimal parts
        parts = formatted.split('.')
        integer_part = parts[0]
        decimal_part = parts[1].rstrip('0')
        
        # Ensure minimum decimals
        if len(decimal_part) < min_decimals:
            decimal_part = decimal_part.ljust(min_decimals, '0')
        
        # If decimal part is empty after trimming, keep minimum
        if not decimal_part:
            decimal_part = '0' * min_decimals
        
        return f"{integer_part}.{decimal_part}"
    
    return formatted


def validate_tenant_code(code: str) -> bool:
    """Validate tenant code format: ^[A-Z0-9]{3,12}$"""
    pattern = r'^[A-Z0-9]{3,12}$'
    return bool(re.match(pattern, code))


def calculate_available_balance(balance_usd: Decimal, overdraft_limit_usd: Decimal) -> Decimal:
    """
    Calculate available balance considering overdraft limit.
    
    Returns: balance_usd + overdraft_limit_usd
    """
    return balance_usd + overdraft_limit_usd


def can_create_order(balance_usd: Decimal, overdraft_limit_usd: Decimal, order_price_usd: Decimal) -> bool:
    """
    Check if agent can create order with overdraft consideration.
    
    Rule: (balance_usd - order_price) >= -(overdraft_limit_usd)
    """
    minimum_allowed = -overdraft_limit_usd
    balance_after = balance_usd - order_price_usd
    return balance_after >= minimum_allowed


def convert_usd_to_local(amount_usd: Decimal, rate_to_usd: Decimal) -> Decimal:
    """Convert USD amount to local currency."""
    return amount_usd * rate_to_usd


def convert_local_to_usd(amount_local: Decimal, rate_to_usd: Decimal) -> Decimal:
    """Convert local currency amount to USD."""
    return amount_local / rate_to_usd

