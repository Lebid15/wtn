"""محوّل ZNET — مصادقة بـ query params، استجابات pipe-separated (النمط التركي)."""
import random
import time
from decimal import Decimal, InvalidOperation

import requests

from .base import BaseAdapter, ExecutionResult


class ZnetAdapter(BaseAdapter):
    """
    config المتوقّع: {base_url, kod, sifre, orders_path?}
    place_order → GET {base}/servis/pin_ekle.php?kod&sifre&oyun&referans&musteri_tel&oyuncu_bilgi
    استجابة النجاح: "OK|cost|balance" · الفشل: "<code>|رسالة"
    """

    code = "znet"

    def _base(self, config: dict) -> str:
        return (config.get("base_url") or "").rstrip("/")

    @staticmethod
    def _gen_referans() -> str:
        return str(int(time.time() * 1000) + random.randint(100, 999))

    def place_order(self, order, config: dict, provider=None, depth: int = 0) -> ExecutionResult:
        base = self._base(config)
        if not base or not config.get("kod") or not config.get("sifre"):
            return ExecutionResult(status="failed", note="إعداد ZNET ناقص (base_url/kod/sifre)")

        referans = self._gen_referans()
        path = config.get("orders_path") or "servis/pin_ekle.php"
        params = {
            "kod": config["kod"], "sifre": config["sifre"],
            "oyun": order.product.provider_package_id,
            "referans": referans,
            "musteri_tel": order.customer_phone or order.player_id,
            "oyuncu_bilgi": order.player_id,
        }
        try:
            resp = requests.get(
                f"{base}/{path}", params=params,
                headers={"Accept": "application/json"}, timeout=(5, 30),
            )
        except requests.RequestException as e:
            return ExecutionResult(status="failed", note=f"تعذّر الاتصال بـ ZNET: {e}")

        return self.parse_place(resp.text, referans, resp.status_code)

    def parse_place(self, text: str, referans: str, http_status: int = 200) -> ExecutionResult:
        """تحليل استجابة pin_ekle: OK|cost|balance أو code|message."""
        if http_status >= 400:
            return ExecutionResult(status="failed", note=f"HTTP {http_status}", raw=text)
        parts = self.split_pipe(text)
        if parts and parts[0].upper() == "OK":
            cost = None
            if len(parts) > 1:
                try:
                    cost = Decimal(parts[1])
                except (InvalidOperation, ValueError):
                    cost = None
            # ZNET يؤكّد الإرسال؛ الـ PIN يُجلب لاحقاً عبر fetch_status → نعدّه قيد المعالجة
            return ExecutionResult(
                status="processing", external_ref=referans, cost=cost,
                note=text.strip(), raw=text,
            )
        msg = parts[1] if len(parts) > 1 else (text or "فشل غير معروف")
        return ExecutionResult(status="failed", note=msg, external_ref=referans, raw=text)

    @staticmethod
    def parse_status(text: str) -> ExecutionResult:
        """تحليل pin_kontrol: OK|<1|2|3>|PIN|رسالة."""
        parts = [p.strip() for p in (text or "").split("|")]
        if not parts or parts[0].upper() != "OK":
            return ExecutionResult(status="failed", note=text or "", raw=text)
        code = parts[1] if len(parts) > 1 else ""
        pin = parts[2] if len(parts) > 2 else ""
        msg = parts[3] if len(parts) > 3 else ""
        mapping = {"1": "processing", "2": "success", "3": "failed"}
        return ExecutionResult(status=mapping.get(code, "processing"), pin=pin, note=msg, raw=text)
