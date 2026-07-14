"""محوّل Barakat/Apstore — مصادقة بـ api-token في الهيدر، استجابات JSON."""
from decimal import Decimal, InvalidOperation
from urllib.parse import quote

import requests

from .base import BalanceResult, BaseAdapter, ExecutionResult


_SUCCESS = {"success", "ok", "done", "complete", "completed", "accept"}
_FAILED = {"reject", "rejected", "failed", "fail", "error", "cancelled"}
_PENDING = {"wait", "pending", "processing", "inprogress", "queued"}


def _map_status(s: str) -> str:
    s = (s or "").lower()
    if s in _SUCCESS:
        return "success"
    if s in _FAILED:
        return "failed"
    if s in _PENDING:
        return "processing"
    return "processing"


class BarakatAdapter(BaseAdapter):
    """
    config المتوقّع: {base_url, api_token}
    place_order → GET {base}/client/api/newOrder/{package_id}/params?qty&phone&extra&order_uuid
    """

    code = "barakat"

    def _base(self, config: dict) -> str:
        return (config.get("base_url") or "").rstrip("/")

    def place_order(self, order, config: dict, provider=None, depth: int = 0) -> ExecutionResult:
        base = self._base(config)
        token = config.get("api_token")
        if not base or not token:
            return ExecutionResult(status="failed", note="إعداد Barakat ناقص (base_url/api_token)")

        pkg = quote(str(order.product.provider_package_id))
        params = {
            "qty": "1",
            "phone": order.customer_phone or order.player_id or "",
            "extra": order.player_id or "",
            "order_uuid": order.receipt_no,
        }
        try:
            resp = requests.get(
                f"{base}/client/api/newOrder/{pkg}/params", params=params,
                headers={"api-token": token}, timeout=(5, 30),
            )
            data = resp.json()
        except requests.RequestException as e:
            return ExecutionResult(status="failed", note=f"تعذّر الاتصال بـ Barakat: {e}")
        except ValueError:
            return ExecutionResult(status="failed", note="استجابة Barakat غير صالحة", raw=resp.text)

        return self.parse_place(data)

    def get_balance(self, config: dict, provider=None) -> BalanceResult:
        """GET {base}/client/api/profile بترويسة api-token → JSON فيه balance."""
        base = self._base(config)
        token = config.get("api_token")
        if not base or not token:
            return BalanceResult(ok=False, note="إعداد Barakat ناقص (base_url/api_token)")
        try:
            resp = requests.get(
                f"{base}/client/api/profile",
                headers={"api-token": token}, timeout=(5, 20),
            )
            data = resp.json()
        except requests.RequestException as e:
            return BalanceResult(ok=False, note=f"تعذّر الاتصال بـ Barakat: {e}")
        except ValueError:
            return BalanceResult(ok=False, note="استجابة Barakat غير صالحة", raw=resp.text)

        d = data.get("data", data) if isinstance(data, dict) else {}
        raw_balance = d.get("balance") if isinstance(d, dict) else None
        if raw_balance is None:
            return BalanceResult(
                ok=False, raw=str(data),
                note=str((data or {}).get("message") or "لم يُعِد المزوّد رصيداً"),
            )
        try:
            return BalanceResult(ok=True, balance=Decimal(str(raw_balance)), raw=str(data))
        except (InvalidOperation, ValueError):
            return BalanceResult(ok=False, note=f"رصيد غير مفهوم: {raw_balance}", raw=str(data))

    def parse_place(self, data: dict) -> ExecutionResult:
        """تحليل استجابة newOrder: {status:'OK', data:{order_id,status,price,note}} أو {status:'ERROR',message}."""
        top = str(data.get("status", "")).upper()
        if top == "OK" or "data" in data:
            d = data.get("data", data)
            mapped = _map_status(str(d.get("status", "pending")))
            cost = None
            try:
                if d.get("price") is not None:
                    cost = Decimal(str(d["price"]))
            except (InvalidOperation, ValueError):
                cost = None
            return ExecutionResult(
                status=mapped, pin=str(d.get("pin") or ""),
                external_ref=str(d.get("order_id") or ""),
                note=str(d.get("note") or ""), cost=cost, raw=str(data),
            )
        return ExecutionResult(
            status="failed",
            note=str(data.get("message") or "فشل الطلب لدى Barakat"), raw=str(data),
        )
