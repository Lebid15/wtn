"""
إشارات الكتالوج: سعر المجموعة المرتبط بقاعدة يتبع التكلفة دائماً.

عُلّقت على حفظ الباقة لا على نقاط الاستدعاء، لأن التكلفة تتغيّر من مواضع
متفرّقة (تحرير الخلية · تحديث التكاليف من مزوّد · تحويل عملة الدفتر · بذور
الاستيراد) وستزيد. تعليقها هنا يجعل القاعدة تصحّ من أي طريق.
"""
from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import Product
from .services import apply_margin_rules


@receiver(post_save, sender=Product, dispatch_uid="catalog_apply_margin_rules")
def recompute_linked_prices(sender, instance, created, **kwargs):
    # الباقة الجديدة بلا أسعار مجموعات بعد — لا شيء يُعاد حسابه
    if created:
        return
    apply_margin_rules(instance)
