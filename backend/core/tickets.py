"""API التذاكر/الرسائل: وكيل↔صاحب المتجر · صاحب المتجر↔المنصّة · صاحب المتجر→وكيل."""
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
    # الوكيل: ما فتحه هو، وما فُتح إليه باسمه
    return Ticket.objects.filter(Q(created_by=user) | Q(recipient=user))


def _ticket_row(t, user):
    last = t.messages.last()
    unread = t.messages.exclude(sender=user).filter(read_by_other=False).count()
    return {
        "id": t.id,
        "subject": t.subject,
        "target": t.target,
        "target_label": (
            t.recipient.name if t.target == Ticket.Target.DEALER and t.recipient
            else t.get_target_display()
        ),
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
        # صاحب المتجر وحده يوجّه رسالته إلى وكيلٍ بعينه؛ وبلا تحديدٍ تصعد
        # إلى المنصّة كما كانت. والوكيل لا يوجّه: رسالته إلى إدارته دائماً.
        recipient = None
        target = _target_for(user)
        raw_to = request.data.get("recipient")
        if raw_to not in (None, "", "platform"):
            if user.role != User.Role.TENANT_ADMIN:
                return Response({"detail": "لا تملك توجيه الرسائل"}, status=403)
            recipient = User.objects.filter(
                pk=raw_to, tenant=user.tenant,
                role__in=[User.Role.BAYI, User.Role.ANA_BAYI],
            ).first()
            if recipient is None:
                return Response({"detail": "الوكيل غير موجود في متجرك"}, status=400)
            target = Ticket.Target.DEALER

        ticket = Ticket.objects.create(
            tenant=user.tenant, created_by=user,
            target=target, recipient=recipient, subject=subject,
        )
        TicketMessage.objects.create(ticket=ticket, sender=user, body=body)
        return Response(_ticket_row(ticket, user), status=201)

    rows = [_ticket_row(t, user)
            for t in visible_tickets(user).select_related("created_by", "recipient")]
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
        "target_label": (
            ticket.recipient.name
            if ticket.target == Ticket.Target.DEALER and ticket.recipient
            else ticket.get_target_display()
        ),
        "messages": msgs,
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
    return Response({"unread": unread_messages(request.user).count()})


def unread_messages(user):
    """رسائل الآخرين التي لم يقرأها بعد."""
    return TicketMessage.objects.filter(
        ticket__in=visible_tickets(user)
    ).exclude(sender=user).filter(read_by_other=False)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def notifications_view(request):
    """
    ما يعرضه جرس الهيدر: رسائلُ لم تُقرأ وبطاقاتٌ لم تُفتح، في نداءٍ واحد.

    ولماذا في واحد: الجرس يُنادى كل ربع دقيقة، فنداءان ضِعفُ الحِمل بلا سبب.

    ولماذا البطاقات فيه أصلاً: كانت تظهر صامتةً في الصفحة الرئيسية، فمن لا
    يمرّ بها لا يعرف أن صاحب متجره كتب شيئاً — قناةٌ تُكتب ولا تصل.
    """
    from .cards import unseen_cards

    user = request.user
    items = []

    for m in (unread_messages(user)
              .select_related("ticket", "sender").order_by("-created_at")[:10]):
        items.append({
            "kind": "message",
            "id": m.id,
            "ticket": m.ticket_id,
            "title": m.ticket.subject,
            "body": m.body[:90],
            "who": m.sender.name,
            "at": m.created_at.strftime("%Y-%m-%d %H:%M"),
        })

    for c in unseen_cards(user).order_by("-created_at")[:10]:
        items.append({
            "kind": "card",
            "id": c.id,
            "title": c.title,
            "body": (c.body or "")[:90],
            "who": "",
            "at": c.created_at.strftime("%Y-%m-%d %H:%M"),
        })

    items.sort(key=lambda x: x["at"], reverse=True)
    messages = sum(1 for i in items if i["kind"] == "message")
    cards = sum(1 for i in items if i["kind"] == "card")
    return Response({
        "total": messages + cards,
        "messages": messages,
        "cards": cards,
        "items": items[:12],
    })
