"""
الواجهة الداخلية بين الموقع وبرنامج البوت — لا يمسّها متصفّح ولا مستخدم.

الحماية سرّ مشترك في الترويسة `X-Internal-Api-Key`، تُقارن مقارنةً ثابتة
الزمن. **وإن لم يُضبط السرّ في البيئة فالباب مغلق تماماً** (503) — لا نترك
واجهةً مفتوحةً بحجّة أن أحداً لا يعرف مسارها.

الاتجاه دائماً: البوت يسأل، والموقع يجيب. فلا يحتاج البوت عنواناً عاماً ولا
منفذاً مفتوحاً، ويعمل من أي جهاز في العالم بالسرّ وحده.
"""
import hmac
import os
from datetime import timedelta

from django.db import transaction
from django.utils import timezone
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .models import OutboundMessage, WhatsAppAccount, WhatsAppAuthKey

# محاولات الرسالة الواحدة قبل إعلان فشلها
MAX_ATTEMPTS = 3
# رسالة بقيت «جارٍ الإرسال» أطول من هذا ⇒ البوت مات وهو يرسلها، تُعاد للطابور
STUCK_AFTER = timedelta(minutes=5)


def _authorized(request) -> bool:
    secret = os.environ.get("INTERNAL_API_KEY", "")
    if not secret:
        return False
    given = request.headers.get("X-Internal-Api-Key", "")
    return hmac.compare_digest(given, secret)


def internal(view):
    """يغلّف نقطة داخلية: بلا JWT، وبالسرّ المشترك وحده."""
    @api_view(["POST"])
    @authentication_classes([])
    @permission_classes([AllowAny])
    def wrapper(request, *args, **kwargs):
        if not os.environ.get("INTERNAL_API_KEY", ""):
            return Response({"detail": "الواجهة الداخلية غير مفعّلة"}, status=503)
        if not _authorized(request):
            return Response({"detail": "سرّ غير صحيح"}, status=403)
        return view(request, *args, **kwargs)
    wrapper.__name__ = view.__name__
    return wrapper


def _account(request):
    try:
        return WhatsAppAccount.objects.select_related("tenant").get(
            tenant_id=int(request.data.get("tenant"))
        )
    except (WhatsAppAccount.DoesNotExist, TypeError, ValueError):
        return None


def _requeue_stuck():
    """يُنقذ ما علق في «جارٍ الإرسال» بعد موت البوت — أو يُنهيه بعد ثلاث محاولات."""
    cutoff = timezone.now() - STUCK_AFTER
    stuck = OutboundMessage.objects.filter(
        status=OutboundMessage.Status.SENDING, created_at__lt=cutoff
    )
    for m in stuck.filter(attempts__gte=MAX_ATTEMPTS):
        m.status = OutboundMessage.Status.FAILED
        m.error = m.error or "توقّف الإرسال ولم ينجح بعد ثلاث محاولات"
        m.save(update_fields=["status", "error"])
    stuck.filter(attempts__lt=MAX_ATTEMPTS).update(status=OutboundMessage.Status.PENDING)


def _claim_next(account):
    """
    يحجز الرسالة التالية لهذا المتجر بتبديل حالة ذرّي — بلا أقفال ولا طوابير:
    مَن نجح تبديله هو من يملكها. آمن حتى لو عمل بوتان بالغلط.
    """
    row = (
        OutboundMessage.objects
        .filter(tenant=account.tenant, status=OutboundMessage.Status.PENDING)
        .order_by("id").first()
    )
    if row is None:
        return None
    won = OutboundMessage.objects.filter(
        pk=row.pk, status=OutboundMessage.Status.PENDING
    ).update(status=OutboundMessage.Status.SENDING, attempts=row.attempts + 1)
    if not won:
        return None
    return row


