"""API التذاكر/الرسائل: وكيل↔صاحب المتجر · صاحب المتجر↔المنصّة."""
from django.db.models import Q
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Ticket, TicketMessage, User


def _target_for(user) -> str:
    """الوجهة الافتراضية حسب دور المُرسِل."""
    if user.role == User.Role.TENANT_ADMIN:
        return Ticket.Target.PLATFORM   # صاحب المتجر يراسل المنصّة
    return Ticket.Target.ADMIN          # الوكيل يراسل إدارة متجره


def visible_tickets(user):
    """التذاكر التي يراها المستخدم: ما أنشأه + وارد دوره."""
    if user.role == User.Role.PLATFORM_OWNER:
        return Ticket.objects.filter(target=Ticket.Target.PLATFORM)
    if user.role == User.Role.TENANT_ADMIN:
        return Ticket.objects.filter(
            Q(created_by=user)
            | Q(tenant=user.tenant, target=Ticket.Target.ADMIN)
        )
    return Ticket.objects.filter(created_by=user)


def _ticket_row(t, user):
    last = t.messages.last()
    unread = t.messages.exclude(sender=user).filter(read_by_other=False).count()
    return {
        "id": t.id,
        "subject": t.subject,
        "target": t.target,
        "target_label": t.get_target_display(),
        "status": t.status,
        "status_label": t.get_status_display(),
        "opener": t.created_by.name,
        "is_mine": t.created_by_id == user.id,
        "last_message": last.body[:80] if last else "",
        "last_at": (last.created_at if last else t.created_at).strftime("%Y-%m-%d %H:%M"),
        "unread": unread,
    }


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def tickets_view(request):
    user = request.user
    if request.method == "POST":
        subject = (request.data.get("subject") or "").strip()
        body = (request.data.get("body") or "").strip()
        if not subject or not body:
            return Response({"detail": "العنوان والرسالة مطلوبان"}, status=400)
        ticket = Ticket.objects.create(
            tenant=user.tenant, created_by=user,
            target=_target_for(user), subject=subject,
        )
        TicketMessage.objects.create(ticket=ticket, sender=user, body=body)
        return Response(_ticket_row(ticket, user), status=201)

    rows = [_ticket_row(t, user) for t in visible_tickets(user).select_related("created_by")]
    return Response({"count": len(rows), "results": rows})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def ticket_thread_view(request, ticket_id):
    user = request.user
    ticket = visible_tickets(user).filter(pk=ticket_id).first()
    if ticket is None:
        return Response({"detail": "التذكرة غير موجودة"}, status=404)
    # علّم رسائل الطرف الآخر كمقروءة
    ticket.messages.exclude(sender=user).filter(read_by_other=False).update(read_by_other=True)
    msgs = [{
        "id": m.id, "sender": m.sender.name, "is_me": m.sender_id == user.id,
        "body": m.body, "created_at": m.created_at.strftime("%Y-%m-%d %H:%M"),
    } for m in ticket.messages.select_related("sender")]
    return Response({
        "id": ticket.id, "subject": ticket.subject,
        "status": ticket.status, "status_label": ticket.get_status_display(),
        "target_label": ticket.get_target_display(), "messages": msgs,
    })


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def ticket_reply_view(request, ticket_id):
    user = request.user
    ticket = visible_tickets(user).filter(pk=ticket_id).first()
    if ticket is None:
        return Response({"detail": "التذكرة غير موجودة"}, status=404)
    body = (request.data.get("body") or "").strip()
    if not body:
        return Response({"detail": "الرسالة فارغة"}, status=400)
    m = TicketMessage.objects.create(ticket=ticket, sender=user, body=body)
    if ticket.status == Ticket.Status.CLOSED:
        ticket.status = Ticket.Status.OPEN
    ticket.save(update_fields=["status", "updated_at"])
    return Response({
        "id": m.id, "sender": m.sender.name, "is_me": True,
        "body": m.body, "created_at": m.created_at.strftime("%Y-%m-%d %H:%M"),
    }, status=201)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def ticket_close_view(request, ticket_id):
    user = request.user
    ticket = visible_tickets(user).filter(pk=ticket_id).first()
    if ticket is None:
        return Response({"detail": "التذكرة غير موجودة"}, status=404)
    ticket.status = Ticket.Status.CLOSED
    ticket.save(update_fields=["status", "updated_at"])
    return Response(_ticket_row(ticket, user))


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def unread_count_view(request):
    """عدّاد الرسائل غير المقروءة (للتحديث اللحظي بالـ polling)."""
    user = request.user
    total = TicketMessage.objects.filter(
        ticket__in=visible_tickets(user)
    ).exclude(sender=user).filter(read_by_other=False).count()
    return Response({"unread": total})