@internal
def poll_view(request):
    """
    نبضة البوت: يعلن أنه حيّ، فيأخذ حالة كل متجر والأمر المعلّق ورسالةً واحدة
    لكل متجر **أعلن أنه جاهز** (`ready`). ولا نحجز رسالةً لمن لم يعلن جهوزيته:
    وإلّا لتراكمت رسائل «جارٍ الإرسال» في ذاكرة البوت وعلقت لو مات فجأة.
    """
    _requeue_stuck()
    now = timezone.now()
    try:
        ready = {int(t) for t in (request.data.get("ready") or [])}
    except (TypeError, ValueError):
        ready = set()
    sessions = []
    for account in WhatsAppAccount.objects.select_related("tenant").all():
        account.last_seen = now
        account.save(update_fields=["last_seen"])
        job = None
        if account.tenant_id in ready and account.enabled:
            claimed = _claim_next(account)
            if claimed:
                job = {"id": claimed.id, "number": claimed.to_number, "text": claimed.text}
        sessions.append({
            "tenant": account.tenant_id,
            "name": account.tenant.name,
            "want": account.want,
            "status": account.status,
            "enabled": account.enabled,
            "has_auth": account.auth_keys.exists(),
            "throttle": {
                "min_delay": account.min_delay, "max_delay": account.max_delay,
                "batch_size": account.batch_size, "batch_pause": account.batch_pause,
            },
            "job": job,
        })
    return Response({"sessions": sessions, "server_time": now.isoformat()})


@internal
def session_view(request):
    """البوت يبلّغ حالة الجلسة: qr / connecting / connected / closed."""
    account = _account(request)
    if account is None:
        return Response({"detail": "متجر غير معروف"}, status=404)
    data = request.data
    status_ = data.get("status")
    if status_ in WhatsAppAccount.Status.values:
        account.status = status_
    if "qr" in data:
        account.qr = str(data.get("qr") or "")[:200_000]
    if "device_number" in data:
        account.device_number = str(data.get("device_number") or "")[:32]
    if "error" in data:
        account.error = str(data.get("error") or "")[:255]
    if data.get("ack_want"):
        account.want = WhatsAppAccount.Want.NONE
    if account.status == WhatsAppAccount.Status.CONNECTED:
        account.qr = ""  # الرمز مفتاح دخول — لا يبقى بعد أن أدّى غرضه
    account.last_seen = timezone.now()
    account.save()
    return Response({"ok": True})


@internal
def result_view(request):
    """نتيجة إرسال رسالة واحدة."""
    try:
        msg = OutboundMessage.objects.get(pk=int(request.data.get("id")))
    except (OutboundMessage.DoesNotExist, TypeError, ValueError):
        return Response({"detail": "رسالة غير معروفة"}, status=404)
    if request.data.get("ok"):
        msg.status = OutboundMessage.Status.SENT
        msg.sent_at = timezone.now()
        msg.error = ""
    else:
        error = str(request.data.get("error") or "فشل غير معروف")[:255]
        retry = bool(request.data.get("retry")) and msg.attempts < MAX_ATTEMPTS
        msg.status = OutboundMessage.Status.PENDING if retry else OutboundMessage.Status.FAILED
        msg.error = error
    msg.save(update_fields=["status", "sent_at", "error"])
    return Response({"ok": True})


@internal
def auth_view(request):
    """
    مخزن مفاتيح جلسة Baileys. القيم تصل **مشفّرةً من البوت** — الموقع يحفظها
    كما هي ولا يفهمها. فلو سُرّبت القاعدة بقيت الجلسات عديمة النفع بلا المفتاح
    الذي يعيش على جهاز البوت وحده.
    """
    account = _account(request)
    if account is None:
        return Response({"detail": "متجر غير معروف"}, status=404)
    op = request.data.get("op")

    if op == "read":
        keys = request.data.get("keys") or []
        rows = WhatsAppAuthKey.objects.filter(account=account, key__in=keys)
        return Response({"values": {r.key: r.value for r in rows}})

    if op == "write":
        items = request.data.get("items") or {}
        with transaction.atomic():
            for key, value in items.items():
                WhatsAppAuthKey.objects.update_or_create(
                    account=account, key=str(key)[:200], defaults={"value": value}
                )
        return Response({"written": len(items)})

    if op == "remove":
        keys = request.data.get("keys") or []
        n, _ = WhatsAppAuthKey.objects.filter(account=account, key__in=keys).delete()
        return Response({"removed": n})

    if op == "clear":
        n, _ = WhatsAppAuthKey.objects.filter(account=account).delete()
        account.status = WhatsAppAccount.Status.IDLE
        account.device_number = ""
        account.qr = ""
        account.want = WhatsAppAccount.Want.NONE
        account.save(update_fields=["status", "device_number", "qr", "want"])
        return Response({"removed": n})

    return Response({"detail": "عملية غير معروفة"}, status=400)
